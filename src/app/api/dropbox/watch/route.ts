import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const orgId = body?.orgId as string | undefined;
  const path = body?.path as string | undefined;
  const dropboxId = body?.dropboxId as string | undefined;

  if (!orgId || !path) {
    return NextResponse.json(
      { error: "Missing orgId or path." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("dropbox_watched_folders").insert({
    org_id: orgId,
    path,
    dropbox_id: dropboxId ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    orgId,
    action: "dropbox.watch_added",
    entityType: "dropbox_folder",
    metadata: { path },
  });

  return NextResponse.json({ ok: true });
}
