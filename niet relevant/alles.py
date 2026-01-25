import dropbox
import pdfplumber
import io
import os
import time
import smtplib
import requests
import fitz  # PyMuPDF voor OCR
from PIL import Image
from datetime import datetime
from google import genai
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ============================================================================
# ⚙️ CONFIGURATIE
# ============================================================================

# Email Configuratie
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "avdocumentenhirb@gmail.com"
SENDER_PASSWORD = "hjri xnha kklc vekj"
RECIPIENT_EMAIL = [
    "alexanderverstraete1@gmail.com",
    "alexander.verstraete@student.kuleuven.be",
    "rednaxelaverstraete1@gmail.com"
]

# Gemini AI
GEMINI_API_KEY = 'AIzaSyCX2UIA04A5l-5B0ZFCt1QySg4BVjSP4Es'

# OCR.space API
OCR_API_KEY = 'K87899142388957'

# Dropbox SOURCE (waar PDFs binnenkomen)
APP_KEY_SOURCE = 'y3us04ou9tharpp'
APP_SECRET_SOURCE = '0udq6k8zxa1nrqz'
REFRESH_TOKEN_SOURCE = '0uiSKksKwKkAAAAAAAAAASk0aCe1nT84Q-3BeC8NvV4-vD4NAzr4T_2VO92Mfu1L'

# Dropbox TARGET (waar samenvattingen naartoe gaan)
APP_KEY_TARGET = 'u31hpk2h2awhvw5'
APP_SECRET_TARGET = 'x259o4mgwtx9qve'
REFRESH_TOKEN_TARGET = 'GIhzDb6aRh8AAAAAAAAAAeDUk7s3cHdK_4RC7Crzv_7LTUG-tX8fSRkqIwMbvZBi'

# Monitor Instellingen
SEARCH_CONFIG = {
    'keywords': ['alexander'],
    'file_extension': '.pdf',
    'start_path': '',
}

CHECK_INTERVAL = 20
HISTORY_FILE = "verwerkt_historie.txt"


# ============================================================================
# 🔍 OCR FUNCTIE (OCR.space API)
# ============================================================================

def ocr_met_api(image_bytes):
    """OCR met gratis OCR.space API - gebruikt bytes in plaats van bestand"""
    try:
        print(f"   📤 Uploaden naar OCR.space...")

        # Comprimeer de afbeelding als JPEG
        img = Image.open(io.BytesIO(image_bytes))

        # Convert naar RGB als nodig
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')

        # Sla op als JPEG met compressie in memory
        jpeg_buffer = io.BytesIO()
        img.save(jpeg_buffer, 'JPEG', quality=85, optimize=True)
        jpeg_buffer.seek(0)

        file_size = len(jpeg_buffer.getvalue())
        print(f"   📦 Bestandsgrootte: {file_size / 1024:.1f} KB")

        # Extra compressie als te groot
        if file_size > 1024 * 1024:
            print(f"   ⚠️  Bestand te groot, extra compressie...")
            jpeg_buffer = io.BytesIO()
            img.save(jpeg_buffer, 'JPEG', quality=70, optimize=True)
            jpeg_buffer.seek(0)
            file_size = len(jpeg_buffer.getvalue())
            print(f"   📦 Nieuwe grootte: {file_size / 1024:.1f} KB")

        response = requests.post(
            'https://api.ocr.space/parse/image',
            files={'file': ('image.jpg', jpeg_buffer, 'image/jpeg')},
            data={
                'apikey': OCR_API_KEY,
                'language': 'dut',  # Nederlands
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
            },
            timeout=60
        )

        result = response.json()

        # Check voor errors
        if result.get('IsErroredOnProcessing'):
            error_msg = result.get('ErrorMessage', ['Unknown error'])
            print(f"   ❌ Error: {error_msg}")
            return ""

        # Haal tekst op
        if result.get('ParsedResults') and len(result['ParsedResults']) > 0:
            tekst = result['ParsedResults'][0]['ParsedText']
            if tekst and len(tekst.strip()) > 0:
                print(f"   ✅ {len(tekst)} karakters gevonden")
                return tekst
            else:
                print(f"   ⚠️  Geen tekst gevonden in resultaat")
                return ""
        else:
            print(f"   ⚠️  Geen ParsedResults in response")
            return ""

    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout - probeer opnieuw")
        return ""
    except Exception as e:
        print(f"   ❌ OCR Error: {e}")
        return ""


def pdf_ocr(pdf_bytes):
    """Converteer PDF naar afbeeldingen en gebruik OCR API"""
    print(f"📸 Start OCR voor gescande PDF...")

    # Open PDF uit bytes
    pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
    tekst = ""

    for pagina_nummer in range(len(pdf_document)):
        print(f"📖 OCR Pagina {pagina_nummer + 1}/{len(pdf_document)}")

        # Converteer naar afbeelding
        pagina = pdf_document[pagina_nummer]
        pix = pagina.get_pixmap(dpi=200)

        # Converteer naar bytes
        img_bytes = pix.tobytes("png")

        # OCR met API
        pagina_tekst = ocr_met_api(img_bytes)

        if pagina_tekst:
            tekst += f"\n\n{'=' * 70}\n"
            tekst += f"PAGINA {pagina_nummer + 1}\n"
            tekst += f"{'=' * 70}\n\n"
            tekst += pagina_tekst
        else:
            tekst += f"\n\n[PAGINA {pagina_nummer + 1} - GEEN TEKST GEVONDEN]\n\n"

        # Kleine pauze tussen requests (API rate limiting)
        if pagina_nummer < len(pdf_document) - 1:
            print(f"   ⏳ Wacht 2 seconden voor rate limiting...")
            time.sleep(2)

    pdf_document.close()
    print(f"✅ OCR compleet: {len(tekst)} karakters geëxtraheerd\n")
    return tekst


# ============================================================================
# 📧 EMAIL FUNCTIE
# ============================================================================

def send_email(subject, body):
    """Verstuur email notificatie"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = ', '.join(RECIPIENT_EMAIL) if isinstance(RECIPIENT_EMAIL, list) else RECIPIENT_EMAIL
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email verzonden: {subject}")
        return True

    except Exception as e:
        print(f"❌ Email fout: {e}")
        return False


def format_file_size(size_bytes):
    """Formatteer bestandsgrootte"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


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


# Initialiseer de clients
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
# 🚀 HOOFDPROGRAMMA - PDF VERWERKING + EMAIL NOTIFICATIE
# ============================================================================

def monitor_dropbox():
    global dbx_source, dbx_target

    print(f"\n🚀 Monitor actief")
    print(f"📁 SOURCE: Monitort voor PDFs met keyword '{SEARCH_CONFIG['keywords']}'")
    ontvangers = ', '.join(RECIPIENT_EMAIL) if isinstance(RECIPIENT_EMAIL, list) else RECIPIENT_EMAIL
    print(f"📁 TARGET: Plaatst samenvattingen en stuurt email naar {ontvangers}")
    print(f"⏱️  Scan interval: {CHECK_INTERVAL} seconden")
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
                            # 1. Download PDF van SOURCE
                            _, resp = dbx_source.files_download(pad)
                            pdf_size = len(resp.content)

                            # 2. Extraheer PDF tekst (met OCR fallback)
                            with io.BytesIO(resp.content) as pdf_file:
                                full_text = ""
                                with pdfplumber.open(pdf_file) as pdf:
                                    for page in pdf.pages:
                                        full_text += (page.extract_text() or "") + "\n"

                            # Check of er tekst gevonden is
                            if len(full_text.strip()) < 20:
                                print("⚠️ Weinig tekst gevonden met pdfplumber, probeer OCR...")
                                # OCR FALLBACK
                                full_text = pdf_ocr(resp.content)
                            else:
                                print(f"✅ {len(full_text)} karakters geëxtraheerd met pdfplumber")

                            # 3. AI Analyse met Retry-logica
                            schon_text = full_text.strip()
                            if len(schon_text) < 20:
                                ai_resultaat = f"Document '{bestandsnaam}' bevat te weinig tekst (ook na OCR)."
                                drie_woorden_titel = "Te weinig tekst"
                            else:
                                prompt = f"Vat dit strikt samen in het Nederlands:\n\n{schon_text[:30000]}"

                                # --- START RETRY LOGICA (NIET AANPASSEN) ---
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
                                            ai_resultaat = f"AI Fout: {ai_e}"
                                            break
                                # --- EINDE RETRY LOGICA ---

                                # Genereer 3-woorden titel
                                print("🔍 Genereer 3-woorden titel...")
                                try:
                                    titel_prompt = f"Geef een titel van EXACT 3 woorden die deze tekst samenvat:\n\n{ai_resultaat[:500]}"
                                    titel_resp = genai_client.models.generate_content(model=MODEL_ID,
                                                                                      contents=titel_prompt)
                                    drie_woorden_titel = titel_resp.text.strip()
                                except:
                                    # Als het mislukt, pak gewoon eerste 3 woorden
                                    woorden = ai_resultaat.split()
                                    drie_woorden_titel = ' '.join(woorden[:3]) if len(woorden) >= 3 else ai_resultaat

                            # 4. Upload samenvatting naar TARGET Dropbox
                            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                            doel_naam = f"/samenvatting_{bestandsnaam.replace('.pdf', '')}_{ts}.txt"

                            dbx_target.files_upload(
                                ai_resultaat.encode('utf-8'),
                                doel_naam,
                                mode=dropbox.files.WriteMode.overwrite
                            )

                            print(f"✅ Samenvatting geüpload naar TARGET: {doel_naam}")

                            # 5. Stuur EMAIL notificatie
                            subject = f"🎉 Nieuw document verwerkt: {bestandsnaam}"

                            # Maak preview (eerste 200 karakters van samenvatting)
                            preview = ai_resultaat[:200] + "..." if len(ai_resultaat) > 200 else ai_resultaat

                            body = f"""🎉 Goed nieuws! Er is een nieuw document verwerkt en klaar voor jou!

Je document is door onze AI geanalyseerd en samengevat. Hieronder vind je alle details.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 IN 3 WOORDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{drie_woorden_titel}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 ORIGINEEL DOCUMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bestand: {bestandsnaam}
Grootte: {format_file_size(pdf_size)}
Locatie: Dropbox SOURCE{pad}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 SAMENVATTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bestand: {doel_naam}
Grootte: {format_file_size(len(ai_resultaat.encode('utf-8')))}
Locatie: Dropbox TARGET

Preview:
{preview}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Verwerkt op: {datetime.now().strftime('%Y-%m-%d om %H:%M:%S')}

🔗 Open in Dropbox: https://www.dropbox.com/home{doel_naam}
"""

                            if send_email(subject, body):
                                print(f"✅ Email notificatie verzonden!")
                            else:
                                print(f"⚠️ Email kon niet verzonden worden")

                            # 6. Opslaan in historie
                            voeg_toe_aan_historie(pad)
                            print(f"✅ Volledig verwerkt: {bestandsnaam}\n")

                        except Exception as e:
                            print(f"❌ Fout bij verwerken van {bestandsnaam}: {e}")

            if not gevonden_nieuw:
                tijd = datetime.now().strftime('%H:%M:%S')
                print(f"[{tijd}] Scan voltooid: geen nieuwe documenten.", end="\r")

        except Exception as e:
            print(f"\n⚠️ Verbindingsfout of Dropbox hik: {e}")
            print("🔄 Herstellen van verbinding over 10 seconden...")
            time.sleep(10)
            # Herinitialiseer clients
            _, _, dbx_source, dbx_target = init_clients()

        # Wachten tot de volgende ronde
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    monitor_dropbox()