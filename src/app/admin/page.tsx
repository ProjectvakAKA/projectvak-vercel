import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("id,name,status,updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);

  const { data: counts } = await supabase
    .from("documents")
    .select("status", { count: "exact", head: false });

  const statusCounts =
    counts?.reduce<Record<string, number>>((acc, row) => {
      acc[row.status ?? "unknown"] = (acc[row.status ?? "unknown"] ?? 0) + 1;
      return acc;
    }, {}) ?? {};

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Monitor EPC ingestion, extraction, and review status. Staff stays in
          Whise; this portal is only for setup and oversight.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {status}
            </div>
            <div className="text-2xl font-semibold">{count}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Recent documents</h2>
        <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          {documents?.length ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {doc.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Updated {doc.updated_at ?? "unknown"}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {doc.status}
                </div>
              </div>
            ))
          ) : (
            <p>No documents ingested yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
