# Plan of Action – Documentpipeline

**Doel:** Overzicht om bij te houden en later te implementeren wanneer het team terug is met een antwoord.

---
We moeten ook kunnen de jsons linken met het juiste kantoor. hier moet nog over gedacht worden. 

## Deel 1: Ordenen, in mappen steken en hernoemen (Gemini) — ✅ gedaan
21 Gemini API-keys, elk max. 15 calls per 24u → 315 calls/dag.
Keys staan in env: GEMINI_API_KEY_1 t.e.m. GEMINI_API_KEY_21.
Per key bewaar je state: count + reset_at in een JSON-bestand.
Bij elke API-call:
Reset count als now >= reset_at.
Kies de key met laagste count < 15.
Geen key vrij → fout of wachten.
Verhoog count, sla state op.
Gebruik die key voor Gemini.
Resultaat: eerlijke rotatie + persistent over runs.

### Aantal API-calls per document (initiële fase – source box)

**Nieuw plan (na implementatie):** Tekst komt uit **tekstlaag** (pdfplumber), **Tesseract** of **Google Vision** – geen Gemini voor OCR. Ordenen + hernoemen = alleen **1 Gemini-call** per document (`smart_classify` → map + bestandsnaam).

| Situatie | Tekst ophalen | Ordenen + hernoemen | Totaal Gemini-calls |
|----------|----------------|---------------------|----------------------|
| PDF met tekstlaag | pdfplumber (geen API) | 1× smart_classify | **1** |
| PDF is scan | Tesseract of Google Vision (geen Gemini) | 1× smart_classify | **1** |

- **Per document:** altijd **1 Gemini-call** in de initiële fase.
- **21 keys × 15/24u** = 315 calls/24u → max **315 documenten** per 24u (ongeacht tekst of scan).

---

*Huidige code (`allesfocusophuur.py`) gebruikt nog Gemini Vision voor OCR bij scans → dan 2 calls per scan-document. Na overschakelen naar Tesseract/Vision voor OCR blijft alleen de ene classificatie-call over.

---

## Deel 2: Volledige pipeline (van document tot JSON + opslag)

Volgorde van stappen die het systeem moet doorlopen:
stap 2 moet hier eignelijk voor. we moetne als we een document binnen krijgen helemaal kunnen zien wat er effectief instaat. (zonder dat de vision het dan wel begrijpt), pas dan zal gemini met die etkst gaan checken waar te zetten en dan verder ordenen.
### Stap 1 (+ 6 in één call): Document verzamelen + ordenen + samenvatting (Dropbox)
- Upload document → **één Gemini-call** doet:
  - **Document volledig inlezen** en een **korte samenvatting** maken (max 3–4 zinnen, voor metadata).
  - **Classificatie:** bepalen waar het in Dropbox moet (map, type, bestandsnaam).
- Het document wordt in de juiste Dropbox-map geplaatst; de samenvatting + classificatie-metadata wordt in de **zelfde map** opgeslagen als `{bestandsnaam}_summary.json`.


### Stap 2: Tekst uit het document halen
- **Check:** Is er een **tekstlaag** in de PDF? (geen scan)
  - **Ja** → Tekst uitlezen met PDF-library (PyMuPDF / pdfplumber) → door naar Stap 3.
  - **Nee** → **OCR nodig:**
    - **Optie 1:** Tesseract (lokaal, gratis) → output naar quality check.
    - **Optie 2:** Google Cloud Vision OCR (cloud) → output naar quality check. (1000 calls per maand, dus ermee opletten (dan 1.5 dollar per 1000))

### Stap 3: Quality check (na OCR)
- Controleer of de OCR-tekst bruikbaar is (bijv. lengte, basiskwaliteit).
- **Als slecht** en je gebruikte Tesseract → fallback naar **Google Vision OCR** voor die pagina/document.
- **Als ok** → door naar Stap 4.

### Stap 4: Vaste velden / contractanalyse (regels eerst)
- **EPC:** Regels + regex op de tekst (labels zoals “Energielabel:”, “Bewoonbare oppervlakte:”, enz.) → gestructureerde velden → **JSON**.
- **Contracten (vaste onderdelen):** Waar mogelijk dezelfde aanpak (regels/regex) → **JSON**.
- Regels maak je op basis van 1–2 voorbeelddocumenten (EPC/contract); structuur en voorbeelden doorgeven, dan worden regels (regex/code) uitgeschreven.

### Stap 5: AI-fallback voor moeilijke gevallen
- Als regels geen of onvoldoende velden opleveren (onduidelijke layout, rare tekst):
  - **Model:** GPT-4o-mini of Ollama (lokaal). of iets anders. (afhankelijk van wat liefst is. bv gemini of groq of een ander goed model)
  - Alleen voor dat document of die velden aanroepen → output aanvullen in dezelfde **JSON**-structuur.

### Stap 6: Samenvatting (bij ordenen al gedaan in dezelfde call als Stap 1)
- Voor **organiseren/ordenen** gebeurt de samenvatting al in **dezelfde Gemini-call** als Stap 1 (zie hierboven).
- Voor **contractanalyse** (na Stap 4/5): nog aparte samenvatting indien gewenst (GPT-4o-mini / Ollama ofzelfde model).

### Stap 7: Opslaan en versiebeheer
- **Origineel document** → Dropbox (zoals nu). dit blijft in source box 
- **Geëxtraheerde tekst (tekstlaag of OCR) per document** → apart bewaren in **eigen Dropbox-map of Supabase-tabel**, zodat later **door alle teksten gezocht** kan worden (zie hieronder).
- **OCR-output** (indien van toepassing) bewaren (bijv. in JSON of apart veld). deze extracted tekst zou mogen naar target box gaan (bv ter controle)
- **JSON-data** (velden + metadata) opslaan (bijv. Supabase / Dropbox / jullie huidige opslag). json wordt opgeslaan in supabase 
- **Samenvatting + metadata** (tool, timestamp, gebruikte key indien relevant) mee opslaan.

### Stap 8: Monitoring en metrics  (minst relevant maar kan wel als dit gratis kan)
- Bijhouden:
  - % documenten **volledig via regels** (geen AI-fallback).
  - % documenten met **AI-fallback** (contractanalyse).
  - % documenten met **OCR-fallback** (Tesseract → Vision).
- **Alerts** bij fouten of slechte OCR (bijv. quality check faalt, of te veel fallbacks).

---

## Overzicht in één blok

| # | Stap | Wat | Tool / aanpak |
|---|------|-----|----------------|
| 1 (+6) | Ordenen + hernoemen + samenvatting | Map, type, bestandsnaam + korte samenvatting in één call | Gemini (1 call) → Dropbox + \*_summary.json inzelfde map — GEDAAN |
| 2 | Tekst ophalen | PDF-text of OCR | PDF-library OF Tesseract OF Google Vision |
| 3 | Quality check | OCR ok? | Check → zo niet: Vision-fallback |
| 4 | Vaste velden | EPC + contract (regels) | Regels + regex → JSON |
| 5 | Moeilijke gevallen | Ontbrekende velden | AI: GPT-4o-mini / Ollama → JSON |
| 6 | Samenvatting (contractanalyse) | Optioneel na Stap 4/5 | GPT-4o-mini / Ollama / Gemini |
| 7 | Opslaan | Document + JSON + metadata | Dropbox + Supabase / huidige opslag |
| 8 | Monitoring | % regels, % AI, % OCR, alerts | Logging + metrics |

---

## Volgende stappen 
de andere nog vragen voor meerdere api keys te pakken, mss naar 35 gaan

1. **Deel 2** stap voor stap inbouwen: eerst tekstlaag vs OCR (Tesseract/Vision), dan quality check, dan regels voor EPC/contract, dan AI-fallback, dan opslag en monitoring.
2. **Regels voor EPC/contract:** Zodra je 1–2 voorbeelddocumenten (tekst of screenshot) hebt, structuur en velden doorgeven → dan worden concrete regels (regex/code) uitgeschreven.

met de google vision kunenn we wel maar 1000 p , uis mss 8 full contracten. is wel echt niet veel. we moeten ook nog denken aan de ai voor de fallback etc.

call to action: alle gemini keys inbrengen/vision uitdenken/ ai voor fallback/ ai voor samenvatting. 
---

## Samenvatting bevindingen (token-limieten, 1 call = classificatie + samenvatting)

- **Tokens:** 1 token ≈ 4 tekens. 1 pagina ≈ 300–600 tokens. Bron: [Gemini tokens](https://ai.google.dev/gemini-api/docs/tokens).
- **Per request (Gemini 2.5 Flash):** Input tot **~1.048.576 tokens** (~2.500–3.000 pagina’s), output tot **65.536 tokens**. Bron: [Gemini models](https://ai.google.dev/gemini-api/docs/models/gemini).
- **Rate limits:** RPM/TPM/RPD per project; actueel overzicht in [AI Studio → Usage → Rate limit](https://aistudio.google.com/usage). Batch-API heeft aparte limieten (enqueued tokens).
- **Stap 1 + Stap 6 in één call:** Eén Gemini-call kan zowel **classificatie** (map, type, bestandsnaam) als **korte samenvatting** (voor metadata) doen. Nog steeds 1 call per document; output (classificatie + samenvatting) past ruim binnen 65K output tokens.
- **Model in code:** Voorkeur gemini-2.5-flash / gemini-2.5-pro; dynamisch gekozen bij opstart (`allesfocusophuur.py`).

---

## Zoekfeature met frontend op Vercel + documenten in Dropbox (wat nodig is, hoe het werkt)

**Haalbaar:** Ja, maar zoeken doen we **niet** in Dropbox. Dropbox is alleen bestandsopslag; er is geen full-text search door bestands*inhoud*. Als Dropbox niet geschikt is voor zoeken, doen we het dus niet met Dropbox.

**Wat nodig is**
- **Supabase-tabel** voor geëxtraheerde tekst per document (bijv. `document_texts`: `document_id`, `source_path`/Dropbox-pad, `full_text`, `created_at`). Full-text search gebeurt hier.
- **Pipeline** (na stap 2): zodra tekst uit een document is (tekstlaag of OCR), die tekst **per document** in Supabase schrijven. Originele PDF’s blijven in Dropbox.
- **API** (Next.js op Vercel): endpoint die een zoekterm ontvangt, Supabase full-text search aanroept en resultaten (+ snippet) teruggeeft.
- **Frontend** (Vercel): zoekbalk → roept die API aan → toont welke documenten de term bevatten en link/snippet.

**Hoe het werkt**
1. Document binnen → tekst geëxtraheerd (stap 2) → **tekst opslaan in Supabase** (naast eventueel .txt in Dropbox als backup).
2. Gebruiker typt in zoekbalk → frontend stuurt query naar jouw API (Vercel).
3. API zoekt in Supabase (Postgres full-text), niet in Dropbox.
4. API retourneert documenten + snippets; frontend toont resultaten (met link naar document/bron in Dropbox indien gewenst).

**Kort:** Zoeken = altijd via Supabase. Dropbox = alleen opslag en bron van bestanden. Zonder Supabase (of andere zoekbare opslag) is “zoeken door alle teksten” niet haalbaar met alleen Dropbox.

---

*Document: plan of action om bij te houden; implementatie wanneer het team terug is met een antwoord.*
