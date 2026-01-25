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
from typing import Any, Dict, List, Optional, Union

# ============================================================================
# CONFIGURATIE
# ============================================================================

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "u3620920171@gmail.com"
SENDER_PASSWORD = "pjgx qxri ljse augw "
RECIPIENT_EMAIL = ["alexanderverstraete1@gmail.com"]

GEMINI_API_KEY = 'AIzaSyA5Pv6m53SPmH1g4V9XENxseGICYon22Lg'

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

GEMINI_RETRY_WAIT = 10
GEMINI_MAX_RETRIES = 2
QUOTA_EXCEEDED_WAIT = 3600
FAILED_QUEUE_FILE = "failed_pdfs.txt"


# ============================================================================
# ENHANCED CONTRACT NORMALIZER - GUARANTEED CONSISTENT OUTPUT
# ============================================================================

class ContractNormalizer:
    """Normalizer that outputs format matching document 2 (website compatible)"""

    def normalize(self, raw_data: dict) -> dict:
        """Returns contract_data structure exactly like document 2"""
        try:
            contract_data = self._unwrap_data(raw_data)
            if "error" in contract_data:
                return {"error": contract_data["error"]}

            return {
                "contract_type": self._normalize_contract_type(contract_data),
                "datum_contract": self._normalize_datum(contract_data),
                "partijen": self._normalize_partijen_flat(contract_data),
                "pand": self._normalize_pand_flat(contract_data),
                "financieel": self._normalize_financieel_flat(contract_data),
                "periodes": self._normalize_periodes_flat(contract_data),
                "voorwaarden": self._normalize_voorwaarden_flat(contract_data),
                "juridisch": self._normalize_juridisch_flat(contract_data)
            }
        except Exception as e:
            return {"error": f"Normalization failed: {str(e)}"}

    def _unwrap_data(self, raw_data: dict) -> dict:
        return raw_data.get('contract_data') or raw_data.get('data') or raw_data.get('extracted_data') or raw_data

    def _safe_get(self, obj: Any, *keys: str, default: Any = None) -> Any:
        for key in keys:
            if isinstance(obj, dict):
                obj = obj.get(key)
            else:
                return default
            if obj is None:
                return default
        return obj if obj != "" else default

    def _extract_number(self, value: Any) -> Optional[float]:
        if value is None or value == "":
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            clean = re.sub(r'[€$£\s]', '', value).replace(',', '.')
            match = re.search(r'[\d.]+', clean)
            if match:
                try:
                    return float(match.group(0))
                except ValueError:
                    pass
        return None

    def _normalize_boolean(self, value: Any) -> Optional[bool]:
        if value is None or value == "":
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lower = value.lower().strip()
            if lower in ['true', 'ja', 'yes', 'toegestaan', '1']:
                return True
            if lower in ['false', 'nee', 'no', 'verboden', '0']:
                return False
        return None

    def _normalize_date(self, value: Any) -> Optional[str]:
        """Returns date in YYYY-MM-DD format"""
        if not value or value == "N/A":
            return None
        if isinstance(value, str):
            for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d']:
                try:
                    dt = datetime.strptime(value.strip(), fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
        return str(value) if value else None

    def _normalize_contract_type(self, data: dict) -> str:
        ct = self._safe_get(data, 'contract_type') or self._safe_get(data, 'document_type') or self._safe_get(data,
                                                                                                              'type')
        return ct.lower() if ct else 'huurovereenkomst'

    def _normalize_datum(self, data: dict) -> Optional[str]:
        date_value = self._safe_get(data, 'datum_contract') or self._safe_get(data, 'datum') or self._safe_get(data,
                                                                                                               'contract_datum')
        return self._normalize_date(date_value)

    def _normalize_partijen_flat(self, data: dict) -> dict:
        """Returns flat partijen matching document 2: verhuurder + single huurder object"""
        partijen_data = self._safe_get(data, 'partijen', default={})

        # Verhuurder
        verhuurder = self._safe_get(partijen_data, 'verhuurder', default={})
        if isinstance(verhuurder, str):
            verhuurder = {"naam": verhuurder}

        # Collect all huurders
        huurders_list = []
        if 'huurders' in partijen_data and isinstance(partijen_data['huurders'], list):
            huurders_list = partijen_data['huurders']
        elif 'huurder' in partijen_data:
            h = partijen_data['huurder']
            if isinstance(h, dict):
                huurders_list = [h]
            elif isinstance(h, str):
                huurders_list = [{"naam": h}]

        # Combine names and use first huurder's contact details
        huurder_namen = []
        first_huurder = {}
        for h in huurders_list:
            if isinstance(h, dict):
                naam = self._safe_get(h, 'naam')
                if naam:
                    huurder_namen.append(naam)
                if not first_huurder:
                    first_huurder = h

        combined_naam = " & ".join(huurder_namen) if huurder_namen else ""

        return {
            "verhuurder": {
                "naam": self._safe_get(verhuurder, 'naam') or "",
                "adres": self._safe_get(verhuurder, 'adres') or self._safe_get(verhuurder, 'zetel') or "",
                "telefoon": self._safe_get(verhuurder, 'telefoon') or "",
                "email": self._safe_get(verhuurder, 'email') or self._safe_get(verhuurder, 'e-mail') or ""
            },
            "huurder": {
                "naam": combined_naam or "",
                "adres": self._safe_get(first_huurder, 'adres') or self._safe_get(first_huurder, 'woonplaats') or "",
                "telefoon": self._safe_get(first_huurder, 'telefoon') or self._safe_get(first_huurder, 'gsm') or "",
                "email": self._safe_get(first_huurder, 'email') or self._safe_get(first_huurder, 'e-mail') or ""
            }
        }

    def _normalize_pand_flat(self, data: dict) -> dict:
        """Returns flat pand matching document 2"""
        pand = self._safe_get(data, 'pand') or self._safe_get(data, 'onderwerp') or {}

        # Extract address as simple string
        adres_raw = self._safe_get(pand, 'adres', default={})
        if isinstance(adres_raw, dict):
            volledig = self._safe_get(adres_raw, 'volledig_adres') or self._safe_get(adres_raw, 'volledig')
            if not volledig:
                parts = []
                straat = self._safe_get(adres_raw, 'straat')
                nummer = self._safe_get(adres_raw, 'nummer')
                if straat or nummer:
                    parts.append(f"{straat or ''} {nummer or ''}".strip())
                postcode = self._safe_get(adres_raw, 'postcode')
                stad = self._safe_get(adres_raw, 'stad')
                if postcode or stad:
                    parts.append(f"{postcode or ''} {stad or ''}".strip())
                volledig = ", ".join(parts) if parts else ""
            adres_str = volledig
        else:
            adres_str = str(adres_raw) if adres_raw else ""

        # EPC
        epc_data = self._safe_get(pand, 'epc') or {}
        if isinstance(epc_data, str):
            epc_data = {"label": epc_data}

        # Kadaster
        kadaster = self._safe_get(pand, 'kadaster') or {}
        ki = self._extract_number(self._safe_get(kadaster, 'kadastraal_inkomen') or self._safe_get(kadaster, 'ki'))

        return {
            "adres": adres_str,
            "type": self._safe_get(pand, 'type') or self._safe_get(pand, 'type_woning') or "appartement",
            "oppervlakte": self._extract_number(
                self._safe_get(pand, 'oppervlakte') or self._safe_get(pand, 'totale_bewoonbare_oppervlakte')),
            "aantal_kamers": self._extract_number(
                self._safe_get(pand, 'aantal_kamers') or self._safe_get(pand, 'kamers')),
            "verdieping": self._extract_number(self._safe_get(pand, 'verdieping')),
            "epc": {
                "energielabel": self._safe_get(epc_data, 'energielabel') or self._safe_get(epc_data, 'label') or "",
                "certificaatnummer": self._safe_get(epc_data, 'certificaatnummer') or self._safe_get(epc_data,
                                                                                                     'nummer') or ""
            },
            "kadaster": {
                "afdeling": self._safe_get(kadaster, 'afdeling') or "",
                "sectie": self._safe_get(kadaster, 'sectie') or "",
                "nummer": self._safe_get(kadaster, 'nummer') or self._safe_get(kadaster, 'perceelnummer') or "",
                "kadastraal_inkomen": ki
            }
        }

    def _normalize_financieel_flat(self, data: dict) -> dict:
        """Returns flat financieel matching document 2"""
        financieel = self._safe_get(data, 'financieel', default={})

        # Huurprijs - simple number
        huurprijs_raw = self._safe_get(financieel, 'huurprijs') or self._safe_get(financieel, 'maandelijkse_huurprijs')
        if isinstance(huurprijs_raw, dict):
            huurprijs_raw = self._safe_get(huurprijs_raw, 'bedrag')
        huurprijs = self._extract_number(huurprijs_raw)

        # Waarborg - simple structure with waar_gedeponeerd
        waarborg_raw = self._safe_get(financieel, 'waarborg') or self._safe_get(financieel, 'huurwaarborg') or {}
        if isinstance(waarborg_raw, (int, float)):
            waarborg_raw = {"bedrag": waarborg_raw}

        waarborg_bedrag = self._extract_number(self._safe_get(waarborg_raw, 'bedrag'))

        # Build waar_gedeponeerd string
        waar_parts = []
        bank = self._safe_get(waarborg_raw, 'bank_naam') or self._safe_get(waarborg_raw, 'bank')
        iban = self._safe_get(waarborg_raw, 'iban')
        waar_gedeponeerd_raw = self._safe_get(waarborg_raw, 'waar_gedeponeerd')

        if waar_gedeponeerd_raw:
            waar_gedeponeerd = waar_gedeponeerd_raw
        elif bank or iban:
            if bank:
                waar_parts.append(bank)
            if iban:
                waar_parts.append(f"(rekening {iban})")
            waar_gedeponeerd = " ".join(waar_parts)
        else:
            waar_gedeponeerd = ""

        # Kosten - build descriptive string
        kosten_raw = self._safe_get(financieel, 'kosten')
        if kosten_raw:
            kosten = str(kosten_raw)
        else:
            gem_kosten = self._safe_get(financieel, 'gemeenschappelijke_kosten', default={})
            if isinstance(gem_kosten, dict):
                inbegrepen_items = self._safe_get(gem_kosten, 'inbegrepen', default=[])
                if inbegrepen_items:
                    items_text = []
                    for item in inbegrepen_items:
                        if isinstance(item, dict):
                            post = self._safe_get(item, 'post')
                            if post:
                                items_text.append(post)
                    if items_text:
                        kosten = f"Gemeenschappelijke kosten ({', '.join(items_text)}) zijn inbegrepen in de huurprijs."
                    else:
                        kosten = "Gemeenschappelijke kosten inbegrepen."
                else:
                    kosten = ""
            else:
                kosten = ""

        # Indexatie
        indexatie = self._normalize_boolean(
            self._safe_get(financieel, 'indexatie') or self._safe_get(financieel, 'indexering'))

        return {
            "huurprijs": huurprijs,
            "waarborg": {
                "bedrag": waarborg_bedrag,
                "waar_gedeponeerd": waar_gedeponeerd
            },
            "kosten": kosten,
            "indexatie": indexatie
        }

    def _normalize_periodes_flat(self, data: dict) -> dict:
        """Returns flat periodes matching document 2"""
        periodes = self._safe_get(data, 'periodes', default={})

        # Dates
        ingangsdatum = self._normalize_date(
            self._safe_get(periodes, 'ingangsdatum') or self._safe_get(periodes, 'aanvang') or self._safe_get(periodes,
                                                                                                              'start')
        )
        einddatum = self._normalize_date(
            self._safe_get(periodes, 'einddatum') or self._safe_get(periodes, 'einde')
        )

        # Duur - keep as string like "9 jaar"
        duur = self._safe_get(periodes, 'duur') or self._safe_get(periodes, 'contract_type_duur') or self._safe_get(
            periodes, 'looptijd') or ""

        # Opzegtermijn - build descriptive string
        opzegtermijn_raw = self._safe_get(periodes, 'opzegtermijn')
        opzegtermijn_huurder = self._safe_get(periodes, 'opzegtermijn_huurder')
        opzegtermijn_verhuurder = self._safe_get(periodes, 'opzegtermijn_verhuurder')

        if opzegtermijn_raw:
            opzegtermijn = str(opzegtermijn_raw)
        else:
            parts = []
            if opzegtermijn_huurder:
                parts.append(f"{opzegtermijn_huurder} (huurder)")
            if opzegtermijn_verhuurder:
                parts.append(f"{opzegtermijn_verhuurder} (verhuurder)")
            opzegtermijn = "; ".join(parts) if parts else ""

        return {
            "ingangsdatum": ingangsdatum,
            "einddatum": einddatum,
            "duur": duur,
            "opzegtermijn": opzegtermijn
        }

    def _normalize_voorwaarden_flat(self, data: dict) -> dict:
        """Returns flat voorwaarden matching document 2"""
        voorwaarden = self._safe_get(data, 'voorwaarden', default={})

        # Huisdieren - boolean
        huisdieren_raw = self._safe_get(voorwaarden, 'huisdieren')
        if isinstance(huisdieren_raw, dict):
            huisdieren = self._normalize_boolean(self._safe_get(huisdieren_raw, 'toegestaan'))
        else:
            huisdieren = self._normalize_boolean(huisdieren_raw)

        # Onderverhuur - boolean
        onderverhuur = self._normalize_boolean(self._safe_get(voorwaarden, 'onderverhuur'))

        # Werken - descriptive string
        werken = self._safe_get(voorwaarden, 'werken') or ""

        return {
            "huisdieren": huisdieren,
            "onderverhuur": onderverhuur,
            "werken": werken
        }

    def _normalize_juridisch_flat(self, data: dict) -> dict:
        """Returns flat juridisch matching document 2"""
        juridisch = self._safe_get(data, 'juridisch', default={})

        return {
            "toepasselijk_recht": self._safe_get(juridisch, 'toepasselijk_recht') or "",
            "bevoegde_rechtbank": self._safe_get(juridisch, 'bevoegde_rechtbank') or ""
        }


normalizer = ContractNormalizer()


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
    with open(FAILED_QUEUE_FILE, "a", encoding="utf-8") as f:
        f.write(f"{pad}|{naam}|{datetime.now().isoformat()}\n")
    print(f"Toegevoegd aan wachtrij: {naam}")


def is_quota_error(error_msg):
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
# CSV LOGGING
# ============================================================================

def ensure_csv_exists():
    try:
        dbx_target.files_get_metadata(CSV_LOG_PATH)
        return True
    except dropbox.exceptions.ApiError as e:
        if e.error.is_path() and e.error.get_path().is_not_found():
            header = 'timestamp,filename,document_type,confidence_score,needs_review,text_length,fields_complete,issues,warnings,json_path,processing_status\n'
            try:
                dbx_target.files_upload(header.encode('utf-8'), CSV_LOG_PATH, mode=dropbox.files.WriteMode.overwrite)
                print("CSV log aangemaakt")
                return True
            except Exception as ex:
                print(f"CSV aanmaken fout: {ex}")
                return False
        else:
            print(f"CSV check fout: {e}")
            return False


def log_to_csv(filename, result, json_path, status="success"):
    try:
        if not ensure_csv_exists():
            print("Kan CSV niet vinden/aanmaken - skip logging")
            return False
        try:
            _, response = dbx_target.files_download(CSV_LOG_PATH)
            current_csv = response.content.decode('utf-8')
        except Exception as e:
            print(f"CSV download fout: {e}")
            return False
        conf = result.get('confidence', {})
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
            status
        ]
        new_row = [f'"{str(field).replace('"', '""')}"' for field in new_row]
        new_line = ','.join(new_row) + '\n'
        updated_csv = current_csv + new_line
        dbx_target.files_upload(updated_csv.encode('utf-8'), CSV_LOG_PATH, mode=dropbox.files.WriteMode.overwrite)
        return True
    except Exception as e:
        print(f"CSV logging fout: {e}")
        return False


# ============================================================================
# INITIALISATIE
# ============================================================================

def init_clients():
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        all_models = client.models.list()
        generative_models = []
        for m in all_models:
            model_name = m.name.replace('models/', '')
            if 'gemini' in model_name.lower() and 'embedding' not in model_name.lower():
                generative_models.append(model_name)
        print(f"Beschikbare modellen: {generative_models}")
        preferred_models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
        model_id = None
        for pref in preferred_models:
            if pref in generative_models:
                model_id = pref
                break
        if not model_id and generative_models:
            model_id = generative_models[0]
        if not model_id:
            model_id = 'gemini-1.5-flash-latest'
        dbx_s = dropbox.Dropbox(app_key=APP_KEY_SOURCE, app_secret=APP_SECRET_SOURCE,
                                oauth2_refresh_token=REFRESH_TOKEN_SOURCE)
        dbx_t = dropbox.Dropbox(app_key=APP_KEY_TARGET, app_secret=APP_SECRET_TARGET,
                                oauth2_refresh_token=REFRESH_TOKEN_TARGET)
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

DOCUMENT_TYPES = {
    'huurcontract': {
        'keywords': ['huur', 'verhuur', 'huurder', 'verhuurder', 'huurovereenkomst'],
        'required': ['partijen', 'financieel', 'periodes', 'onderwerp'],
    },
    'verkoopakte': {
        'keywords': ['verkoop', 'koop', 'koper', 'verkoper', 'koopakte', 'notaris'],
        'required': ['partijen', 'financieel', 'onderwerp'],
    },
}


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
# DATA EXTRACTIE
# ============================================================================

def extract_contract_data(full_text):
    try:
        prompt = f"""Extract ALL relevant data from this rental contract in JSON format.

        USE THESE EXACT FIELD NAMES (lowercase):

        {{
          "contract_type": "huurovereenkomst",
          "datum_contract": "2025-03-18",
          "partijen": {{
            "verhuurder": {{
              "naam": "Company Name",
              "adres": "Full address",
              "telefoon": "Phone",
              "email": "email@example.com"
            }},
            "huurder": {{
              "naam": "Person Name",
              "adres": "Full address", 
              "telefoon": "Phone",
              "email": "email@example.com"
            }}
          }},
          "pand": {{
            "adres": "Streetname 123, 2000 City",
            "type": "appartement",
            "oppervlakte": 97,
            "aantal_kamers": 3,
            "verdieping": 4,
            "epc": {{
              "energielabel": "A",
              "certificaatnummer": "20241008-0009876-00000045"
            }},
            "kadaster": {{
              "afdeling": "4e afdeling",
              "sectie": "B",
              "nummer": "2567/04D",
              "kadastraal_inkomen": 1245.0
            }}
          }},
          "financieel": {{
            "huurprijs": 1150.0,
            "waarborg": {{
              "bedrag": 3450.0,
              "waar_gedeponeerd": "Belfius (rekening BE88 0639 8765 4321)"
            }},
            "kosten": "Gemeenschappelijke kosten inbegrepen. Privélasten apart.",
            "indexatie": true,
            "gemeenschappelijke_kosten": {{
              "inbegrepen": ["Verwarming", "Lift", "Schoonmaak"]
            }}
          }},
          "periodes": {{
            "ingangsdatum": "2025-05-01",
            "einddatum": null,
            "duur": "9 jaar",
            "opzegtermijn_huurder": "3 maanden",
            "opzegtermijn_verhuurder": "6 maanden"
          }},
          "voorwaarden": {{
            "huisdieren": true,
            "onderverhuur": false,
            "werken": "Description of allowed modifications"
          }},
          "juridisch": {{
            "toepasselijk_recht": "Vlaams Woninghuurdecreet",
            "bevoegde_rechtbank": "Vrederechter X"
          }}
        }}

        CRITICAL RULES:
        1. Use LOWERCASE field names: "partijen" NOT "PARTIJEN", "pand" NOT "PAND/ONDERWERP"
        2. For multiple huurders: combine names with " & " in ONE huurder object
        3. Numbers as numbers: huurprijs: 1150.0 (not "€1150" or string)
        4. Dates as "YYYY-MM-DD": ingangsdatum: "2025-05-01" (not "1 mei 2025")
        5. Booleans: true/false (not "ja"/"nee" or strings)
        6. waar_gedeponeerd: combine bank + IBAN in ONE string
        7. Keep opzegtermijn_huurder and opzegtermijn_verhuurder SEPARATE
        8. If not found: use null

        Extract from this text:
        {full_text[:30000]}

        Return ONLY JSON (no markdown, no ```):"""
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
                if is_quota_error(error_msg):
                    return {"error": "QUOTA_EXCEEDED", "details": error_msg}
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

def calculate_confidence_normalized(normalized_data, full_text, doc_type, type_verified):
    try:
        score = 100
        issues = []
        warnings = []

        if "error" in normalized_data:
            return {
                "score": 0,
                "needs_review": True,
                "details": f"Normalisatie fout: {normalized_data['error']}",
                "issues": [normalized_data['error']],
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

        # Check critical fields
        critical_fields = {
            'Huurprijs': normalized_data.get('financieel', {}).get('huurprijs'),
            'Ingangsdatum': normalized_data.get('periodes', {}).get('ingangsdatum'),
            'Verhuurder': normalized_data.get('partijen', {}).get('verhuurder', {}).get('naam'),
            'Huurder': normalized_data.get('partijen', {}).get('huurder', {}).get('naam'),
            'Pand adres': normalized_data.get('pand', {}).get('adres'),
        }

        for field_name, field_value in critical_fields.items():
            if not field_value or field_value == "Onbekend" or field_value == "":
                score -= 15
                issues.append(f"Kritiek veld '{field_name}' ontbreekt")

        # Count null/empty fields for completeness
        null_count = 0
        total_fields = 0

        def count_nulls(obj):
            nonlocal null_count, total_fields
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, (dict, list)):
                        count_nulls(value)
                    else:
                        total_fields += 1
                        if value is None or value == "" or value == "Onbekend":
                            null_count += 1
            elif isinstance(obj, list):
                for item in obj:
                    count_nulls(item)

        count_nulls(normalized_data)

        completeness = 1 - (null_count / total_fields) if total_fields > 0 else 0

        if completeness < 0.5:
            score -= 20
            issues.append(f"Weinig compleetheid ({completeness:.0%})")
        elif completeness < 0.7:
            score -= 10
            warnings.append(f"Matige compleetheid ({completeness:.0%})")

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
                "null_fields": null_count,
                "total_fields": total_fields
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

        # Extract raw data
        contract_data = extract_contract_data(full_text)

        if contract_data.get('error') == 'QUOTA_EXCEEDED':
            return {
                "success": True,
                "quota_error": True,
                "data": contract_data,
                "filename": bestandsnaam
            }

        ai_type = contract_data.get('document_type', '')
        doc_type, type_verified = detect_document_type(full_text, ai_type)

        # Normalize data
        normalized_data = normalizer.normalize(contract_data)

        # Calculate confidence on normalized data
        confidence = calculate_confidence_normalized(normalized_data, full_text, doc_type, type_verified)

        # Generate summary
        summary = generate_summary(full_text, doc_type)

        if "QUOTA_EXCEEDED" in summary:
            return {
                "success": True,
                "quota_error": True,
                "data": {"error": "QUOTA_EXCEEDED"},
                "filename": bestandsnaam
            }

        processing_time = time.time() - start_time

        print(f"Verwerkt in {processing_time:.1f}s - Score: {confidence['score']}%")

        return {
            "success": True,
            "filename": bestandsnaam,
            "title": doc_type.title(),
            "type_verified": type_verified,
            "full_text": full_text,
            "raw_data": contract_data,
            "normalized_data": normalized_data,
            "summary": summary,
            "confidence": confidence,
            "processing_time": processing_time
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================================
# SAVE & EMAIL - NO TXT FILES
# ============================================================================

def save_results(result, bestandsnaam):
    """Saves only JSON to Dropbox - NO TXT file"""
    try:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        base = bestandsnaam.replace('.pdf', '')

        normalized_data = result['normalized_data']

        json_data = {
            "filename": result['filename'],
            "document_type": result['title'],
            "type_verified": result['type_verified'],
            "processed": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "confidence": result['confidence'],
            "contract_data": normalized_data,
            "summary": result['summary']
        }

        if "raw_data" in result and "error" not in result['raw_data']:
            json_data["raw_data"] = result['raw_data']

        json_file = f"/data_{base}_{ts}.json"
        dbx_target.files_upload(
            json.dumps(json_data, indent=2, ensure_ascii=False).encode('utf-8'),
            json_file,
            mode=dropbox.files.WriteMode.overwrite
        )

        print(f"✅ JSON opgeslagen")

        return json_file

    except Exception as e:
        print(f"Opslaan fout: {e}")
        return None


def create_email(result, bestandsnaam, pdf_size, json_file):
    """Creates email with embedded details - no TXT file needed"""
    conf = result['confidence']

    if conf['score'] >= TARGET_CONFIDENCE and not conf['needs_review']:
        status_section = f"""STATUS
Betrouwbaarheidsscore: {conf['score']}%
Beoordeling: ✅ Goedgekeurd
Data compleetheid: {conf['metrics'].get('completeness', 0):.0%}
"""
    else:
        status_section = f"""STATUS
Betrouwbaarheidsscore: {conf['score']}%
Beoordeling: ⚠️ Review vereist
Data compleetheid: {conf['metrics'].get('completeness', 0):.0%}

AANDACHTSPUNTEN
{conf['details']}
"""

    # Add key contract details directly in email
    normalized = result['normalized_data']
    details_section = ""

    if normalized.get('partijen'):
        verhuurder = normalized['partijen'].get('verhuurder', {}).get('naam', 'N/A')
        huurder = normalized['partijen'].get('huurder', {}).get('naam', 'N/A')
        details_section += f"""
PARTIJEN
Verhuurder: {verhuurder}
Huurder: {huurder}
"""

    if normalized.get('pand'):
        adres = normalized['pand'].get('adres', 'N/A')
        details_section += f"""
PAND
Adres: {adres}
"""

    if normalized.get('financieel'):
        huurprijs = normalized['financieel'].get('huurprijs')
        waarborg = normalized['financieel'].get('waarborg', {}).get('bedrag')
        if huurprijs or waarborg:
            details_section += f"""
FINANCIEEL"""
            if huurprijs:
                details_section += f"\nHuurprijs: €{huurprijs:.2f}/maand"
            if waarborg:
                details_section += f"\nWaarborg: €{waarborg:.2f}"
            details_section += "\n"

    if normalized.get('periodes'):
        start = normalized['periodes'].get('ingangsdatum', 'N/A')
        duur = normalized['periodes'].get('duur', 'N/A')
        details_section += f"""
PERIODE
Ingangsdatum: {start}
Duur: {duur}
"""

    return f"""Geachte,

Bijgaand treft u de geautomatiseerde analyse aan van het volgende document:

DOCUMENT INFORMATIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bestandsnaam: {bestandsnaam}
Type: {result['title']}
Grootte: {format_file_size(pdf_size)}
Verwerkingsdatum: {datetime.now().strftime('%d-%m-%Y %H:%M')}

{status_section}
SLEUTELGEGEVENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{details_section}
SAMENVATTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{result['summary']}

GESTRUCTUREERDE DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Volledige JSON beschikbaar in Dropbox:
{json_file}

✅ JSON is klaar voor import in uw v0 website

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deze analyse is automatisch gegenereerd.
Gelieve de gegevens te controleren bij review-vereiste documenten.

Met vriendelijke groet,
Geautomatiseerd Documentverwerkingssysteem
"""


# ============================================================================
# MONITOR
# ============================================================================

def monitor_dropbox():
    print(f"Monitoring actief - Keywords: {SEARCH_CONFIG['keywords']}")
    print(f"Target confidence: {TARGET_CONFIDENCE}%")
    print(f"✅ Enhanced normalizer actief")
    print(f"✅ Alleen JSON output (geen TXT)\n")

    quota_exhausted_until = None

    while True:
        try:
            if quota_exhausted_until and datetime.now() < quota_exhausted_until:
                remaining = (quota_exhausted_until - datetime.now()).seconds
                print(f"Quota exhausted - wacht nog {remaining}s...", end="\r")
                time.sleep(60)
                continue

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
                        status = "failed"

                        try:
                            _, resp = dbx_source.files_download(pad)
                            result = process_pdf(naam, resp.content)

                            if result and result.get('quota_error'):
                                print("\n" + "=" * 70)
                                print("GEMINI API QUOTA BEREIKT")
                                print("=" * 70)
                                print("Dagelijkse limiet bereikt.")
                                print(f"PDF toegevoegd aan wachtrij: {naam}")
                                print(f"\nScript wacht {QUOTA_EXCEEDED_WAIT // 60} minuten...")
                                print("=" * 70)

                                add_to_failed_queue(pad, naam)
                                quota_exhausted_until = datetime.now() + timedelta(seconds=QUOTA_EXCEEDED_WAIT)
                                break

                            if result and result.get('success') and not result.get('quota_error'):
                                json_file = save_results(result, naam)

                                if json_file:
                                    subject = f"Document verwerkt: {result['title']} - {naam}"
                                    body = create_email(result, naam, len(resp.content), json_file)
                                    send_email(subject, body)

                                    voeg_toe_aan_historie(pad)
                                    status = "success"

                                    if result['confidence']['needs_review']:
                                        print("⚠️  Review vereist")
                                    else:
                                        print("✅ Goedgekeurd")
                                else:
                                    status = "save_failed"
                            else:
                                status = "processing_failed"
                                print(f"Fout: {result.get('error')}")

                            if result and result.get('success') and not result.get('quota_error'):
                                log_to_csv(naam, result, json_file, status)

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