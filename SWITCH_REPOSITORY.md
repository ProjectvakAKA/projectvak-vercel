# 🔄 Overschakelen naar een andere GitHub repository

## Optie 1: Gebruik het script (aanbevolen)

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
./switch-repository.sh
```

Het script vraagt je om:
1. De nieuwe repository URL in te voeren
2. Bevestiging om de remote aan te passen
3. Of je direct wilt pushen

---

## Optie 2: Handmatig overschakelen

### Stap 1: Verwijder oude remote

```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
git remote remove origin
```

### Stap 2: Voeg nieuwe remote toe

```bash
# Voor SSH (aanbevolen):
git remote add origin git@github.com:USERNAME/REPO.git

# Of voor HTTPS:
git remote add origin https://github.com/USERNAME/REPO.git
```

**Vervang `USERNAME/REPO` met je eigen repository!**

### Stap 3: Verifieer

```bash
git remote -v
```

Je zou nu de nieuwe URL moeten zien.

### Stap 4: Push alle code

```bash
# Eerst alle wijzigingen committen (als dat nog niet gebeurd is)
git add -A
git commit -m "Add Next.js frontend with contract management system"

# Push naar nieuwe repository
git push -u origin main
```

---

## Belangrijk: Repository moet bestaan!

Zorg ervoor dat de nieuwe repository al bestaat op GitHub:

1. Ga naar GitHub.com
2. Klik op "New repository"
3. Geef het een naam
4. **DON'T** initialiseer met README, .gitignore, of license (we hebben al code)
5. Klik "Create repository"
6. Gebruik de URL die GitHub toont in het script

---

## Als je repository al code heeft

Als de nieuwe repository al code heeft, kun je:

### Optie A: Force push (overschrijf alles)

⚠️ **LET OP:** Dit verwijdert alle bestaande code in de repository!

```bash
git push -u origin main --force
```

### Optie B: Merge met bestaande code

```bash
# Haal bestaande code op
git fetch origin
git branch -u origin/main main

# Merge (als er conflicten zijn, los ze op)
git merge origin/main --allow-unrelated-histories

# Push
git push -u origin main
```

---

## Controleren of het gelukt is

1. Ga naar je nieuwe repository op GitHub
2. Check of alle bestanden er staan:
   - `allesfocusophuur.py`
   - `epc-architecture/` folder
   - `start-all.sh`
   - etc.

3. Check of `.env` files **NIET** zichtbaar zijn (veiligheid!)

---

## Troubleshooting

### "Permission denied (publickey)"
- Je SSH key is niet ingesteld op GitHub
- Gebruik HTTPS URL in plaats van SSH: `https://github.com/USERNAME/REPO.git`

### "Repository not found"
- Check of de repository naam correct is
- Check of je toegang hebt tot de repository
- Check of de repository bestaat

### "Updates were rejected"
- De repository heeft al code en je probeert te pushen zonder force
- Gebruik `--force` (als je zeker weet dat je alles wilt overschrijven)
- Of merge eerst met bestaande code (zie Optie B hierboven)
