import { NextResponse } from "next/server";

/**
 * GET /api/env-check
 * Toont welke Supabase env vars Next.js ziet (alleen "set" of "missing", geen waarden).
 * Gebruik: open http://localhost:3000/api/env-check
 */
export async function GET() {
  const vars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "set"
      : "missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "set"
      : "missing",
    SUPABASE_URL: process.env.SUPABASE_URL ? "set" : "missing",
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? "set" : "missing",
  };

  const allSet =
    vars.NEXT_PUBLIC_SUPABASE_URL === "set" &&
    vars.NEXT_PUBLIC_SUPABASE_ANON_KEY === "set";

  return NextResponse.json({
    supabase: vars,
    ok: allSet,
    hint: allSet
      ? "Supabase vars zijn aanwezig. Als /admin nog faalt, herstart de dev-server (Ctrl+C, dan npm run dev)."
      : "Zet de ontbrekende variabelen in .env in de projectroot (de map met package.json) en herstart npm run dev.",
  });
}
