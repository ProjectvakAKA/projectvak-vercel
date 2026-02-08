# Gemini API-keys – waar staan ze?

Alle keys staan **in één bestand**: **`.env` in de projectroot** (de map waar `package.json` en `alexander/` staan).

## Organiseren (21 keys, rotatie 15 calls/key/24u)

Deze variabelen worden gebruikt door de **organize**-stap (classificatie van documenten). Vul ze in in `.env`:

```
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
GEMINI_API_KEY_4=
GEMINI_API_KEY_5=
GEMINI_API_KEY_6=
GEMINI_API_KEY_7=
GEMINI_API_KEY_8=
GEMINI_API_KEY_9=
GEMINI_API_KEY_10=
GEMINI_API_KEY_11=
GEMINI_API_KEY_12=
GEMINI_API_KEY_13=
GEMINI_API_KEY_14=
GEMINI_API_KEY_15=
GEMINI_API_KEY_16=
GEMINI_API_KEY_17=
GEMINI_API_KEY_18=
GEMINI_API_KEY_19=
GEMINI_API_KEY_20=
GEMINI_API_KEY_21=
```

**Optioneel:** als je maar één key wilt gebruiken voor organiseren, vul dan `GEMINI_API_KEY_ORGANIZE=` in; dan worden KEY_1…21 niet gebruikt.

## Analyseren (1 key)

Voor de **analyse**-stap (extractie uit huurcontracten, EPC, enz.) wordt één key gebruikt:

```
GEMINI_API_KEY_ANALYZE=
```

---

**Samenvatting:** open **`.env`** in de projectroot – daar staan alle 21 organize-keys en de analyze-key samen. Zie ook **`.env.example`** in de projectroot voor de exacte variabelnamen.
