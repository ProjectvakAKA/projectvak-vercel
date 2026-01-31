import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id,action,entity_type,entity_id,created_at,metadata")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Track Dropbox syncs, extraction runs, and status changes for
          compliance.
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          {logs?.length ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {log.action}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {log.created_at ?? "unknown time"}
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {log.entity_type ?? "entity"} • {log.entity_id ?? "n/a"}
                </div>
                {log.metadata ? (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-2 text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          ) : (
            <p>No audit logs recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
