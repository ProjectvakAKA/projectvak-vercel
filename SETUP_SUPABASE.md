# Supabase eenmalig instellen

## Supabase op localhost (root-app)

De Next.js-app laadt `.env` **alleen uit de projectroot** (de map waar `package.json` staat). Als je `npm run dev` vanuit de root doet, moet je `.env` dus **in die map** hebben.

1. **Waarden ophalen**  
   Ga naar [Supabase Dashboard](https://supabase.com/dashboard) → jouw project → **Settings** → **API**.  
   Je hebt nodig:
   - **Project URL** (bijv. `https://xxxx.supabase.co`)
   - **anon public** (onder "Project API keys")
   - **service_role** (onder "Project API keys", geheim – alleen server-side gebruiken)

2. **Bestand `.env` aanmaken/bijwerken in de projectroot**  
   Dat is de map waar o.a. `package.json`, `next.config.ts` en `src/` staan (niet in `alexander/` of `epc-architecture/`).

   Voeg deze regels toe (vervang door jouw waarden):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   SUPABASE_URL=https://jouw-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...   # service_role key
   ```

3. **Dev-server herstarten**  
   Next.js leest `.env` alleen bij start. Na het toevoegen of wijzigen van variabelen:
   ```bash
   # In de projectroot
   npm run dev
   ```
   Als de server al draaide: stoppen (Ctrl+C) en opnieuw `npm run dev` doen.

4. **Controleren**  
   - `/admin` en `/admin/logs` gebruiken de server client (NEXT_PUBLIC_* + anon key).  
   - Dropbox/EPC/Whise-API’s gebruiken de admin client (SUPABASE_SERVICE_KEY).  
   Beide hebben de juiste vars in **dezelfde** `.env` in de root nodig.

---

## Overige stappen (eenmalig)

5. **Migratiescript draaien** (als je bestaande JSON uit Dropbox naar Supabase wilt kopiëren):
   ```bash
   python scripts/migrate_dropbox_json_to_supabase.py
   ```
   Zorg dat dezelfde Supabase-vars in `.env` staan (zie stap 2).

6. **Als je de app vanuit `alexander/epc-architecture` start:**  
   Kopieer de vier Supabase-regels uit de root `.env` naar `alexander/epc-architecture/.env.local`, anders vindt die app de variabelen niet.

Daarna werken de Python-scripts, de Next.js root-app en (met eigen `.env.local`) de epc-architecture met Supabase.
