# Wat moet er nog gebeuren om het project te laten werken

## 1. `.env` volledig invullen

Het script controleert bij opstart of **alle** onderstaande variabelen gezet zijn. Zet ze in je **`.env`** (root of in `alexander/` – het bestand dat het script laadt).

### Verplicht (zonder deze start het script niet)

| Variabele | Waar te vinden |
|-----------|----------------|
| `APP_KEY_SOURCE_FULL` | Dropbox App Console – je SOURCE app |
| `APP_SECRET_SOURCE_FULL` | Idem |
| `REFRESH_TOKEN_SOURCE_FULL` | Na OAuth-flow met die app |
| Min. 1 van `GEMINI_API_KEY_1` … `GEMINI_API_KEY_21` | Google AI Studio |
| `APP_KEY_SOURCE_RO` | Dropbox – read-only SOURCE app |
| `APP_SECRET_SOURCE_RO` | Idem |
| `REFRESH_TOKEN_SOURCE_RO` | Na OAuth met die app |
| `GEMINI_API_KEY_ANALYZE` | Google AI Studio (aparte key voor contractanalyse) |
| `APP_KEY_TARGET` | Dropbox – TARGET app |
| `APP_SECRET_TARGET` | Idem |
| `REFRESH_TOKEN_TARGET` | Na OAuth met TARGET app |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Idem (service_role key) |
| `SENDER_EMAIL` | Gmail-adres van waaruit mail wordt verstuurd |
| `SENDER_PASSWORD` | App-wachtwoord van dat Gmail-account (niet je gewone wachtwoord) |
| `RECIPIENT_EMAIL` | E-mailadres waar notificaties naartoe gaan |

### Optioneel (aanbevolen)

| Variabele | Doel |
|-----------|------|
| `GOOGLE_VISION_API_KEY` | OCR bij scans; anders valt het script terug op Gemini voor OCR |

---

## 2. Supabase: migratie uitgevoerd

- De tabel **`document_texts`** moet bestaan (migratie in Supabase SQL Editor al gedraaid).
- De tabel **`contracts`** moet ook bestaan (eerder migratie voor JSON-opslag).

Als je bij het starten van het script een fout krijgt over een ontbrekende tabel, voer dan de bijbehorende migratie nog eens uit in Supabase → SQL Editor.

---

## 3. Python-omgeving en dependencies

```bash
cd alexander
pip install -r requirements.txt
```

(Voor zover je een virtuele omgeving gebruikt: die eerst activeren.)

---

## 4. Script starten

```bash
cd alexander
python allesfocusophuur.py
```

Of vanaf de **root** van het project, als je `.env` daar staat en het script daar de env laadt:

```bash
python alexander/allesfocusophuur.py
```

Het script laadt `.env` uit de scriptmap en uit de projectroot.

---

## 5. Frontend (Vercel) – alleen als je de website wilt gebruiken

- In Vercel → Project → **Environment Variables** zetten:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Eventueel `NEXT_PUBLIC_SCRIPT_ACTIVE=true` als het Python-script draait
- Frontend bouwen vanuit `alexander/epc-architecture` (of de map die aan Vercel gekoppeld is).

---

## Checklist (kort)

- [ ] Alle verplichte variabelen in `.env` gezet (zie tabel hierboven)
- [ ] `GOOGLE_VISION_API_KEY` in `.env` (optioneel maar aanbevolen voor scans)
- [ ] Supabase-migraties gedraaid (`contracts` + `document_texts`)
- [ ] `pip install -r requirements.txt` in `alexander/`
- [ ] `python allesfocusophuur.py` start zonder "Missing required credentials" of Supabase-/tabel-fouten

Als het script start en je ziet o.a. "✓ All credentials validated successfully" en "✅ Dropbox Organize: ...", dan is de basis in orde.
