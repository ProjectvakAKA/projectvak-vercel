# Plan of Action – Status & API-calls

Overzicht wat al gedaan is, wat nog moet, en **hoeveel API-calls** er per scenario nodig zijn (nu vs na volledige implementatie).

---

## Wat is al gedaan

| Stap | Beschrijving | Status |
|------|--------------|--------|
| **Deel 1** | 21 keys, 15/24u, rotator, state JSON | ✅ |
| **1 (+6)** | Ordenen + hernoemen + samenvatting in één call, Dropbox + _summary.json | ✅ |
| **2** | Tekst: pdfplumber → Tesseract (0 API) → quality check → Gemini Vision fallback | ✅ |
| **3** | Quality check na OCR (onder drempel → Vision fallback) | ✅ |
| **4** | Vaste velden: regels/regex voor huurprijs, ingangsdatum, adres; rest via AI | ✅ |
| **5** | AI alleen voor secties die regels niet vullen | ✅ |
| **6** | Samenvatting | ✅ (ordenen in call 1; contract heeft generate_summary) |
| **7** | Opslaan: Dropbox + Supabase JSON + **document_texts** (full_text voor zoeken) | ✅ |
| **8** | Monitoring: stats (tekstlaag / Tesseract / Vision, % regels vs AI) | ✅ |

---

## API-calls per document

### Phase 1: Organiseren (ordenen in Dropbox)

| Situatie | Nu (geïmplementeerd) |
|----------|------------------------|
| **PDF met tekstlaag** | pdfplumber (0) + **1×** smart_classify → **1 Gemini** |
| **PDF is scan** | Tesseract (0) + **1×** smart_classify → **1 Gemini**; of bij slechte kwaliteit: Gemini Vision (1) + **1×** smart_classify → **2 Gemini** |

- **Resultaat:** Meestal **1 Gemini** per document (Tesseract = 0 API). Alleen bij slechte Tesseract-kwaliteit: Vision fallback = 2 Gemini.

### Phase 2: Contractanalyse (huurcontract → JSON + Supabase)

| Stap | Nu (geïmplementeerd) |
|------|------------------------|
| Tekst | 0 (pdfplumber) of 0 (Tesseract) of **1** (Gemini Vision fallback) |
| Velden (Stap 4+5) | Regels voor financieel/periodes/pand (huurprijs, datum, adres) → **rest via Gemini** (4–7 stages, afhankelijk van regex-treffer) |
| Samenvatting | **1×** Gemini |
| **Totaal per contract** | **~5–9 Gemini** (minder als regels meer vullen) |

---

## Samenvatting aantal API-calls (na implementatie)

| Scenario | Gemini-calls |
|----------|----------------|
| **Organiseren – PDF met tekst** | 1 |
| **Organiseren – scan (Tesseract ok)** | 1 |
| **Organiseren – scan (Vision fallback)** | 2 |
| **Contract – tekst of Tesseract** | 1 (summary) + 4–7 (stages, afhankelijk van regels) |
| **Contract – Vision fallback** | 1 (OCR) + 1 (summary) + 4–7 (stages) |

**Limiet (Deel 1):** 21 keys × 15/24u = **315 Gemini-calls/dag** voor organiseren.  
Contractanalyse gebruikt **GEMINI_API_KEY_ANALYZE** (aparte key), niet de 21 organize-keys.

---

## Wat je nog moet doen

1. **Tesseract (optioneel):** `pip install pytesseract` en bv. `brew install tesseract tesseract-lang` (macOS). Zonder Tesseract wordt bij scans Gemini Vision gebruikt (1 extra call per scan).
2. **Supabase-migratie:** Run de migratie `alexander/supabase/migrations/20250131000000_document_texts.sql` op je Supabase-project zodat de tabel `document_texts` bestaat (voor opslaan geëxtraheerde tekst en zoekfeature).

---

*Bijgewerkt na Plan of Action; implementatie in `alexander/allesfocusophuur.py`.*
