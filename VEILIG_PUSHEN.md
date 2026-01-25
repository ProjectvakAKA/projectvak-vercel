# 🔒 Veilig Pushen - Stap voor Stap

## Wat dit doet:
- ✅ Behoudt ALLE bestaande code in de repository
- ✅ Voegt alleen je `alexander/` folder toe
- ✅ Maakt een backup voor veiligheid

## Stappen:

### 1. Ga naar je project folder:
```bash
cd /Users/alexanderverstraete/projectvak/ProjectvakAKA.github.io
```

### 2. Check wat er al gecommit is:
```bash
git status
```

Je zou moeten zien dat `alexander/` folder al toegevoegd is.

### 3. Haal bestaande code op (VEILIG):
```bash
git fetch origin
```

### 4. Merge met bestaande code (behoudt alles):
```bash
git merge origin/main --allow-unrelated-histories -m "Add alexander folder to repository"
```

Als er conflicten zijn:
```bash
# Check welke bestanden conflicteren
git status

# Voor elk conflict: behoud remote versie (bestaande code)
# Maar behoud onze alexander/ folder
git checkout --theirs <bestand-buiten-alexander>
git checkout --ours alexander/

# Voeg alles toe
git add .

# Commit
git commit -m "Merge: Add alexander folder, keep existing files"
```

### 5. Push naar GitHub:
```bash
git push -u origin main
```

## Als je GitHub authenticatie nodig hebt:

### Optie A: SSH (aanbevolen)
```bash
# Check of je SSH key hebt
ls -la ~/.ssh/id_rsa.pub

# Als je geen SSH key hebt, maak er een:
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Voeg toe aan GitHub:
cat ~/.ssh/id_rsa.pub
# Kopieer de output en voeg toe in GitHub Settings > SSH Keys
```

Dan verander de remote naar SSH:
```bash
git remote set-url origin git@github.com:Arthur-Code-123/HIRBProjectvak.git
```

### Optie B: Personal Access Token
1. Ga naar GitHub.com > Settings > Developer settings > Personal access tokens
2. Maak een nieuwe token met `repo` permissions
3. Gebruik de token als wachtwoord bij push

## Resultaat:

Na het pushen:
- ✅ Alle bestaande code blijft staan
- ✅ Je `alexander/` folder is toegevoegd
- ✅ Team kan alles zien en gebruiken

## Troubleshooting:

### "Permission denied"
- Gebruik SSH of Personal Access Token (zie hierboven)

### "Merge conflicts"
- Volg de stappen hierboven om conflicten op te lossen
- Belangrijk: behoud bestaande bestanden, voeg alleen alexander/ toe

### "Remote branch does not exist"
- Dan kun je direct pushen zonder merge:
```bash
git push -u origin main
```
