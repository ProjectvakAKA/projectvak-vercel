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
ACCESS_TOKEN = 'sl.u.AGOYdFDUC3SrS5aa8dLU8VjNt1bi77ICqCLDnUnzMrpYdNidEMp6k-q5-5A8VUz-KlODDu_oA99IQZQIIdml26skGiLu2N9aeyOd-Um8nQxRZZE0jSzhB6jF620ElDg9pVoISFiGjvEK-__ByeZLqJm8TZj-_jID5RCIIuJ0cBk0kF42pxwXd-woNCNenYaavI1QHPByS-c8opESeX5aY71XkwgH0jgQugzzw354PwuM1Q9z4puJEm_zRHYq0h7x-fDfpwaWIxQUXxoaa6ldPNibzdR6vPjgJThb470_lUDH1WEVph3BpGqF2WmnlOz5Mjgs137gQhM3HT2_SNwjiRsGS6bFpWiy6NPnp883rbjzHBq4Z4LqG__lt6NWO0MNCzKjkUGh3goAk9kvl1RGpU3AX8yGRXO5-oNs2X06m9SizKqOjMFONjbq5lyFzrXLFfLUCfd16syEJinO6Q-W6gFDHLOJ0IVCU4BXwIbLXMGZnWNxGRwFU0rYfBqyxvhLLLDtCdgACbSo-zzlFQlMyTXbAOqlw9svkPAtQ8yb2zgVdgFQ6Yc8ezXO7Rz9IvHtL-uRtbYQGNbbMFXGKecHiJ-HPtQsWPeIdm0z1fmihxAatr5_atdDijIPkoiK7cUbxOx5k4oM0hf9SUTjAhCGU1JbHzX32iNLdLt5rE26UOLGPtKMDoRJ7Lqb7WNzwbcybpbhA-P_-ZYszyjgxb48lka7MQPIj9qeC8YpltnD76afGmD7ezX5IMoqQUoOKmdD9r6ZFpt-uImsRFzlj_qXZFCeKaix7wD9tnp5wj_9SgFmVl2tgcqcTX31KKS58EuxMopdEdEk33eOIvdcMOpP-C2JZRjDhDSElfxZftmOkZUhe7MOcspLlKvSnLE9By20fJ_cwS0c8PhqSE7uP2ZZGxj-RIGLxfTTqrTkZsYoxfW5v6nrHUGDmqLL8XdB94E5o-C-qumxYRgvXVw1kxMu2uQCj07qRaEfOnJV1bG7lDtp6x8178VVRLACqR0xfnyAoqP2U2Fp4k9XaqJ65Xo8k34YAe_FgnFSrYbmASHX1FacmDxH9oJXs-umdAgY6q7ogoXI59JY8dYcsuGMsHLripGXtcMkD9G10TfQiCCyjqSbEnoH_EyUTE4K-Fz6qZ4h3UEgSPC6dOu8YFKKldFd_tF94NLt770iVask9QdYt_8ubPfoehrSVVDvhPijEiYjlfyNMF-hj5Ca9nhnnb8nf7Cz3yQ5B6xV_KkkD9alW5-S9qlcPsWZNX_gK43sHxn7frlQfuRNel3DgsHPLS9Oq7Sx9f2fZaGQQZdctjUR0M17ZIpBYJqWxotti87vvt3x9Lbcqo0qtVRhZgtqP1_A0KVrJZR9TDbGqLuaTPN9Z9wBANVeN_3qRW3EQdlNvA9FzQ1szqFVqKZnje6BkWOZHvl9'

# Als UPLOAD_TO_DIFFERENT_DROPBOX = True, vul dan hieronder een ANDERE token in:
UPLOAD_ACCESS_TOKEN = "sl.u.AGMSRrwr3IR1OSsoGMWse3b39J1aiC-zmp4KhL0PHSN6x8bC21Zx5UIosILMES2m6F1U4CK4QDtxWU8Yk1xPyL64EG5uY1-lGWLJOrj6zJevAvcxZG_Zj3W5hhQ5IWa1PZ94py6T_TA767RoINnq5bXkId3YM_kwcJCQLc72UBPBjfZuQfA5Ebg5YVo0e3mmebes5heVkrdE85X2f7HsC0sf9XkG1kO5UT_u6QsdswVsPFsvM2zpWn2Gb13h1983c_TLOVyL-Zx0eZjO_YuRpKPg-YhLIJULbo_6VeX-jeI4PrGsS8dko5V4Xenwgiknd8UtUSLZBdniZfsa5A-dH_IQilSw-nnBkB6zDHXvFbAdioaDXNebbfJ02hEji2od4tF6zk1N4chZpXSCf8wqnuHjl5oJOsG4PCk4Q0oO9T6JMhQv5eA0EKFIIheM7lv_0jUvC0lsFbZu-ETakp4HIGq_KmBeUMw0zcGUo7sq8oNTtcjJUBROCmAHMZ19pfagcr-DbEMzOihL-b5qfyH07AD4X2MatljcqRg6XWaLT8iEu_Bbi-Z5sy855qNFGcVjYj4ARn-OaJQg46P3XapGfNzuiFf-7ihOEUHwf-XBYa4L7nBKfNquO_Fr3eH1Vb8fstScJ3-tG3OY5qBZKP9eswlHUnvAU8SPnUW77KU6q7e-PzfBitsXSkjWVzdwjS1MdqxuDQ0JwMT7_yWtMlkYbSMO-k2ybO0g6YZ4jfGq3ljJkAuOiCOlH0DIoXn0t6B56y5NllJ245bph6DeUdvWru4IsxlshtBJ217r9Dw7E4C-xE3yMVfyQb5kPK1jVXe9GE8fdQcq503HxbtgLMmHkAk5dHnK3fP8xfgvElq6wONNJO_t3Tr7LPVmV2qiXemsIBd28_9v8cQQx-dlBDra7mzlDQGU1D2r4v_T_2jXVB4KJHKOvJzpz9_M4YsEX1rX4ZVPjE3uAcpSCjOFalQO-oF6IKH_2CsZSfb95aC4_AGFtdSsIol-M9y-leeEMGq3jesdt4lRi7z0soRkgFcEO9O07yBcBCqBCY1rzhbpwCdtqxghHS1MO14sUiIYUyRY3gIFLey44QtiuNhwjRP4HwcY5LPYVYrVQt1rIdE0SnSexFCBPsJ5O9vva2i5YopOMO9yBVI4p_it6WEYnCppyMGBo1Nm06EB8Q5LAQ7t6c31_XZXUnsnVSEhP6tYs8KI_VVn8nr2tIkNycq6fw-KbVNn6BrT24C67QaZOw83E31sUheWWQKJPXfxX97PEfzPEh0Af4pK-atNVRThUL2x0fSmid2V15_8cvt5hhPLtrE6lAPaK3un62TC84HuBXOWiSwO1nkAPwRHZ_860yAds0nVqAXsM3BTYsLuxX9PRXehshKWkw8BeNhlOLkGosaIaVhHx7Nh7qPQM-LXwrNGwsG2CHZJ-cC4TEB0lVNf6LZbmdQgnSn0X1ISjc_ywo8KW7w"
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

        # Dropbox setup
        dbx_s = dropbox.Dropbox(ACCESS_TOKEN)
        dbx_t = dropbox.Dropbox(UPLOAD_ACCESS_TOKEN)

        return client, model_id, dbx_s, dbx_t
    except Exception as e:
        print(f"⚠️ Initialisatiefout: {e}")
        return None, None, None, None


# Initialiseer de clients de eerste keer
genai_client, MODEL_ID, dbx_source, dbx_target = init_clients()


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