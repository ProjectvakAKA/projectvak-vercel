import { NextResponse } from "next/server";
import { pushEpcToWhise } from "@/lib/whise";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const pushSecret = process.env.SYNC_SECRET;
  const headerSecret = request.headers.get("x-sync-secret");

  if (pushSecret && headerSecret !== pushSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const orgId = body?.orgId as string | undefined;
  const documentId = body?.documentId as string | undefined;
  const whisePropertyId = body?.whisePropertyId as string | undefined;

  if (!orgId || !documentId || !whisePropertyId) {
    return NextResponse.json(
      { error: "Missing orgId, documentId, or whisePropertyId." },
      { status: 400 }
    );
  }

  const result = await pushEpcToWhise({
    orgId,
    documentId,
    whisePropertyId,
  });

  await logAudit({
    orgId,
    action: "whise.push",
    entityType: "document",
    entityId: documentId,
    metadata: { mode: result.mode },
  });

  return NextResponse.json({ ok: true, mode: result.mode });
}
