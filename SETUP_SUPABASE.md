# Supabase eenmalig instellen

1. **Waarden ophalen**  
   Ga naar [Supabase Dashboard](https://supabase.com/dashboard) → jouw project → **Settings** → **API**.

2. **In je `.env` (projectroot) zetten:**
   - **Project URL** → `SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_URL` (zelfde waarde)
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

   Voorbeeld (vervang door jouw waarden):
   ```env
   SUPABASE_URL=https://fzvztgghppaorirqertp.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   NEXT_PUBLIC_SUPABASE_URL=https://fzvztgghppaorirqertp.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```

3. **Migratiescript draaien** (eenmalig, om bestaande JSON uit Dropbox naar Supabase te kopiëren):
   ```bash
   python scripts/migrate_dropbox_json_to_supabase.py
   ```

4. **Als je de app vanuit de map `epc-architecture` start:**  
   Kopieer de vier Supabase-regels uit `.env` naar `epc-architecture/.env.local`.

Daarna werken de Python-scripts, de Next.js app en de epc-architecture met Supabase.
