import { NextRequest, NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';

/** Georganiseerde PDFs staan in SOURCE (dbx_organize). Fallback op TARGET als SOURCE niet gezet. */
function getDropboxClientForDocument(): Dropbox {
  const APP_KEY_SOURCE = process.env.APP_KEY_SOURCE_FULL ?? process.env.APP_KEY_TARGET;
  const APP_SECRET_SOURCE = process.env.APP_SECRET_SOURCE_FULL ?? process.env.APP_SECRET_TARGET;
  const REFRESH_SOURCE = process.env.REFRESH_TOKEN_SOURCE_FULL ?? process.env.REFRESH_TOKEN_TARGET;

  if (!APP_KEY_SOURCE || !APP_SECRET_SOURCE || !REFRESH_SOURCE) {
    throw new Error('Dropbox credentials ontbreken (zet APP_KEY_SOURCE_FULL + REFRESH_TOKEN_SOURCE_FULL, of TARGET-varianten).');
  }

  return new Dropbox({
    clientId: APP_KEY_SOURCE,
    clientSecret: APP_SECRET_SOURCE,
    refreshToken: REFRESH_SOURCE,
    fetch: fetch,
  });
}

/**
 * GET /api/document?path=... — Download PDF from Dropbox by path (voor zoekresultaat-PDF-viewer).
 * path moet URL-encoded zijn (bijv. /Georganiseerd/Contracten/.../file.pdf).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pathParam = searchParams.get('path');

  if (!pathParam || !pathParam.trim()) {
    return NextResponse.json(
      { error: 'Query parameter path is verplicht.' },
      { status: 400 }
    );
  }

  const path = pathParam.startsWith('/') ? pathParam : `/${pathParam}`;

  if (!path.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json(
      { error: 'Alleen PDF-bestanden worden ondersteund.' },
      { status: 400 }
    );
  }

  try {
    const dbx = getDropboxClientForDocument();
    const response = await dbx.filesDownload({ path });
    const result = response.result as { fileBinary?: Buffer; fileBlob?: Blob; name?: string };
    const data = result.fileBinary ?? result.fileBlob;
    if (!data) {
      return NextResponse.json({ error: 'Geen bestandsdata ontvangen van Dropbox.' }, { status: 502 });
    }
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(await (data as Blob).arrayBuffer());
    const filename = result.name ?? 'document.pdf';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err: unknown) {
    const e = err as {
      error?: { status?: number; error?: { '.tag'?: string }; error_summary?: string };
      status?: number;
    };
    const status = e?.error?.status ?? e?.status ?? 500;
    const tag = e?.error?.error?.['.tag'];
    const summary = e?.error?.error_summary ?? '';
    console.error('Document download error:', { path, status, tag, summary, err });

    let message = 'Kon PDF niet ophalen.';
    if (status === 404 || tag === 'path' || /not_found|path/.test(summary)) {
      message = 'PDF niet gevonden in Dropbox. Controleer het pad.';
    } else if (status === 401 || status === 403) {
      message = 'Geen toegang tot Dropbox. Controleer APP_KEY_SOURCE_FULL en REFRESH_TOKEN_SOURCE_FULL in Vercel.';
    }

    return NextResponse.json({ error: message }, { status: status >= 400 ? status : 500 });
  }
}
