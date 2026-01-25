import { NextResponse } from "next/server";
import { getDropboxAccessToken } from "@/lib/dropbox/auth";
import { isFolder, listFolder } from "@/lib/dropbox/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  const path = searchParams.get("path") ?? "";

  if (!orgId) {
    return NextResponse.json(
      { error: "Missing orgId query parameter." },
      { status: 400 }
    );
  }

  const { accessToken } = await getDropboxAccessToken(orgId);
  const response = await listFolder(accessToken, path, false);

  const folders = response.entries
    .filter(isFolder)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      path: entry.path_lower ?? entry.path_display ?? "",
    }));

  return NextResponse.json({ folders });
}
