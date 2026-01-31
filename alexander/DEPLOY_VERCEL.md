# Deploy op Vercel – stappen

## 1. Code naar de Vercel-repo pushen

In de projectmap (waar dit bestand staat):

```bash
# Zorg dat je op main bent en alles gecommit
git status
git add -A && git commit -m "Build fixes voor Vercel"   # alleen als er wijzigingen zijn

# Remote 'vercel' moet bestaan (eenmalig als die nog niet bestaat):
# git remote add vercel https://github.com/ProjectvakAKA/projectvak-vercel.git

# Alleen naar de Vercel-repo pushen (niet naar team origin)
./push-alleen-vercel.sh
```

Als `push-alleen-vercel.sh` faalt omdat de remote ontbreekt:

```bash
git remote add vercel https://github.com/ProjectvakAKA/projectvak-vercel.git
git push vercel main
```

---

## 2. Vercel-project koppelen

1. Ga naar [vercel.com](https://vercel.com) en log in.
2. **Add New** → **Project**.
3. **Import** je GitHub-repo: **ProjectvakAKA/projectvak-vercel** (of de repo waar je net naartoe pushte).
4. Klik **Import**.

---

## 3. Root Directory instellen (welke app deployen)

Je hebt twee apps in de repo. Kies één per Vercel-project.

### Optie A – Alleen de contracts-app (aanbevolen als je die gebruikt)

- **Root Directory:** klik **Edit** → vul in: `alexander/epc-architecture` → **Save**.
- Build draait dan in die map; dat is de contracts/Whise/Supabase-app.

### Optie B – Alleen de hoofddashboard-app (root)

- **Root Directory:** laat leeg.
- Dan wordt de app in de root (`src/`, admin, Dropbox, etc.) gedeployed.

### Beide apps live

- Maak **twee** Vercel-projecten, allebei gekoppeld aan dezelfde repo.
- Project 1: Root Directory = `alexander/epc-architecture`.
- Project 2: Root Directory leeg.

---

## 4. Environment variables

1. In je Vercel-project: **Settings** → **Environment Variables**.
2. Voeg de variabelen uit **env-voor-vercel.txt** toe.
3. Vervang `VUL_IN` door je echte waarden (zelfde als in je lokale `.env`).
4. Kies **Production** (en eventueel Preview/Development).
5. **Save**.

Belangrijke vars voor de contracts-app o.a.:  
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, Dropbox- en Whise-vars, `SYNC_SECRET`, `DROPBOX_OAUTH_STATE_SECRET`.

---

## 5. Deploy starten

- Na **Import** kun je meteen op **Deploy** klikken.
- Of later: **Deployments** → **Create Deployment** → branch **main** → **Deploy**.

Na een paar minuten krijg je een URL (bijv. `jouw-project.vercel.app`). Zet die in `.env` / Vercel als `NEXT_PUBLIC_APP_URL` als je die gebruikt.

---

## Kort overzicht

| Stap | Actie |
|------|--------|
| 1 | `./push-alleen-vercel.sh` (of `git push vercel main`) |
| 2 | Vercel → Add New → Project → Import repo |
| 3 | Root Directory: `alexander/epc-architecture` (contracts) of leeg (root app) |
| 4 | Settings → Environment Variables → vars uit env-voor-vercel.txt invullen |
| 5 | Deploy (eerste keer of Redeploy) |

Daarmee staat “het hele ding” op Vercel; welke app er draait hangt af van de Root Directory (stap 3).
