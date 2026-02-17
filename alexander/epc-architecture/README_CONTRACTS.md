# Contract Systeem - Frontend Integratie

Dit is de frontend integratie voor het contract verwerkingssysteem. Het combineert de Python backend (`allesfocusophuur.py`) met een Next.js frontend om alle geanalyseerde contracten te bekijken.

## Setup

### 1. Installeer dependencies

```bash
cd epc-architecture
npm install
# of
pnpm install
```

### 2. Configureer environment variabelen

Maak een `.env.local` bestand in de `epc-architecture` map met de volgende variabelen:

```env
# Dropbox TARGET Credentials (voor JSON opslag)
APP_KEY_TARGET=your_app_key_here
APP_SECRET_TARGET=your_app_secret_here
REFRESH_TOKEN_TARGET=your_refresh_token_here

# Dropbox SOURCE Credentials (voor PDF-viewer bij Zoeken → Bekijk PDF)
# Georganiseerde bestanden staan in SOURCE; zonder deze werkt "Bekijk PDF" niet.
APP_KEY_SOURCE_FULL=...
APP_SECRET_SOURCE_FULL=...
REFRESH_TOKEN_SOURCE_FULL=...
```

**Belangrijk:** TARGET =zelfde als in je hoofd `.env`. Voor **Bekijk PDF** (zoekresultaten) moet ook SOURCE gezet zijn in Vercel (APP_KEY_SOURCE_FULL, REFRESH_TOKEN_SOURCE_FULL).

### 3. Start de development server

```bash
npm run dev
# of
pnpm dev
```

De applicatie is nu beschikbaar op `http://localhost:3000`

## Functionaliteit

### Contracten Overzicht (`/contracts`)

- Toont alle JSON bestanden die door de Python script zijn gegenereerd
- Sorteert op datum (nieuwste eerst)
- Zoekfunctionaliteit om contracten te filteren
- Klik op een contract om details te bekijken

### Contract Details (`/contracts/[filename]`)

- Volledige weergave van alle contractgegevens:
  - Document informatie
  - Partijen (verhuurder & huurder)
  - Pand informatie (adres, type, oppervlakte, EPC, kadaster)
  - Financiële gegevens (huurprijs, waarborg, kosten)
  - Periodes en termijnen
  - Voorwaarden
  - Juridische informatie
  - Samenvatting

## API Routes

### `GET /api/contracts`
Lijst alle JSON bestanden in Dropbox TARGET folder.

### `GET /api/contracts/[filename]`
Haalt een specifiek contract JSON bestand op uit Dropbox.

## Workflow

1. **Python Script** (`allesfocusophuur.py`) verwerkt PDFs en genereert JSON bestanden
2. JSON bestanden worden opgeslagen in Dropbox TARGET folder
3. **Frontend** leest JSON bestanden via API routes
4. Gebruiker kan alle contracten bekijken en details inzien

## Troubleshooting

### "Dropbox TARGET credentials not configured"
- Controleer of `.env.local` bestaat in de `epc-architecture` map
- Controleer of alle drie de TARGET credentials zijn ingesteld
- Herstart de development server na het toevoegen van environment variabelen

### "Failed to fetch contracts"
- Controleer of de Dropbox credentials correct zijn
- Controleer of er JSON bestanden zijn in de Dropbox TARGET folder
- Controleer de browser console voor meer details

### Geen contracten zichtbaar
- Controleer of de Python script daadwerkelijk JSON bestanden heeft gegenereerd
- Controleer of de bestandsnamen beginnen met `data_` en eindigen met `.json`
- Gebruik de "Vernieuwen" knop om de lijst te updaten
