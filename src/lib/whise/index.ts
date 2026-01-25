import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWhiseFieldMap } from "@/lib/whise/mapping";

type WhisePushInput = {
  orgId: string;
  documentId: string;
  whisePropertyId: string;
};

type WhisePushResult = {
  mode: "api" | "import";
  payload: Record<string, unknown> | string;
};

function toCsvRow(values: string[]) {
  return values.map((value) => `"${value.replace(/"/g, '""')}"`).join(",");
}

export async function pushEpcToWhise({
  orgId,
  documentId,
  whisePropertyId,
}: WhisePushInput): Promise<WhisePushResult> {
  const supabase = createSupabaseAdminClient();
  const { data: fields, error: fieldsError } = await supabase
    .from("field_values")
    .select("field_key,field_value")
    .eq("org_id", orgId)
    .eq("document_id", documentId);

  if (fieldsError) {
    throw new Error(fieldsError.message);
  }

  const mapping = getWhiseFieldMap();
  const mapped: Record<string, string> = {};

  for (const field of fields ?? []) {
    const targetKey = mapping[field.field_key];
    if (!targetKey) {
      continue;
    }
    mapped[targetKey] = field.field_value ?? "";
  }

  const mode = (process.env.WHISE_INTEGRATION_MODE ?? "import") as
    | "api"
    | "import";

  if (mode === "api") {
    const endpoint = process.env.WHISE_API_ENDPOINT;
    const token = process.env.WHISE_API_TOKEN;

    if (!endpoint || !token) {
      throw new Error("Missing WHISE_API_ENDPOINT or WHISE_API_TOKEN.");
    }

    const payload = {
      property_id: whisePropertyId,
      fields: mapped,
      document_id: documentId,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Whise API push failed: ${text}`);
    }

    return { mode, payload };
  }

  const header = ["whise_property_id", ...Object.keys(mapped)];
  const row = [
    whisePropertyId,
    ...Object.keys(mapped).map((key) => mapped[key] ?? ""),
  ];
  const csv = `${toCsvRow(header)}\n${toCsvRow(row)}\n`;

  await supabase.from("whise_exports").insert({
    org_id: orgId,
    document_id: documentId,
    format: "csv",
    payload: csv,
  });

  return { mode: "import", payload: csv };
}
