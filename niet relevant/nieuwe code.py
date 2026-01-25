import dropbox
import pdfplumber
import io
import os
import time
import smtplib
import json
import base64
import re
from datetime import datetime, timedelta
from google import genai
from google.genai import types
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import fitz

# ============================================================================
# CONFIGURATIE
# ============================================================================

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "avdocumentenhirb@gmail.com"
SENDER_PASSWORD = "hjri xnha kklc vekj"
RECIPIENT_EMAIL = ["alexanderverstraete1@gmail.com"]

GEMINI_API_KEY = 'AIzaSyBf5ZVOFYZyVHy10DFQoG8DptojDSQlejw'  # Vervang dit met je nieuwe key

APP_KEY_SOURCE = 'y3us04ou9tharpp'
APP_SECRET_SOURCE = '0udq6k8zxa1nrqz'
REFRESH_TOKEN_SOURCE = '0uiSKksKwKkAAAAAAAAAASk0aCe1nT84Q-3BeC8NvV4-vD4NAzr4T_2VO92Mfu1L'

APP_KEY_TARGET = 'u31hpk2h2awhvw5'
APP_SECRET_TARGET = 'x259o4mgwtx9qve'
REFRESH_TOKEN_TARGET = 'GIhzDb6aRh8AAAAAAAAAAeDUk7s3cHdK_4RC7Crzv_7LTUG-tX8fSRkqIwMbvZBi'

SEARCH_CONFIG = {
    'keywords': ['alexander'],
    'file_extension': '.pdf',
    'start_path': '',
}

CHECK_INTERVAL = 20
HISTORY_FILE = "verwerkt_historie.txt"
CSV_LOG_PATH = "/verwerking_log.csv"
TARGET_CONFIDENCE = 95

# Performance settings
GEMINI_RETRY_WAIT = 10  # Seconden tussen retries (was 35)
GEMINI_MAX_RETRIES = 2  # Max pogingen (was 3)

# Quota management
QUOTA_EXCEEDED_WAIT = 3600  # Wacht 1 uur bij quota overschrijding
FAILED_QUEUE_FILE = "failed_pdfs.txt"  # PDFs die later opnieuw geprobeerd worden

# ============================================================================
# DOCUMENT TYPES
# ============================================================================

DOCUMENT_TYPES = {
    'huurcontract': {
        'keywords': ['huur', 'verhuur', 'huurder', 'verhuurder', 'huurovereenkomst'],
        'required': ['partijen', 'financieel', 'periodes', 'onderwerp'],
    },
    'verkoopakte': {
        'keywords': ['verkoop', 'koop', 'koper', 'verkoper', 'koopakte', 'notaris'],
        'required': ['partijen', 'financieel', 'onderwerp'],
    },
    'epc': {
        'keywords': ['energieprestatie', 'epc', 'energielabel', 'energiecertificaat'],
        'required': ['datum', 'onderwerp'],
    },
    'conformiteitsattest': {
        'keywords': ['conformiteit', 'attest', 'keuring', 'elektrisch', 'gas'],
        'required': ['datum', 'onderwerp'],
    },
    'verhuurvergunning': {
        'keywords': ['verhuurvergunning', 'vergunning verhuren'],
        'required': ['datum', 'onderwerp', 'partijen'],
    },
    'factuur': {
        'keywords': ['factuur', 'btw', 'factuurnummer'],
        'required': ['datum', 'financieel', 'partijen'],
    },
    'taxatieverslag': {
        'keywords': ['taxatie', 'schatting', 'waardering'],
        'required': ['datum', 'financieel', 'onderwerp'],
    },
    'plaatsbeschrijving': {
        'keywords': ['plaatsbeschrijving', 'staat van het goed'],
        'required': ['datum', 'partijen', 'onderwerp'],
    }
}


# ============================================================================
# UTILITIES
# ============================================================================

def format_file_size(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def laad_historie():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return set(f.read().splitlines())
    return set()


def voeg_toe_aan_historie(pad):
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(pad + "\n")


def add_to_failed_queue(pad, naam):
    """Voeg PDF toe aan wachtrij voor later opnieuw proberen"""
    with open(FAILED_QUEUE_FILE, "a", encoding="utf-8") as f:
        f.write(f"{pad}|{naam}|{datetime.now().isoformat()}\n")
    print(f"Toegevoegd aan wachtrij voor later: {naam}")


def load_failed_queue():
    """Laad PDFs die eerder gefaald zijn"""
    if not os.path.exists(FAILED_QUEUE_FILE):
        return []

    with open(FAILED_QUEUE_FILE, "r", encoding="utf-8") as f:
        items = []
        for line in f:
            parts = line.strip().split("|")
            if len(parts) == 3:
                items.append({"pad": parts[0], "naam": parts[1], "timestamp": parts[2]})
        return items


def clear_failed_queue():
    """Wis wachtrij"""
    if os.path.exists(FAILED_QUEUE_FILE):
        os.remove(FAILED_QUEUE_FILE)


def is_quota_error(error_msg):
    """Check of error een quota error is"""
    error_str = str(error_msg).lower()
    return "429" in error_str or "quota" in error_str or "resource_exhausted" in error_str


def send_email(subject, body):
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = ', '.join(RECIPIENT_EMAIL)
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        print(f"Email verzonden")
        return True
    except Exception as e:
        print(f"Email fout: {e}")
        return False


# ============================================================================
# CSV LOGGING - GEFIXED
# ============================================================================

def ensure_csv_exists():
    """Zorg dat CSV bestaat, maak aan als nodig"""
    try:
        dbx_target.files_get_metadata(CSV_LOG_PATH)
        return True
    except dropbox.exceptions.ApiError as e:
        if e.error.is_path() and e.error.get_path().is_not_found():
            # CSV bestaat niet, maak aan
            header = 'timestamp,filename,document_type,confidence_score,needs_review,text_length,fields_complete,issues,warnings,json_path,txt_path,processing_status\n'
            try:
                dbx_target.files_upload(
                    header.encode('utf-8'),
                    CSV_LOG_PATH,
                    mode=dropbox.files.WriteMode.overwrite
                )
                print("CSV log aangemaakt")
                return True
            except Exception as ex:
                print(f"CSV aanmaken fout: {ex}")
                return False
        else:
            print(f"CSV check fout: {e}")
            return False


def log_to_csv(filename, result, json_path, txt_path, status="success"):
    """Voeg regel toe aan CSV - robuust"""
    try:
        # Zorg dat CSV bestaat
        if not ensure_csv_exists():
            print("Kan CSV niet vinden/aanmaken - skip logging")
            return False

        # Download huidige CSV
        try:
            _, response = dbx_target.files_download(CSV_LOG_PATH)
            current_csv = response.content.decode('utf-8')
        except Exception as e:
            print(f"CSV download fout: {e}")
            return False

        # Parse resultaat
        conf = result.get('confidence', {})

        # Maak nieuwe regel
        new_row = [
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            filename,
            result.get('title', 'Onbekend'),
            str(conf.get('score', 0)),
            'Ja' if conf.get('needs_review', True) else 'Nee',
            str(conf.get('metrics', {}).get('text_length', 0)),
            f"{conf.get('metrics', {}).get('completeness', 0):.0%}",
            '; '.join(conf.get('issues', [])) or 'Geen',
            '; '.join(conf.get('warnings', [])) or 'Geen',
            json_path or '',
            txt_path or '',
            status
        ]

        # Escape quotes en maak CSV regel
        new_row = [f'"{str(field).replace('"', '""')}"' for field in new_row]
        new_line = ','.join(new_row) + '\n'

        # Append en upload
        updated_csv = current_csv + new_line
        dbx_target.files_upload(
            updated_csv.encode('utf-8'),
            CSV_LOG_PATH,
            mode=dropbox.files.WriteMode.overwrite
        )

        return True

    except Exception as e:
        print(f"CSV logging fout: {e}")
        return False


# ============================================================================
# INITIALISATIE
# ============================================================================

def init_clients():
    try:
        # Laat SDK automatisch de beste API versie kiezen
        client = genai.Client(api_key=GEMINI_API_KEY)

        # List beschikbare modellen en filter alleen generative modellen
        all_models = client.models.list()
        generative_models = []

        for m in all_models:
            model_name = m.name.replace('models/', '')
            # Filter alleen Gemini modellen die generateContent supporten
            if 'gemini' in model_name.lower() and 'embedding' not in model_name.lower():
                generative_models.append(model_name)

        print(f"Beschikbare modellen: {generative_models}")

        # Probeer modellen in volgorde van voorkeur
        preferred_models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
        model_id = None

        for pref in preferred_models:
            if pref in generative_models:
                model_id = pref
                break

        # Als geen preferred gevonden, pak eerste Gemini model
        if not model_id and generative_models:
            model_id = generative_models[0]

        # Fallback naar hardcoded
        if not model_id:
            model_id = 'gemini-1.5-flash-latest'

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
        print(f"Initialisatie fout: {e}")
        return None, None, None, None


genai_client, MODEL, dbx_source, dbx_target = init_clients()

if not all([genai_client, MODEL, dbx_source, dbx_target]):
    print("FOUT: Clients niet geinitialiseerd")
    exit()

print(f"Systeem klaar - Model: {MODEL}")
ensure_csv_exists()
print()


# ============================================================================
# PDF TEKST EXTRACTIE
# ============================================================================

def pdf_naar_images(pdf_bytes, max_pages=10):
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        num_pages = min(len(pdf_document), max_pages)

        for i in range(num_pages):
            pix = pdf_document[i].get_pixmap(dpi=200)
            img_base64 = base64.b64encode(pix.tobytes("png")).decode('utf-8')
            images.append(img_base64)

        pdf_document.close()
        return images
    except Exception as e:
        print(f"Image conversie fout: {e}")
        return []


def extract_text_vision(images):
    try:
        prompt = "Extract all text from these images. Include handwritten text if present. Return only the text."
        parts = [types.Part(text=prompt)]

        for img in images:
            parts.append(types.Part(inline_data=types.Blob(mime_type="image/png", data=img)))

        content = types.Content(parts=parts)

        for attempt in range(GEMINI_MAX_RETRIES):
            try:
                response = genai_client.models.generate_content(model=MODEL, contents=[content])
                return response.text
            except Exception as e:
                if "429" in str(e) and attempt < GEMINI_MAX_RETRIES - 1:
                    print(f"Rate limit - wacht {GEMINI_RETRY_WAIT}s...")
                    time.sleep(GEMINI_RETRY_WAIT)
                else:
                    raise e
        return ""
    except Exception as e:
        print(f"Vision OCR fout: {e}")
        return ""


# ============================================================================
# DOCUMENT TYPE DETECTIE
# ============================================================================

def detect_document_type(full_text, ai_suggestion):
    text_lower = full_text.lower()
    scores = {}

    for doc_type, config in DOCUMENT_TYPES.items():
        score = sum(1 for keyword in config['keywords'] if keyword in text_lower)
        scores[doc_type] = score

    keyword_best = max(scores, key=scores.get) if scores else None
    keyword_score = scores.get(keyword_best, 0)

    ai_lower = ai_suggestion.lower() if ai_suggestion else ''

    for doc_type in DOCUMENT_TYPES.keys():
        if doc_type in ai_lower and scores.get(doc_type, 0) > 0:
            return doc_type, True

    if keyword_score >= 3:
        return keyword_best, True

    if keyword_score >= 1:
        return keyword_best, False

    return 'onbekend', False


# ============================================================================
# DATA EXTRACTIE - GEOPTIMALISEERD
# ============================================================================

def extract_contract_data(full_text):
    try:
        prompt = f"""Extract structured data from this document in JSON format.

For any contract/document extract:
- document_type: what type of document (huurcontract, verkoopakte, epc, factuur, etc.)
- datum: date
- partijen: all parties involved (names, roles, contact info)
- onderwerp: subject matter (address, property description)
- financieel: any amounts, prices, costs
- periodes: dates, durations, deadlines
- belangrijke_punten: key points or clauses

Return ONLY valid JSON, no explanation.
Use null for missing fields.

TEXT:
{full_text[:30000]}

JSON:"""

        for attempt in range(GEMINI_MAX_RETRIES):
            try:
                response = genai_client.models.generate_content(model=MODEL, contents=prompt)
                raw = response.text.strip()

                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]
                    raw = raw.strip()

                return json.loads(raw)

            except json.JSONDecodeError:
                if attempt == GEMINI_MAX_RETRIES - 1:
                    return {"error": "JSON parse failed"}
            except Exception as e:
                error_msg = str(e)

                # Check quota error
                if is_quota_error(error_msg):
                    return {"error": "QUOTA_EXCEEDED", "details": error_msg}

                # Andere rate limit
                if "429" in error_msg and attempt < GEMINI_MAX_RETRIES - 1:
                    print(f"Rate limit - wacht {GEMINI_RETRY_WAIT}s...")
                    time.sleep(GEMINI_RETRY_WAIT)
                else:
                    return {"error": error_msg}

        return {"error": "Max retries"}
    except Exception as e:
        return {"error": str(e)}


def generate_summary(full_text, doc_type):
    try:
        prompt = f"""Summarize this {doc_type} document in Dutch.

Be concise and factual. Include:
- Document type
- Main parties
- Key points
- Important amounts and dates

Max 150 words.

TEXT:
{full_text[:20000]}

SAMENVATTING:"""

        for attempt in range(GEMINI_MAX_RETRIES):
            try:
                response = genai_client.models.generate_content(model=MODEL, contents=prompt)
                return response.text.strip()
            except Exception as e:
                error_msg = str(e)

                # Check quota error
                if is_quota_error(error_msg):
                    return f"QUOTA_EXCEEDED: {error_msg}"

                if "429" in error_msg and attempt < GEMINI_MAX_RETRIES - 1:
                    print(f"Rate limit - wacht {GEMINI_RETRY_WAIT}s...")
                    time.sleep(GEMINI_RETRY_WAIT)
                else:
                    return f"Samenvatting mislukt: {e}"

        return "Samenvatting mislukt"
    except Exception as e:
        return f"Error: {e}"


# ============================================================================
# CONFIDENCE BEREKENING
# ============================================================================

def calculate_confidence(contract_data, full_text, doc_type, type_verified):
    try:
        score = 100
        issues = []
        warnings = []

        if "error" in contract_data:
            return {
                "score": 0,
                "needs_review": True,
                "details": f"Extractie fout: {contract_data['error']}",
                "issues": [contract_data['error']],
                "warnings": [],
                "metrics": {}
            }

        if not type_verified:
            score -= 10
            warnings.append("Document type niet geverifieerd")

        text_length = len(full_text.strip())
        if text_length < 100:
            score -= 40
            issues.append(f"Te weinig tekst ({text_length} chars)")
        elif text_length < 500:
            score -= 15
            warnings.append(f"Weinig tekst ({text_length} chars)")

        ocr_errors = len(re.findall(r'[^\w\s\.,!?;:()\-€$%°²³·•–—""''…/]', full_text))
        ocr_ratio = ocr_errors / max(text_length, 1)

        if ocr_ratio > 0.15:
            score -= 15
            issues.append(f"Veel OCR-fouten ({ocr_ratio:.1%})")
        elif ocr_ratio > 0.08:
            score -= 5
            warnings.append("Mogelijke OCR-fouten")

        if doc_type in DOCUMENT_TYPES:
            config = DOCUMENT_TYPES[doc_type]
            for field in config['required']:
                if not contract_data.get(field):
                    score -= 20
                    issues.append(f"Verplicht veld '{field}' ontbreekt voor {doc_type}")
                elif contract_data.get(field) in [None, "", [], {}]:
                    score -= 10
                    issues.append(f"Veld '{field}' is leeg")
        else:
            if not contract_data.get('document_type'):
                score -= 15
                issues.append("Document type ontbreekt")
            if not contract_data.get('partijen'):
                score -= 15
                warnings.append("Partijen ontbreken")

        all_fields = ['datum', 'partijen', 'onderwerp', 'financieel', 'periodes', 'belangrijke_punten']
        filled = sum(1 for f in all_fields if contract_data.get(f))
        completeness = filled / len(all_fields)

        if completeness == 1.0:
            score = min(100, score + 5)
        elif completeness < 0.3:
            score -= 15
            issues.append(f"Weinig data ({filled}/{len(all_fields)} velden)")
        elif completeness < 0.5:
            score -= 8
            warnings.append(f"Matige compleetheid ({filled}/{len(all_fields)} velden)")

        if contract_data.get('datum'):
            datum_str = str(contract_data['datum']).lower()
            has_valid_date = bool(re.search(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}', datum_str))
            has_dutch_date = bool(re.search(
                r'\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}',
                datum_str))

            if not (has_valid_date or has_dutch_date):
                score -= 5
                warnings.append("Datum ongewoon formaat")

        if contract_data.get('financieel'):
            fin_data = contract_data['financieel']
            has_amounts = False

            if isinstance(fin_data, dict):
                for key, value in fin_data.items():
                    key_lower = str(key).lower()
                    if isinstance(value, (int, float)) and value > 0:
                        if any(term in key_lower for term in ['euro', 'eur', 'prijs', 'bedrag', 'kost', 'waarde']):
                            has_amounts = True
                            break
                if not has_amounts:
                    has_amounts = bool(re.search(r'\d+', str(fin_data)))
            elif isinstance(fin_data, str):
                has_amounts = bool(re.search(r'[€$]\s*\d+|[\d.,]+\s*(?:euro|eur)', fin_data.lower()))

            if not has_amounts:
                score -= 5
                warnings.append("Geen bedragen gedetecteerd in financieel veld")

        for key, value in contract_data.items():
            if isinstance(value, str):
                if value.lower() in ['onbekend', 'n/a', 'niet gevonden', 'unknown', 'none']:
                    score -= 3
                    warnings.append(f"Placeholder in veld '{key}'")

        score = max(0, min(100, score))
        needs_review = score < TARGET_CONFIDENCE or len(issues) > 0

        detail_parts = []
        if issues:
            detail_parts.append(f"PROBLEMEN: {'; '.join(issues)}")
        if warnings:
            detail_parts.append(f"Waarschuwingen: {'; '.join(warnings)}")
        if not issues and not warnings:
            detail_parts.append("Geen problemen")

        return {
            "score": score,
            "needs_review": needs_review,
            "details": " | ".join(detail_parts),
            "issues": issues,
            "warnings": warnings,
            "metrics": {
                "completeness": completeness,
                "text_length": text_length,
                "special_char_ratio": ocr_ratio
            }
        }

    except Exception as e:
        return {
            "score": 0,
            "needs_review": True,
            "details": f"Controle fout: {e}",
            "issues": [str(e)],
            "warnings": [],
            "metrics": {}
        }


# ============================================================================
# PDF PROCESSING
# ============================================================================

def process_pdf(bestandsnaam, pdf_bytes):
    try:
        print(f"Verwerken: {bestandsnaam}")
        start_time = time.time()

        full_text = ""
        with io.BytesIO(pdf_bytes) as pdf_file:
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    full_text += (page.extract_text() or "") + "\n"

        print(f"Tekst: {len(full_text)} chars")

        if len(full_text.strip()) < 100:
            print("Gebruik Vision OCR...")
            images = pdf_naar_images(pdf_bytes)
            if images:
                full_text = extract_text_vision(images)
                print(f"OCR: {len(full_text)} chars")

        if len(full_text.strip()) < 50:
            return {"success": False, "error": "Te weinig tekst"}

        contract_data = extract_contract_data(full_text)

        # Check quota error in extractie
        if contract_data.get('error') == 'QUOTA_EXCEEDED':
            return {
                "success": True,  # Technisch wel success (tekst extracted)
                "quota_error": True,
                "data": contract_data,
                "filename": bestandsnaam
            }

        ai_type = contract_data.get('document_type', '')
        doc_type, type_verified = detect_document_type(full_text, ai_type)
        summary = generate_summary(full_text, doc_type)

        # Check quota error in summary
        if "QUOTA_EXCEEDED" in summary:
            return {
                "success": True,
                "quota_error": True,
                "data": {"error": "QUOTA_EXCEEDED"},
                "filename": bestandsnaam
            }

        confidence = calculate_confidence(contract_data, full_text, doc_type, type_verified)
        processing_time = time.time() - start_time

        print(f"Verwerkt in {processing_time:.1f}s - Score: {confidence['score']}%")

        return {
            "success": True,
            "filename": bestandsnaam,
            "title": doc_type.title(),
            "type_verified": type_verified,
            "full_text": full_text,
            "data": contract_data,
            "summary": summary,
            "confidence": confidence,
            "processing_time": processing_time
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================================
# SAVE & EMAIL
# ============================================================================

def save_results(result, bestandsnaam):
    try:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        base = bestandsnaam.replace('.pdf', '')

        json_data = {
            "filename": result['filename'],
            "document_type": result['title'],
            "type_verified": result['type_verified'],
            "processed": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "confidence": result['confidence'],
            "data": result['data'],
            "summary": result['summary']
        }

        json_file = f"/data_{base}_{ts}.json"
        dbx_target.files_upload(
            json.dumps(json_data, indent=2, ensure_ascii=False).encode('utf-8'),
            json_file,
            mode=dropbox.files.WriteMode.overwrite
        )

        conf = result['confidence']
        rapport = f"""VERWERKINGSRAPPORT
{'=' * 70}

Document: {bestandsnaam}
Type: {result['title']}
Verwerkt: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

KWALITEITSCONTROLE
{'=' * 70}
Betrouwbaarheidsscore: {conf['score']}%
Status: {'REVIEW VEREIST' if conf['needs_review'] else 'GOEDGEKEURD'}
{conf['details']}

SAMENVATTING
{'=' * 70}
{result['summary']}

GEËXTRAHEERDE DATA
{'=' * 70}
{json.dumps(result['data'], indent=2, ensure_ascii=False)}

STATISTIEKEN
{'=' * 70}
Tekstlengte: {conf['metrics'].get('text_length', 0)} karakters
Compleetheid: {conf['metrics'].get('completeness', 0):.0%}
Verwerkingstijd: {result.get('processing_time', 0):.2f} seconden
"""

        txt_file = f"/rapport_{base}_{ts}.txt"
        dbx_target.files_upload(
            rapport.encode('utf-8'),
            txt_file,
            mode=dropbox.files.WriteMode.overwrite
        )

        return json_file, txt_file

    except Exception as e:
        print(f"Opslaan fout: {e}")
        return None, None


def create_email(result, bestandsnaam, pdf_size, json_file, txt_file):
    conf = result['confidence']

    if conf['score'] >= TARGET_CONFIDENCE and not conf['needs_review']:
        status_section = f"""STATUS
Betrouwbaarheidsscore: {conf['score']}%
Beoordeling: Goedgekeurd
"""
    else:
        status_section = f"""STATUS
Betrouwbaarheidsscore: {conf['score']}%
Beoordeling: Review vereist

AANDACHTSPUNTEN
{conf['details']}
"""

    return f"""Geachte,

Bijgaand treft u de geautomatiseerde analyse aan van het volgende document:

DOCUMENT INFORMATIE
Bestandsnaam: {bestandsnaam}
Type: {result['title']}
Grootte: {format_file_size(pdf_size)}
Verwerkingsdatum: {datetime.now().strftime('%d-%m-%Y %H:%M')}

{status_section}
BESTANDEN
Gestructureerde data: {json_file}
Volledige rapport: {txt_file}

SAMENVATTING
{result['summary']}

TOEGANG
De verwerkte bestanden zijn beschikbaar in uw Dropbox target folder.
Raadpleeg het volledige rapport voor gedetailleerde informatie.

Deze analyse is automatisch gegenereerd. Gelieve de gegevens te controleren.

Met vriendelijke groet,
Geautomatiseerd Documentverwerkingssysteem
"""


# ============================================================================
# MONITOR
# ============================================================================

def monitor_dropbox():
    print(f"Monitoring actief - Keywords: {SEARCH_CONFIG['keywords']}")
    print(f"Target confidence: {TARGET_CONFIDENCE}%\n")

    quota_exhausted_until = None

    while True:
        try:
            # Check of quota nog steeds exhausted is
            if quota_exhausted_until and datetime.now() < quota_exhausted_until:
                remaining = (quota_exhausted_until - datetime.now()).seconds
                print(f"Quota exhausted - wacht nog {remaining}s...", end="\r")
                time.sleep(60)  # Check elke minuut
                continue

            # Reset quota flag
            if quota_exhausted_until and datetime.now() >= quota_exhausted_until:
                print("\nQuota reset tijd bereikt - hervat verwerking")
                quota_exhausted_until = None

            verwerkt = laad_historie()
            result = dbx_source.files_list_folder(SEARCH_CONFIG['start_path'], recursive=True)

            for entry in result.entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    pad = entry.path_display
                    naam = entry.name

                    if (naam.lower().endswith('.pdf') and
                            any(k.lower() in naam.lower() for k in SEARCH_CONFIG['keywords']) and
                            pad not in verwerkt):

                        print(f"\n{'=' * 70}")
                        print(f"Nieuw: {naam}")
                        print(f"{'=' * 70}")

                        json_file = None
                        txt_file = None
                        status = "failed"

                        try:
                            _, resp = dbx_source.files_download(pad)
                            result = process_pdf(naam, resp.content)

                            # Check quota error
                            if result and result.get('quota_error'):
                                print("\n" + "=" * 70)
                                print("GEMINI API QUOTA BEREIKT")
                                print("=" * 70)
                                print("Dagelijkse limiet van 20 requests bereikt.")
                                print(f"PDF toegevoegd aan wachtrij: {naam}")
                                print("\nOplossingen:")
                                print("1. Upgrade naar betaalde API: https://aistudio.google.com/app/apikey")
                                print("2. Wacht tot morgen (quota reset)")
                                print(f"\nScript wacht {QUOTA_EXCEEDED_WAIT // 60} minuten en probeert opnieuw...")
                                print("=" * 70)

                                add_to_failed_queue(pad, naam)
                                quota_exhausted_until = datetime.now() + timedelta(seconds=QUOTA_EXCEEDED_WAIT)
                                break  # Stop processing meer PDFs

                            # Normale verwerking
                            if result and result.get('success') and not result.get('quota_error'):
                                json_file, txt_file = save_results(result, naam)

                                if json_file and txt_file:
                                    subject = f"Document verwerkt: {result['title']} - {naam}"
                                    body = create_email(result, naam, len(resp.content), json_file, txt_file)
                                    send_email(subject, body)

                                    voeg_toe_aan_historie(pad)
                                    status = "success"

                                    if result['confidence']['needs_review']:
                                        print("Review vereist")
                                else:
                                    status = "save_failed"
                            else:
                                status = "processing_failed"
                                print(f"Fout: {result.get('error')}")

                            # Log alleen als er geen quota error was
                            if result and result.get('success') and not result.get('quota_error'):
                                log_to_csv(naam, result, json_file, txt_file, status)

                        except Exception as e:
                            print(f"Fout: {e}")
                            status = "error"

            print(f"[{datetime.now().strftime('%H:%M:%S')}] Scan compleet", end="\r")

        except Exception as e:
            print(f"\nVerbindingsfout: {e}")
            time.sleep(10)

        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    monitor_dropbox()