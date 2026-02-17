import { NextRequest, NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';

type DropboxCreds = { clientId: string; clientSecret: string; refreshToken: string };

function getDropboxClients(): { source?: Dropbox; target?: Dropbox } {
  const source: DropboxCreds | null =
    process.env.APP_KEY_SOURCE_FULL && process.env.APP_SECRET_SOURCE_FULL && process.env.REFRESH_TOKEN_SOURCE_FULL
      ? {
          clientId: process.env.APP_KEY_SOURCE_FULL,
          clientSecret: process.env.APP_SECRET_SOURCE_FULL,
          refreshToken: process.env.REFRESH_TOKEN_SOURCE_FULL,
        }
      : null;
  const target: DropboxCreds | null =
    process.env.APP_KEY_TARGET && process.env.APP_SECRET_TARGET && process.env.REFRESH_TOKEN_TARGET
      ? {
          clientId: process.env.APP_KEY_TARGET,
          clientSecret: process.env.APP_SECRET_TARGET,
          refreshToken: process.env.REFRESH_TOKEN_TARGET,
        }
      : null;
  return {
    source: source ? new Dropbox({ ...source, fetch }) : undefined,
    target: target ? new Dropbox({ ...target, fetch }) : undefined,
  };
}

async function tryDownload(dbx: Dropbox, path: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const response = await dbx.filesDownload({ path });
  const result = response.result as { fileBinary?: Buffer; fileBlob?: Blob; name?: string };
  const data = result.fileBinary ?? result.fileBlob;
  if (!data) return null;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(await (data as Blob).arrayBuffer());
  const filename = result.name ?? 'document.pdf';
  return { buffer, filename };
}

/**
 * GET /api/document?path=... — Download PDF from Dropbox.
 * Pad moet met / beginnen (bijv. /Georganiseerd/.../file.pdf). Probeert SOURCE, daarna TARGET.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pathParam = searchParams.get('path');

  if (!pathParam || !pathParam.trim()) {
    return NextResponse.json({ error: 'Query parameter path is verplicht.' }, { status: 400 });
  }

  // Dropbox API vereist pad met leading slash: /folder/file.pdf
  const path = pathParam.startsWith('/') ? pathParam : `/${pathParam}`;

  if (!path.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Alleen PDF-bestanden worden ondersteund.' }, { status: 400 });
  }

  const { source, target } = getDropboxClients();
  if (!source && !target) {
    return NextResponse.json(
      { error: 'Dropbox niet geconfigureerd. Zet APP_KEY_SOURCE_FULL + REFRESH_TOKEN_SOURCE_FULL of TARGET-varianten in Vercel.' },
      { status: 503 }
    );
  }

  const clients = [source, target].filter(Boolean) as Dropbox[];
  let lastError: unknown = null;
  let lastStatus = 500;

  for (const dbx of clients) {
    try {
      const out = await tryDownload(dbx, path);
      if (out) {
        return new NextResponse(out.buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${encodeURIComponent(out.filename)}"`,
          },
        });
      }
    } catch (err: unknown) {
      lastError = err;
      const e = err as { status?: number; error?: { '.tag'?: string; path?: { '.tag'?: string }; error_summary?: string } };
      lastStatus = e?.status ?? 500;
      console.error('Document download attempt failed:', { path, status: e?.status, error: e?.error, err });
    }
  }

  const e = lastError as { status?: number; error?: { error_summary?: string } };
  const status = e?.status ?? lastStatus;
  const summary = String(e?.error?.error_summary ?? '');
  let message = 'Kon PDF niet ophalen.';
  if (status === 404 || /not_found/.test(summary)) {
    message = 'PDF niet gevonden in Dropbox.';
  } else if (status === 401 || status === 403) {
    message = 'Geen toegang tot Dropbox. Controleer SOURCE- en TARGET-credentials in Vercel.';
  }

  console.error('Document download error (all attempts failed):', { pathParam, lastStatus, lastError });
  return NextResponse.json({ error: message }, { status: status >= 400 ? status : 500 });
}
