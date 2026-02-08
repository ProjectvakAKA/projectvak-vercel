# Supabase op localhost – checklist

## Waarom niet gewoon één .env in de root?

Next.js leest **alleen** `.env` uit de map waar de **Next-app** draait (waar `next.config` en `package.json` van die app staan). De **contracts-app** draait in `alexander/epc-architecture/`, dus Next kijkt daar naar `.env` en `.env.local` — **niet** naar de repo-root `.env`. Daarom lijkt het alsof je twee plekken moet bijhouden.

**Oplossing: één .env, symlink in de contracts-app**

Zo hoef je maar één bestand te onderhouden (de root `.env`):

```bash
# In de projectroot (map met alexander/)
ln -sf ../../.env alexander/epc-architecture/.env.local
```

Daarna leest de contracts-app via `.env.local` gewoon de root `.env`. Wijzigingen doe je alleen in de root `.env`.

---

Als je "Missing Supabase env vars" ziet of Supabase werkt niet lokaal:

## 1. Juiste map

De **projectroot** is de map waar o.a. deze bestanden staan:
- `package.json`
- `next.config.ts`
- `src/` (met `app/`, `lib/`)

Je `.env` moet **in die map** liggen, niet in `alexander/` of `epc-architecture/`.

## 2. Bestand `.env`

- Bestandsnaam exact: **`.env`** (of `.env.local`).
- In de projectroot (zie stap 1).

Als je nog geen `.env` hebt: kopieer `.env.example` naar `.env` en vul de waarden in.

## 3. Vier Supabase-variabelen

In `.env` moeten deze vier regels staan (vervang door jouw waarden uit [Supabase Dashboard → Settings → API](https://supabase.com/dashboard)):

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...jouw_anon_key
SUPABASE_URL=https://jouw-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...jouw_service_role_key
```

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` en `SUPABASE_URL` (zelfde waarde).
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **service_role** → `SUPABASE_SERVICE_KEY`.

## 4. Dev-server herstarten

Next.js leest `.env` alleen bij opstarten. Na het toevoegen of wijzigen van variabelen:

1. Stop de dev-server (Ctrl+C).
2. Start opnieuw: `npm run dev` (uitgevoerd in de **projectroot**).

## 5. Controleren

1. **Eerst:** open http://localhost:3000/api/env-check  
   Daar zie je welke Supabase-vars Next.js ziet ("set" of "missing"). Alle vier moeten "set" zijn. Als er "missing" staat: `.env` staat in de verkeerde map, of de variabelen heten anders, of je hebt de dev-server niet herstart.
2. **Daarna:** open http://localhost:3000/admin en http://localhost:3000/admin/logs.  
   Als je daar nog "Missing Supabase env vars" ziet terwijl /api/env-check wel "set" toont: herstart de dev-server opnieuw (Ctrl+C, dan `npm run dev`).

---

**Als je de contracts-app in `alexander/epc-architecture` draait:**  
Daar leest Next.js `.env` uit **die** map. Kopieer de vier Supabase-regels naar `alexander/epc-architecture/.env.local` en start de dev-server vanuit `alexander/epc-architecture` opnieuw.
