# Instructies om code naar GitHub te pushen

## 🚀 Snelle manier: Gebruik het script!

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
./push-to-github.sh
```

Dit script doet alles automatisch:
1. Verwijdert embedded git repository
2. Voegt alle bestanden toe
3. Toont wat er wordt gecommit
4. Commit en push naar GitHub

## Of handmatig:

### ⚠️ BELANGRIJK: Verwijder embedded git repository eerst!

Er zit een `.git` folder in `epc-architecture/` die eerst verwijderd moet worden:

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
rm -rf epc-architecture/.git
```

### Stap 1: Controleer dat gevoelige bestanden genegeerd worden

De volgende bestanden worden automatisch genegeerd door `.gitignore`:
- `.env` (hoofd directory)
- `.env.local` (epc-architecture)
- `venv/` (Python virtual environment)
- `__pycache__/` (Python cache)
- `*.log` (log files)
- `*.zip` (backup files)

## Stap 2: Voeg alle bestanden toe

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io

# Voeg alle nieuwe bestanden toe
git add .

# Check wat er wordt toegevoegd (zorg dat .env files NIET in de lijst staan!)
git status
```

## Stap 3: Commit de wijzigingen

```bash
git commit -m "Add Next.js frontend with contract management system

- Added epc-architecture Next.js frontend
- Integrated with Python backend via Dropbox TARGET
- Added DashboardLayout with sidebar navigation
- Added contracts overview page with stats and filters
- Added contract detail page with tabs and extracted fields
- Added start-all.sh script to run both backend and frontend
- Updated Python script for better history management
- Added UI components (Card, Button, Input, Badge, Progress, Select, Tabs, etc.)
- Added StatusBadge component for contract status display"
```

## Stap 4: Push naar GitHub

```bash
git push origin main
```

## Belangrijk voor je team

Je team moet na het clonen:

1. **Python dependencies installeren:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Next.js dependencies installeren:**
   ```bash
   cd epc-architecture
   npm install
   ```

3. **Environment variables instellen:**
   - Kopieer `.env.example` naar `.env` (hoofd directory)
   - Kopieer `.env.example` naar `epc-architecture/.env.local`
   - Vul alle credentials in

4. **Starten:**
   ```bash
   # Vanuit hoofd directory
   ./start-all.sh
   ```

## Bestanden die NIET worden gepusht (veilig):

✅ `.env` - bevat API keys
✅ `.env.local` - bevat API keys  
✅ `venv/` - Python virtual environment
✅ `__pycache__/` - Python cache
✅ `*.log` - log files
✅ `*.zip` - backup files
✅ `contract_system.log` - Python logs

## Bestanden die WEL worden gepusht:

✅ Alle source code
✅ `requirements.txt` - Python dependencies
✅ `package.json` - Node.js dependencies
✅ `.env.example` - template voor environment variables
✅ `start-all.sh` - start script
✅ `epc-architecture/` - volledige Next.js frontend
