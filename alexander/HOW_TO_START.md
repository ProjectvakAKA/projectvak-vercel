# 🚀 Hoe je code opnieuw starten na Cursor afsluiten

## Snelle start (beide tegelijk)

Open een terminal en ga naar je project folder:

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
./start-all.sh
```

Dit start automatisch:
- ✅ Python backend (`allesfocusophuur.py`)
- ✅ Next.js frontend (op http://localhost:3000)

**Om te stoppen:** Druk `Ctrl+C` in de terminal

---

## Handmatig starten (individueel)

### Alleen Python backend:

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io

# Activeer virtual environment
source venv/bin/activate

# Start Python script
python allesfocusophuur.py
```

**Om te stoppen:** Druk `Ctrl+C` in de terminal

### Alleen Next.js frontend:

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io/epc-architecture
npm run dev
```

**Om te stoppen:** Druk `Ctrl+C` in de terminal

---

## Eerste keer setup (als je de repo net hebt gecloned)

### 1. Python dependencies installeren:

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io

# Maak virtual environment
python3 -m venv venv

# Activeer virtual environment
source venv/bin/activate

# Installeer dependencies
pip install -r requirements.txt
```

### 2. Next.js dependencies installeren:

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io/epc-architecture
npm install
```

### 3. Environment variables instellen:

- Kopieer `.env.example` naar `.env` (hoofd directory)
- Kopieer `.env.example` naar `epc-architecture/.env.local`
- Vul alle credentials in

### 4. Start alles:

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
./start-all.sh
```

---

## Controleren of alles werkt

### Python backend:
- Check de terminal output - je zou moeten zien: "Checking for new documents..."
- Geen errors = het werkt!

### Next.js frontend:
- Open je browser: http://localhost:3000
- Je zou de dashboard moeten zien
- Klik op "Contracts" om alle contracten te zien

---

## Troubleshooting

### "Permission denied" bij start-all.sh:
```bash
chmod +x start-all.sh
```

### "Port 3000 already in use":
```bash
# Zoek welke process poort 3000 gebruikt
lsof -ti:3000

# Stop het proces (vervang PID met het nummer hierboven)
kill -9 PID
```

### "Module not found" errors:
- Voor Python: `pip install -r requirements.txt` (in venv)
- Voor Next.js: `npm install` (in epc-architecture folder)

### Python script stopt direct:
- Check of `.env` bestaat en alle credentials bevat
- Check of je in de juiste directory bent

---

## Handige commando's

### Check of processen draaien:
```bash
# Python process
ps aux | grep allesfocusophuur.py

# Next.js process
ps aux | grep "next dev"
```

### Stop alle processen:
```bash
# Stop Python
pkill -f allesfocusophuur.py

# Stop Next.js
pkill -f "next dev"
```

### Logs bekijken:
- Python logs: Check de terminal waar je het script startte
- Next.js logs: Check de terminal waar je `npm run dev` startte
