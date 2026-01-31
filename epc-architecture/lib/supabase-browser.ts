import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const hasEnv = Boolean(url && anonKey)

if (!hasEnv && typeof window !== 'undefined') {
  console.warn('Supabase env ontbreekt: NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in .env. Login werkt pas na herstart dev server.')
}

export const supabaseBrowser = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder'
)

/** Of Supabase echt geconfigureerd is (niet placeholder). Dan pas inloggen verplichten. */
export const hasSupabaseEnv = Boolean(
  url && anonKey &&
  url !== 'https://placeholder.supabase.co' &&
  anonKey !== 'placeholder'
)
