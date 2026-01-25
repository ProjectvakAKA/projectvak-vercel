import dropbox
import pdfplumber
import io
import os
import time
from datetime import datetime
from google import genai

# ============================================================================
# ⚙️ CONFIGURATIE
# ============================================================================
GEMINI_API_KEY = 'AIzaSyCX2UIA04A5l-5B0ZFCt1QySg4BVjSP4Es'

# Dropbox Refresh Tokens - VUEL DEZE IN NA HET OPHALEN
APP_KEY_SOURCE = 'y3us04ou9tharpp'
APP_SECRET_SOURCE = '0udq6k8zxa1nrqz'
REFRESH_TOKEN_SOURCE = '0uiSKksKwKkAAAAAAAAAASk0aCe1nT84Q-3BeC8NvV4-vD4NAzr4T_2VO92Mfu1L'
REFRESH_TOKEN_TARGET = 'GIhzDb6aRh8AAAAAAAAAAeDUk7s3cHdK_4RC7Crzv_7LTUG-tX8fSRkqIwMbvZBi'
APP_KEY_TARGET = 'u31hpk2h2awhvw5'  # Van TARGET app - MOET VERSCHILLEND ZIJN!
APP_SECRET_TARGET = 'x259o4mgwtx9qve'

SEARCH_CONFIG = {
    'keywords': ['alexander'],
    'file_extension': '.pdf',
    'start_path': '',
}

CHECK_INTERVAL = 20
HISTORY_FILE = "verwerkt_historie.txt"


# ============================================================================
# 🛠️ INITIALISATIE CLIENTS
# ============================================================================

def init_clients():
    """Initialiseert alle verbindingen (Gemini + Dropbox)"""
    try:
        # Gemini setup
        client = genai.Client(api_key=GEMINI_API_KEY, http_options={'api_version': 'v1'})
        modellen = [m.name.replace('models/', '') for m in client.models.list()]
        model_id = "gemini-1.5-flash" if "gemini-1.5-flash" in modellen else modellen[0]

        # Dropbox setup met REFRESH TOKENS
        dbx_s = dropbox.Dropbox(
            app_key=APP_KEY_SOURCE,
            app_secret=APP_SECRET_SOURCE,
            oauth2_refresh_token=REFRESH_TOKEN_SOURCE
        )

        dbx_t = dropbox.Dropbox(
            app_key=APP_KEY_TARGET,
            app_secret=APP_SECRET_TARGET,
            oauth2_refresh_token=REFRESH_TOKEN_TARGET
        )

        return client, model_id, dbx_s, dbx_t
    except Exception as e:
        print(f"⚠️ Initialisatiefout: {e}")
        return None, None, None, None


# Initialiseer de clients de eerste keer
genai_client, MODEL_ID, dbx_source, dbx_target = init_clients()
# Debug check
if dbx_source is None or dbx_target is None:
    print("❌ FOUT: Dropbox clients zijn niet geïnitialiseerd!")
    print("Check je APP_KEY, APP_SECRET en REFRESH_TOKENS")
    exit()
else:
    print("✅ Beide Dropbox verbindingen succesvol!")
    try:
        acc1 = dbx_source.users_get_current_account()
        acc2 = dbx_target.users_get_current_account()
        print(f"✅ SOURCE: {acc1.name.display_name}")
        print(f"✅ TARGET: {acc2.name.display_name}")
    except Exception as e:
        print(f"❌ Connectie test mislukt: {e}")
        exit()


# ============================================================================
# 🧠 HISTORIE LOGICA
# ============================================================================

def laad_historie():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return set(f.read().splitlines())
    return set()


def voeg_toe_aan_historie(pad):
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(pad + "\n")


# ============================================================================
# 🚀 DE VERBETERDE MONITOR LUS (VANGT 404 & VERBINDINGSFOUTEN OP)
# ============================================================================
def monitor_dropbox():
    global dbx_source, dbx_target  # Om clients te kunnen herstarten bij fouten

    print(f"\n🚀 Monitor actief. Ik scan elke {CHECK_INTERVAL} seconden...")
    print("Druk op Ctrl+C om te stoppen.\n")

    while True:
        try:
            verwerkt = laad_historie()
            gevonden_nieuw = False

            # Scan de bron-Dropbox
            result = dbx_source.files_list_folder(SEARCH_CONFIG['start_path'], recursive=True)

            for entry in result.entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    pad = entry.path_display
                    bestandsnaam = entry.name

                    # Check criteria
                    if bestandsnaam.lower().endswith(SEARCH_CONFIG['file_extension'].lower()) and \
                            any(k.lower() in bestandsnaam.lower() for k in SEARCH_CONFIG['keywords']) and \
                            pad not in verwerkt:

                        gevonden_nieuw = True
                        print(f"\n🆕 Nieuw bestand gevonden: {bestandsnaam}")

                        try:
                            # 1. Download
                            _, resp = dbx_source.files_download(pad)

                            # 2. PDF tekst
                            with io.BytesIO(resp.content) as pdf_file:
                                full_text = ""
                                with pdfplumber.open(pdf_file) as pdf:
                                    for page in pdf.pages:
                                        full_text += (page.extract_text() or "") + "\n"

                            # 3. AI Analyse met Retry-logica voor Quota
                            schon_text = full_text.strip()
                            if len(schon_text) < 20:
                                ai_resultaat = f"Document '{bestandsnaam}' bevat te weinig tekst."
                            else:
                                prompt = f"Vat dit strikt samen in het Nederlands:\n\n{schon_text[:30000]}"

                                # --- START RETRY LOGICA ---
                                pogingen = 0
                                succes_ai = False
                                while not succes_ai and pogingen < 3:
                                    try:
                                        ai_resp = genai_client.models.generate_content(model=MODEL_ID, contents=prompt)
                                        ai_resultaat = ai_resp.text
                                        succes_ai = True
                                    except Exception as ai_e:
                                        if "429" in str(ai_e):
                                            print(f"⏳ AI Limiet bereikt. Ik wacht 35 seconden voor {bestandsnaam}...")
                                            time.sleep(35)
                                            pogingen += 1
                                        else:
                                            # Bij andere AI fouten stoppen we deze poging
                                            ai_resultaat = f"AI Fout: {ai_e}"
                                            break
                                            # --- EINDE RETRY LOGICA ---

                            # 4. Uploaden naar Doel-Dropbox
                            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                            doel_naam = f"/samenvatting_{bestandsnaam.replace('.pdf', '')}_{ts}.txt"

                            dbx_target.files_upload(
                                ai_resultaat.encode('utf-8'),
                                doel_naam,
                                mode=dropbox.files.WriteMode.overwrite
                            )

                            # 5. Opslaan in historie
                            voeg_toe_aan_historie(pad)
                            print(f"✅ Klaar! Samenvatting staat op Dropbox B: {doel_naam}")

                        except Exception as e:
                            print(f"❌ Fout bij verwerken van {bestandsnaam}: {e}")

            if not gevonden_nieuw:
                tijd = datetime.now().strftime('%H:%M:%S')
                print(f"[{tijd}] Scan voltooid: geen nieuwe documenten.", end="\r")

        except Exception as e:
            # Vangt netwerkfouten op (zoals RemoteDisconnected)
            print(f"\n⚠️ Verbindingsfout of Dropbox hik: {e}")
            print("🔄 Herstellen van verbinding over 10 seconden...")
            time.sleep(10)
            # Herinitialiseer clients
            _, _, dbx_source, dbx_target = init_clients()

        # Wachten tot de volgende ronde
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    monitor_dropbox()