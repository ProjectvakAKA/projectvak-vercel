import dropbox
import pdfplumber
import io
import os
import time
from datetime import datetime
from google import genai

# ============================================================================
# ⚙️ CONFIGURATIE - JOUW INSTELLINGEN
# ============================================================================
GEMINI_API_KEY = 'AIzaSyBe-j76KoiH74V86RxkhVPF2imxZk7Ldw0'
ACCESS_TOKEN = 'sl.u.AGPj7IsrZVtau8kuZhwZuYxCd5UBC0wcrRS2wcm-UZepxpwqZ1Fi3Gsckx-HnMC3F4ffCkMpSlUJB7ZfGTV-EKBK9UtsZzFVJ8RerP26-Zwg6PFxEWasWVzyHdfkK7JvWv-UjnJjY9VYLfpeX4_Ldc2YSVtHoVHpG-XZ4jZ5itqx9JXFC7iGY4OskjqzoMHS6uOBgxP3puqFMZydCtr1Ot5rH-MdzDiPiJrPFt12IxjpMu8pXfaqmIxFtG_G6cFGODOMjxoVlMZYiA6hlHcDaAPxYOmknjepjwvUrRLgcHo4mmeMxCFiHOzCQNaE2wZuDFssBQu1J8MSnWLRKbFynEUrierY5dq2b3tX9WjrtaiAR_mXQrOOagkg-98TRbLVDkLpcsiBDv1qwvM2yzN0_7JBI66aoTLC7eTp_U_ApfSE_mIw8vS3R67upNw0Q5YWxg6qGPUQ9_Og_fWe_RDyQeeLDH7O-_i8DTuRI2TfSsr1nRGZIV9INC1bWIH5F5Opvcv4fKumSMMWVtrpp8dFsBw_TXKhDl7eSBx7uzni4wEXXruN2Xdub1drx3ARS2pBjQigqJFO7xaWa4xRJmFT93F6J1wsNp0DEGj2SaD3h6Ic6smrEFJvQ-W1G3f1YHxTRCoeIWLpopXFRh1JNNV5GfwgO93FKL3Mq_fW9jGgGUNdo7b89fWEPQ6CP_3h8g0lkIX9OutsoCjcjkZazq3Xsaqw2yTKtgR_NC_4O-ywIhWg5SEk6Heak8_86fulGE4KNmlZl5K24Xl-aOHupphd-jHqXD3fkHpSMB7E00C3j59VK77TPd5_vTxWbgVzYlrmM8A-Wv6A4PW3voUL13943mHOrmIYRwS-M6xMMiWw2K3clsIegTRBBp8ayGNPhx0IyDNHCo6l1ET3H925fP3zBUYeVO7FaPqqIjTOcpu6E8tarrTHugXBvxEr3leOeJevgp6qqvJCQUGBraS8bjugdVY3jV51yq8nLdWP7z30-e2HlICXA5oG1tBehtW5U-y4BNBTVMXS8Gm6L5_MaBoQu2otoQg_2yhHIRXQS0PnDAR0Lq43xXFCaRLLJvWmBG7NgCPH0i4SPV_9m1cUw7iZBW4iHsQ3e3sy4bFUXIpKdwefFjmhe0ItRLMMqSfSzmV08GnVK0tpYK0b3gFKkcriBlbtLiF4f-R354di4-NDULXDbRqdSTCZYUuXrRSAzcGGrTu5jGordyeqfcWKtoOSuFZEi1JgjcEi4dgCFNcHLPuOz1XZmzf2_eV3Q5Gr_mSWhkQ4NoOLcL2GNsG0ElE1h74KiWiuamWaoJ1PjzhT-rCU5HqpvOzbl8iUC36fupLgSAwhtKsrmhT8Fg_uZe58klXhv3iz3JJizHBLBPDkPlfQ_5njkrgwofSLUZh_-vYHelw48seOSWSV9iejn01pmYXy'



# Als UPLOAD_TO_DIFFERENT_DROPBOX = True, vul dan hieronder een ANDERE token in:
UPLOAD_ACCESS_TOKEN = 'sl.u.AGOtJQDOkoaPjeFh69uHxWkBSO2r6I-zSPwyeIsL4ZG6y-VTURfZTjL5a0lmMuyTWMZzHqQEMDUroIP0lxzod32dHO9MHoG1FooYN5MzV4LWDMCdohdQNC8vkS1ea0jN5kbVtounf76TaiCH58SKcNBD9LyW032AZNVDZqioP-InQAec79d_016a1nsoNYLVr_rz-avDfE8hjfp_7wS4FIcUQvHtK9Q-Ko0hqecfabwt9lRtZforB6ClqL2r1Y0Z5XD-PFYNE1vTuRtaalelHMlwdkx1JeSSc-6i0FxYHJyPr7MuXU11LsLjvIWl-ZYk2rymWSJZTpHMk_iqJcCWZfr3g6YM31QsCY--JBP0eEzQeo3UcrcAY5s7MLp1VghKQgwX_lyitMnnCS0lukQGkoyoTcf4qFOXd4nWip-v3gjNC1R7zXSTJ01yFZGzuMNNTap5LVYvjrVvD5C875V6Vt4RuwsBxUaOwaJ4aWsi1BSs1e6eOTPr4JwwoSRfw52xDc28ggmCHfW_D9LWjzkj9tFum1uOe3ZxP8bYG88vvanjh9qzoZeeU4QtV2CEdzTriJRwZPrkdRWHtHb7dV6_OT-vojBj64W8aOHj5E220Bf0AMeMEJ-UW4v0NMFv6MuS0MZqc43YCz1dlKnpatIInaHg3ab38M7iPVEO5qdvwGwv3tpCe3PHx0PmmSOZ_kQnqscp3DCjq7ccLlQERQkbWmz3Cb3fhEe-aWZe9WvKihuv6lixfJWwZy0GUMdYpVwp8q9Pss49ZP-wJzs9tnuxScsw5vveusZciXuqGVZO1GkseItXalf0Mlfizxxi_qs7eCxokCmI3tRGeYDRcipe8w2eCdqrRhq_acC35CcF_jfXHgH9qUNhZcG4KjWAMDKawaVWvjG_3SqihmemAWQQsOLC5kSyi3j6NY7Jt2OQUTOxv8hf681AUQ7Dcb_FBn6yxjp6BNg49_odDJLP0UdiL1K3OXptl5tiUuRYinyA-CmoTCv6Wsbb38DROF3-k_aZM85AmQdjw1YuimFVmShUPTvIZCwnJmR2DFKfp6Ln2hT-uuRi-u4QtiTkpnd9-cfxALE_dkjxGrzUC-9NnJD46-UmRTfLMv9ZfnLhmDRQJAKLIjTTYqkB2C7yvD3vsVBB3upnzCQBDq8YGwj7bALtyUoldX24UIKeHDroE0488D-wcyb_yBL1FvBf8i6NGy_gDNlkVm9nRlhSy1jHovgMxW-JNBusWpnmRNEnhtYiVKW73xt8EBbeDN46Qrg0Ve5ZwSAJpYZuoqL_8jWzCcvvofItf_7Cztmvaqmok1kBxKcwV-XtGjcHGCv0WoFFTWcNUNH_LNsxBT85iMbra9pdwHK2oNz9QowVQKWZjqrxDchDzrHWSo0JZezZzbNZVe9b5B5zLKUAQcWxi5u_hY0xg9fWbl_K8jn395sJNImj7i84miPGNcQ8J3BOQ2OSwZsyYuY'


SEARCH_CONFIG = {
    'keywords': ['vak'],
    'file_extension': '.pdf',
    'start_path': '',
}

# Hoe vaak moet hij checken? (in seconden)
CHECK_INTERVAL = 60
HISTORY_FILE = "verwerkt_historie.txt"

# ============================================================================
# 🛠️ INITIALISATIE
# ============================================================================

try:
    client = genai.Client(api_key=GEMINI_API_KEY, http_options={'api_version': 'v1'})
    # Automatische modelselectie om 404 te voorkomen
    modellen = [m.name.replace('models/', '') for m in client.models.list()]
    MODEL_ID = "gemini-1.5-flash" if "gemini-1.5-flash" in modellen else modellen[0]
    print(f"✅ Gemini verbonden ({MODEL_ID})")
except Exception as e:
    print(f"⚠️ Gemini Fout: {e}")

try:
    dbx_source = dropbox.Dropbox(ACCESS_TOKEN)
    dbx_target = dropbox.Dropbox(UPLOAD_ACCESS_TOKEN)
    print("✅ Dropbox bron & doel verbonden")
except Exception as e:
    print(f"⚠️ Dropbox Fout: {e}")


# ============================================================================
# 🧠 HISTORIE LOGICA (VOORKOMT DUBBEL WERK)
# ============================================================================

def laad_historie():
    """Leest welke bestanden al gedaan zijn."""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return set(f.read().splitlines())
    return set()


def voeg_toe_aan_historie(pad):
    """Slaat op dat een bestand verwerkt is."""
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(pad + "\n")


# ============================================================================
# 🚀 DE VERWERKINGS-LUS
# ============================================================================

def monitor_dropbox():
    print(f"\n🚀 Monitor actief. Ik scan elke {CHECK_INTERVAL} seconden...")
    print("Druk op Ctrl+C om te stoppen.\n")

    while True:
        verwerkt = laad_historie()
        gevonden_nieuw = False

        try:
            # 1. Scan de bron-Dropbox
            result = dbx_source.files_list_folder(SEARCH_CONFIG['start_path'], recursive=True)

            for entry in result.entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    pad = entry.path_display
                    bestandsnaam = entry.name

                    # Check criteria: extensie, keyword en NIET verwerkt
                    if bestandsnaam.lower().endswith(SEARCH_CONFIG['file_extension'].lower()) and \
                            any(k.lower() in bestandsnaam.lower() for k in SEARCH_CONFIG['keywords']) and \
                            pad not in verwerkt:

                        gevonden_nieuw = True
                        print(f"🆕 Nieuw bestand gevonden: {bestandsnaam}")

                        # 2. Verwerken (Downloaden & PDF tekst)
                        try:
                            _, resp = dbx_source.files_download(pad)
                            with io.BytesIO(resp.content) as pdf_file:
                                full_text = ""
                                with pdfplumber.open(pdf_file) as pdf:
                                    for page in pdf.pages:
                                        full_text += (page.extract_text() or "") + "\n"

                            # 3. AI Analyse (Strenge Prompt)
                            schon_text = full_text.strip()
                            if len(schon_text) < 20:
                                ai_resultaat = f"Inhoud van '{bestandsnaam}' is te kort voor analyse."
                            else:
                                prompt = f"""Vat dit document strikt samen in het Nederlands. 
                                Gebruik ALLEEN de verstrekte tekst. Verzin niets.

                                TEKST:
                                {schon_text[:30000]}"""

                                ai_resp = client.models.generate_content(model=MODEL_ID, contents=prompt)
                                ai_resultaat = ai_resp.text

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
                            print(f"✅ Samenvatting succesvol naar doel-Dropbox: {doel_naam}")

                        except Exception as e:
                            print(f"❌ Fout bij verwerken van {bestandsnaam}: {e}")

            if not gevonden_nieuw:
                # Laat zien dat het script nog draait
                tijd = datetime.now().strftime('%H:%M:%S')
                print(f"[{tijd}] Scan voltooid: geen nieuwe documenten.", end="\r")

        except Exception as e:
            print(f"\n⚠️ Fout tijdens het scannen van Dropbox: {e}")

        # Wachten tot de volgende ronde
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    monitor_dropbox()