import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            EPC Admin
          </div>
          <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/logs">Audit Logs</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
