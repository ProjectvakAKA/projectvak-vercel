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

  // Normaliseer pad: leading slash, geen dubbele slashes (Dropbox vereist /folder/file.pdf)
  let path = pathParam.trim().replace(/\/+/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;

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

  // Eerst TARGET proberen (waar georganiseerde bestanden kunnen staan), dan SOURCE (dbx_organize)
  const clients: { name: string; dbx: Dropbox }[] = [];
  if (target) clients.push({ name: 'TARGET', dbx: target });
  if (source) clients.push({ name: 'SOURCE', dbx: source });

  let lastError: unknown = null;
  let lastStatus = 500;

  console.info('Document API: requesting path', path, 'clients:', clients.map((c) => c.name));
  for (const { name, dbx } of clients) {
    try {
      console.info('Document API: trying', name);
      const out = await tryDownload(dbx, path);
      if (out) {
        console.info('Document API: success via', name);
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
      console.error('Document API: failed via', name, { path, status: e?.status, error_summary: e?.error?.error_summary });
    }
  }

  const e = lastError as { status?: number; statusCode?: number; error?: { error_summary?: string }; error_summary?: string; body?: { error?: { error_summary?: string } } };
  const status = e?.status ?? e?.statusCode ?? lastStatus;
  const summary = String(
    e?.error?.error_summary ?? e?.error_summary ?? e?.body?.error?.error_summary ?? ''
  );
  const isPathNotFound =
    status === 404 ||
    status === 409 ||
    /path\/not_found|not_found/i.test(summary);
  let message = 'Kon PDF niet ophalen.';
  if (isPathNotFound) {
    message =
      'PDF niet gevonden in Dropbox. Zet op Vercel dezelfde Dropbox-account als je pipeline (APP_KEY_SOURCE_FULL + REFRESH_TOKEN_SOURCE_FULL, en eventueel TARGET, van de account waar de bestanden staan).';
  } else if (status === 401 || status === 403) {
    message = 'Geen toegang tot Dropbox. Controleer SOURCE- en TARGET-credentials in Vercel.';
  } else if (summary) {
    message = `Kon PDF niet ophalen. (${summary})`;
  }

  console.error('Document download error (all attempts failed):', { pathParam, path, status, summary, lastError });
  return NextResponse.json(
    { error: message, path: path, status, error_summary: summary || undefined },
    { status: status >= 400 ? status : 500 }
  );
}
