import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditLogInput = {
  orgId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit({
  orgId,
  action,
  entityType,
  entityId,
  metadata,
}: AuditLogInput) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("audit_logs").insert({
    org_id: orgId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  });
}
