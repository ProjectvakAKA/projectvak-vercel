import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForToken } from "@/lib/dropbox/auth";
import { verifyState } from "@/lib/security/state";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state from Dropbox callback." },
      { status: 400 }
    );
  }

  const payload = verifyState(state) as { orgId?: string; redirectUri?: string };
  const orgId = payload.orgId;
  const redirectUri = payload.redirectUri;

  if (!orgId || !redirectUri) {
    return NextResponse.json(
      { error: "Invalid OAuth state payload." },
      { status: 400 }
    );
  }

  const token = await exchangeCodeForToken(code, redirectUri);
  const supabase = createSupabaseAdminClient();

  const expiresAt = new Date(Date.now() + token.expires_in * 1000);

  await supabase.from("dropbox_connections").delete().eq("org_id", orgId);
  const { error: insertError } = await supabase
    .from("dropbox_connections")
    .insert({
      org_id: orgId,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      expires_at: expiresAt.toISOString(),
      account_id: token.account_id ?? null,
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  await logAudit({
    orgId,
    action: "dropbox.connected",
    entityType: "dropbox_connection",
    entityId: token.account_id ?? undefined,
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const redirectTarget = new URL("/", appUrl);
  redirectTarget.searchParams.set("dropbox", "connected");

  return NextResponse.redirect(redirectTarget.toString());
}
