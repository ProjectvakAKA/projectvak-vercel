# Code naar een tweede repo pushen (voor Vercel)

Zo kun je alles naar een **eigen repo** pushen en die op Vercel koppelen, zonder de gedeelde team-repo te gebruiken.

## Stappen

1. **Nieuwe repository op GitHub**
   - Ga naar [GitHub](https://github.com/new).
   - Maak een nieuwe repo (bijv. `projectvak-vercel` of `mijn-epc-app`).
   - Laat "Add a README" uit; de repo mag leeg zijn.
   - Kopieer de HTTPS-URL (bijv. `https://github.com/jouw-username/projectvak-vercel.git`).

2. **Pushen naar die repo**
   In de map van dit project:
   ```bash
   ./push-to-vercel-repo.sh https://github.com/jouw-username/projectvak-vercel.git
   ```
   (Vervang de URL door jouw repo-URL.)

3. **Vercel koppelen**
   - Ga naar [Vercel](https://vercel.com) → New Project.
   - Importeer de **nieuwe** repo (niet de team-repo).
   - Als je alleen de Next.js-app wilt deployen: zet **Root Directory** op `epc-architecture` of `alexander/epc-architecture`, afhankelijk van waar je vandaan bouwt.
   - Voeg je env vars toe (o.a. `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

Daarna bouwt Vercel uit jouw eigen repo; de team-repo blijft onaangeroerd.
