import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDropboxAccessToken } from "@/lib/dropbox/auth";
import { downloadFile } from "@/lib/dropbox/client";
import { extractPdfText } from "@/lib/pdf/extract";
import { extractEpcFields } from "@/lib/ai/epc";
import { sha256 } from "@/lib/hash";
import { validateEpcExtraction } from "@/lib/validation/epc";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const MIN_TEXT_LENGTH = 200;

export async function POST(request: Request) {
  const extractSecret = process.env.SYNC_SECRET;
  const headerSecret = request.headers.get("x-sync-secret");

  if (extractSecret && headerSecret !== extractSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const orgId = body?.orgId as string | undefined;
  const documentId = body?.documentId as string | undefined;

  if (!orgId || !documentId) {
    return NextResponse.json(
      { error: "Missing orgId or documentId." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("org_id", orgId)
    .single();

  if (documentError || !document) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 }
    );
  }

  const { accessToken } = await getDropboxAccessToken(orgId);
  const buffer = await downloadFile(accessToken, document.path as string);

  const { text } = await extractPdfText(buffer);
  const trimmed = text.trim();

  if (trimmed.length < MIN_TEXT_LENGTH) {
    await supabase
      .from("documents")
      .update({ status: "needs_ocr", updated_at: new Date().toISOString() })
      .eq("id", documentId);

    await logAudit({
      orgId,
      action: "epc.needs_ocr",
      entityType: "document",
      entityId: documentId,
    });

    return NextResponse.json({ ok: false, status: "needs_ocr" });
  }

  const extraction = await extractEpcFields(trimmed);
  const textHash = sha256(trimmed);
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const { error: extractionError } = await supabase
    .from("extractions")
    .insert({
      org_id: orgId,
      document_id: documentId,
      model,
      raw_json: extraction,
      text_hash: textHash,
      confidence: extraction.overall_confidence,
    });

  if (extractionError) {
    return NextResponse.json(
      { error: extractionError.message },
      { status: 500 }
    );
  }

  const fieldEntries = Object.entries(extraction.fields ?? {}).map(
    ([fieldKey, fieldValue]) => ({
      org_id: orgId,
      document_id: documentId,
      field_key: fieldKey,
      field_value:
        fieldValue?.value === null || fieldValue?.value === undefined
          ? null
          : String(fieldValue.value),
      confidence: fieldValue?.confidence ?? null,
      source: "epc_ai",
    })
  );

  if (fieldEntries.length > 0) {
    const { error: fieldsError } = await supabase
      .from("field_values")
      .insert(fieldEntries);

    if (fieldsError) {
      return NextResponse.json(
        { error: fieldsError.message },
        { status: 500 }
      );
    }
  }

  const validation = validateEpcExtraction(extraction);
  const confidenceThreshold = Number(
    process.env.EPC_CONFIDENCE_THRESHOLD ?? "0.75"
  );
  const status =
    extraction.overall_confidence >= confidenceThreshold && validation.isValid
      ? "parsed"
      : "needs_review";

  await supabase
    .from("documents")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", documentId);

  await logAudit({
    orgId,
    action: "epc.extracted",
    entityType: "document",
    entityId: documentId,
    metadata: {
      status,
      confidence: extraction.overall_confidence,
      validationIssues: validation.issues,
    },
  });

  return NextResponse.json({ ok: true, status });
}
