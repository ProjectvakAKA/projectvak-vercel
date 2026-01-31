import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;
let loadedParentEnv = false;

/**
 * Load root .env when running from epc-architecture/ so local dev uses same Supabase as Vercel.
 * Next.js only loads .env from epc-architecture/, not from project root.
 */
function ensureEnvLoaded() {
  if (loadedParentEnv) return;
  loadedParentEnv = true;
  try {
    config({ path: path.resolve(process.cwd(), '..', '.env') });
  } catch {
    // ignore
  }
}

/**
 * Server-side Supabase client (service key) for contracts table.
 * Used when JSON is stored in Supabase instead of Dropbox TARGET.
 */
export function getSupabaseContracts() {
  ensureEnvLoaded();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_KEY;

  if (!url || !key) return null;

  if (!supabase) {
    supabase = createClient(url, key);
  }
  return supabase;
}
