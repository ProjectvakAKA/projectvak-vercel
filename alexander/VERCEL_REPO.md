# Code naar Vercel pushen (zonder team-repo)

## Alleen naar Vercel pushen (niet naar team)

In de projectmap:

```bash
./push-alleen-vercel.sh
```

Of handmatig:

```bash
git push vercel main
```

Daarmee gaat alles **alleen** naar `https://github.com/ProjectvakAKA/projectvak-vercel.git`.  
**origin** (team-repo) wordt **niet** geüpdatet.

---

## Als push faalt (GitHub-login)

- **Terminal:** Log in met `gh auth login` (GitHub CLI) of gebruik SSH.
- **Of:** Open de repo op GitHub in de browser → Code → push via GitHub Desktop of een andere client waar je al ingelogd bent.

---

## Vercel Dashboard – als Vercel “niets doet”

1. **Juiste repo gekoppeld?**  
   Vercel → jouw project → **Settings** → **Git**  
   De gekoppelde repo moet **ProjectvakAKA/projectvak-vercel** zijn (niet de team-repo).

2. **Root Directory zetten**  
   Vercel → **Settings** → **General** → **Root Directory**  
   - Klik **Edit**  
   - Zet op: **`alexander/epc-architecture`** (geen slash vooraan)  
   - **Save**

3. **Deploy handmatig starten**  
   Vercel → **Deployments**  
   - Bij de laatste deployment: **…** (drie puntjes) → **Redeploy**  
   - Of: **Create Deployment** → kies branch **main** → **Deploy**

4. **Environment Variables**  
   **Settings** → **Environment Variables**  
   Voeg de variabelen uit `env-voor-vercel.txt` toe (Production, Preview, Development).

5. **Nog steeds niets?**  
   Maak een **nieuw project** in Vercel: **Add New** → **Project** → **Import** → kies **ProjectvakAKA/projectvak-vercel**.  
   Daarna meteen **Root Directory** = `alexander/epc-architecture` zetten en env vars toevoegen, dan deployen.
