import { NextRequest, NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';

type DropboxCreds = { clientId: string; clientSecret: string; refreshToken: string };

/**
 * Fetch wrapper voor Dropbox SDK op Vercel/Node 18+.
 * De SDK roept res.buffer() aan bij download, maar native fetch heeft alleen .arrayBuffer().
 * Deze wrapper voegt .buffer() toe zodat de SDK niet crasht.
 */
function dropboxFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(url, init).then((res) => {
    if (!res.buffer && typeof res.arrayBuffer === 'function') {
      (res as Response & { buffer?: () => Promise<Buffer> }).buffer = function () {
        return res.arrayBuffer().then((ab) => Buffer.from(ab));
      };
    }
    return res;
  });
}

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
    source: source ? new Dropbox({ ...source, fetch: dropboxFetch }) : undefined,
    target: target ? new Dropbox({ ...target, fetch: dropboxFetch }) : undefined,
  };
}

async function toBuffer(data: Buffer | Blob | Uint8Array | ArrayBuffer): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (data instanceof Uint8Array) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (typeof (data as Blob).arrayBuffer === 'function') return Buffer.from(await (data as Blob).arrayBuffer());
  return Buffer.from(data as ArrayBuffer);
}

async function tryDownload(dbx: Dropbox, path: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const response = await dbx.filesDownload({ path });
  const result = response.result as { fileBinary?: Buffer | Uint8Array; fileBlob?: Blob; name?: string };
  const data = result.fileBinary ?? result.fileBlob;
  if (!data) return null;
  const buffer = await toBuffer(data as Buffer | Blob | Uint8Array | ArrayBuffer);
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

  /** Bij path/not_found: probeer varianten (pipeline gebruikt soms _ waar Dropbox - heeft, bv. Maria_Theresiastraat vs Maria-Theresiastraat). */
  function pathVariants(p: string): string[] {
    const out = [p];
    const allUnderscoreToHyphen = p.replace(/([^/]+)/g, (seg) =>
      seg.includes('_') && !seg.startsWith('.') ? seg.replace(/_/g, '-') : seg
    );
    if (allUnderscoreToHyphen !== p) out.push(allUnderscoreToHyphen);
    const onlyStreetNameHyphen = p.replace(/([^/]+)/g, (seg) =>
      seg.includes('_') && /[a-zA-Z]_[a-zA-Z]/.test(seg) ? seg.replace(/([a-zA-Z])_([a-zA-Z])/g, '$1-$2') : seg
    );
    if (onlyStreetNameHyphen !== p && !out.includes(onlyStreetNameHyphen)) out.push(onlyStreetNameHyphen);
    const allHyphenToUnderscore = p.replace(/([^/]+)/g, (seg) =>
      seg.includes('-') && !seg.startsWith('.') ? seg.replace(/-/g, '_') : seg
    );
    if (allHyphenToUnderscore !== p && !out.includes(allHyphenToUnderscore)) out.push(allHyphenToUnderscore);
    return out;
  }

  const pathsToTry = pathVariants(path);

  const { source } = getDropboxClients();
  if (!source) {
    return NextResponse.json(
      { error: 'Dropbox niet geconfigureerd. Zet APP_KEY_SOURCE_FULL, APP_SECRET_SOURCE_FULL en REFRESH_TOKEN_SOURCE_FULL in Vercel (daar staan de documenten).' },
      { status: 503 }
    );
  }

  const clients: { name: string; dbx: Dropbox }[] = [{ name: 'SOURCE', dbx: source }];

  let lastError: unknown = null;
  let lastStatus = 500;
  let lastPath = path;

  for (const tryPath of pathsToTry) {
    for (const { name, dbx } of clients) {
      try {
        const out = await tryDownload(dbx, tryPath);
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
        lastPath = tryPath;
        const e = err as { status?: number; error?: { error_summary?: string } };
        lastStatus = e?.status ?? 500;
      }
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
      'PDF niet gevonden in Dropbox na het proberen van pad-varianten (incl. underscore/hyphen). Controleer of SOURCE-credentials op Vercel dezelfde Dropbox-account gebruiken als je pipeline.';
  } else if (status === 401 || status === 403) {
    message = 'Geen toegang tot Dropbox. Controleer SOURCE- en TARGET-credentials in Vercel.';
  } else if (summary) {
    message = `Kon PDF niet ophalen. (${summary})`;
  }

  console.error('Document download error (all attempts failed):', { pathParam, pathsTried: pathsToTry, lastPath, status, summary, lastError });
  return NextResponse.json(
    { error: message, path: path, status, error_summary: summary || undefined },
    { status: status >= 400 ? status : 500 }
  );
}
