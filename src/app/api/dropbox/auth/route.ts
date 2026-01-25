import { NextResponse } from "next/server";
import { buildDropboxAuthorizeUrl } from "@/lib/dropbox/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json(
      { error: "Missing orgId query parameter." },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const redirectUri = `${appUrl}/api/dropbox/callback`;
  const authorizeUrl = buildDropboxAuthorizeUrl(orgId, redirectUri);

  return NextResponse.redirect(authorizeUrl);
}
