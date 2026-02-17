import { NextRequest, NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';

async function getDropboxClient() {
  const APP_KEY_TARGET = process.env.APP_KEY_TARGET;
  const APP_SECRET_TARGET = process.env.APP_SECRET_TARGET;
  const REFRESH_TOKEN_TARGET = process.env.REFRESH_TOKEN_TARGET;

  if (!APP_KEY_TARGET || !APP_SECRET_TARGET || !REFRESH_TOKEN_TARGET) {
    throw new Error('Dropbox TARGET credentials not configured');
  }

  return new Dropbox({
    clientId: APP_KEY_TARGET,
    clientSecret: APP_SECRET_TARGET,
    refreshToken: REFRESH_TOKEN_TARGET,
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
    const dbx = await getDropboxClient();
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
    const e = err as { error?: { error?: { '.tag'?: string }; status?: number } };
    const status = e?.error?.status ?? 500;
    const message = status === 404 ? 'PDF niet gevonden in Dropbox.' : 'Kon PDF niet ophalen.';
    console.error('Document download error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}
