import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isPdfFile,
  listFolder,
  listFolderContinue,
} from "@/lib/dropbox/client";
import { getDropboxAccessToken } from "@/lib/dropbox/auth";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const syncSecret = process.env.SYNC_SECRET;
  const headerSecret = request.headers.get("x-sync-secret");

  if (syncSecret && headerSecret !== syncSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const orgId = body?.orgId as string | undefined;

  if (!orgId) {
    return NextResponse.json(
      { error: "Missing orgId in request body." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { accessToken } = await getDropboxAccessToken(orgId);

  const { data: folders, error: foldersError } = await supabase
    .from("dropbox_watched_folders")
    .select("*")
    .eq("org_id", orgId);

  if (foldersError) {
    return NextResponse.json(
      { error: foldersError.message },
      { status: 500 }
    );
  }

  let ingested = 0;

  for (const folder of folders ?? []) {
    let response = folder.cursor
      ? await listFolderContinue(accessToken, folder.cursor)
      : await listFolder(accessToken, folder.path, true);

    let hasMore = response.has_more;
    let cursor = response.cursor;

    while (true) {
      const pdfEntries = response.entries.filter(isPdfFile);

      if (pdfEntries.length > 0) {
        const payload = pdfEntries.map((entry) => ({
          org_id: orgId,
          dropbox_file_id: entry.id ?? "",
          path: entry.path_lower ?? entry.path_display ?? "",
          name: entry.name,
          rev: entry.rev ?? null,
          content_hash: entry.content_hash ?? null,
          size: entry.size ?? null,
          modified_at: entry.server_modified ?? entry.client_modified ?? null,
          updated_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from("documents")
          .upsert(payload, { onConflict: "org_id,dropbox_file_id" });

        if (upsertError) {
          return NextResponse.json(
            { error: upsertError.message },
            { status: 500 }
          );
        }

        ingested += payload.length;
      }

      if (!hasMore) {
        break;
      }

      response = await listFolderContinue(accessToken, cursor);
      hasMore = response.has_more;
      cursor = response.cursor;
    }

    await supabase
      .from("dropbox_watched_folders")
      .update({ cursor, updated_at: new Date().toISOString() })
      .eq("id", folder.id);
  }

  await logAudit({
    orgId,
    action: "dropbox.sync",
    entityType: "dropbox",
    metadata: { ingested, folderCount: folders?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, ingested });
}
