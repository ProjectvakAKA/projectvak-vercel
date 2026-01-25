import os
import time
import smtplib
import dropbox
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# ============================================================================
# ⚙️ CONFIGURATIE
# ============================================================================

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "avdocumentenhirb@gmail.com"
SENDER_PASSWORD = "hjri xnha kklc vekj"  # Use App Password for Gmail

# Meerdere ontvangers
RECIPIENT_EMAILS = [
    "arthur.gys@student.kuleuven.be",
    "kaat.commeine@student.kuleuven.be", "alexander.verstraete@student.kuleuven.be"
]

# Dropbox Configuratie
DROPBOX_ACCESS_TOKEN = "sl.u.AGO9DGqxxvZWhR4MEHGArbfy3NWDPskCMvxIRawbrTiYKt_wZwNzN7XaauK3utp3v-rcPbqIc6TgqEff7QuyhuqORNxkvwRj7WWRRC_RGFvUvszFbz51Ln9o9wGnxb7YpxVH2-SAFmJZ1QEemjZtHXPn-LdV5pwMEoChRhbbWnbxIXxLhWjFIVRUQgvU-QUGOh4Yx-NFV5DkIWxl9Wi9l2CJygKXSKNc5mHmN1_HlyfHdkWv6mFDpU1_HOzzMw9XRU4Fl5cVGuBABMeexPUNMkHLVLYrzey35Z9-XqekPxJbJ7Q1J9rITV-Im1Y-UHc_sNBKz3WN2UDpQZk6HAOP5TP72jgVc5GgaKSEjz5yfigpIng3lkPfNO4sGCcDrIrchcnuyUUuCkuP5vITvoqER65PtdVvSOtFz_8eBtZBPOt3GJ_lusBz4fswr7eINEMH8xB4yykcToV-FfsuxftxDlhCq3uS81I2XBMGWFnK1geW73WEB7Tqe89iPeDh8UlxrSusNoQ7WtQg19Tdy9B7ox3M1BxHyeNEIjUpyi_--c4FSqf6qsnZIPJtLvEAlqgUVWUfC4KS_gaFXpYBZbdbNYcVhAeCmgD-2jdY-FFW4exbuwS-Emj78rO2gFCngWO2u9coViQgAp0uAwDKEIu9maoHsOy86A6q-gozLGBx5iU0dU8mZ62g9aMTJpVB2OAXYyu7YoO-2LgNuDVr9XYYVm34HHG_S3U_kFJ5sFJY0u21HI7sSH-AMzlw0mHqG4qJWbDggqyqqfEES915K-ENGS-QTGMtfNePLkO1ohIdKSBA7lUb3TImQJ80bHoV64kwtaSAInXMFbUY4DE-9SGPcMrosDl6qkezexbo370wGm30lg7z5GV82OCMTAL9VawTtICH6we-qvfN-6Pn9bD-q87AxmqNGRmcF2xkMYijU3brX96_SQFB-d2XYZPcj2nQuaEkoIzoQv0OnPYXeFWN0htpe48AJE3zM8Ghdl53YMVrLG-qSYz6hDcAXeLAmKBHiTgQ0ssz1ouSLUY3a13RQcMhoUy6iBSIToFrz8gb8Lp0wCUA51FOHtUatvItvIF0MNmaV2RUyh0A7MNRvatLe-3H-VHFagE9yIMHWN57YPOIuH-xLAZMQHS6_KuP-YW9MARUbTeAe9CWkMBMr4UOVugHPHbzjsQ-C9L79m-ukuR_uOFxRGZajSsHPfuMw4YDkDeM6MwFWvhxQxCBTCzp1AIM-gD2tgZh7OPqBz9mmy3BMuayOKUxheofDyJt0EAG_RacGEFCFIYHIslLWvez2YZ9rXQqOVH4bXbrwIbr1VN9dwRKzcKnuAUMKtHYnsglGUmjHG6o2Re00wZwI2-VI3quqraJFvwPnZPQjjywwHGrERiu89RUcUJyWpF6GqA9VJniHbv3sZMzTJq-K7PAnhk6PPf4FjCGSwCv7XXz7FptHP-IcooZnfXaoCM39ubENuA"
DROPBOX_FOLDER = ""  # ← Laat leeg voor hele Dropbox, of bijv. "/Documenten"

# Monitor Instellingen
KEYWORDS = ['alexander']
FILE_EXTENSIONS = ['.txt']
CHECK_INTERVAL = 30
HISTORY_FILE = "dropbox_monitor_historyf.txt"


# 📧 EMAIL FUNCTIE
# ============================================================================

def send_email(subject, body):
    """Verstuur email notificatie naar meerdere ontvangers"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = ", ".join(RECIPIENT_EMAILS)  # Alle ontvangers
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email verzonden naar {len(RECIPIENT_EMAILS)} ontvangers: {subject}")
        return True

    except Exception as e:
        print(f"❌ Email fout: {e}")
        return False


# ============================================================================
# 📁 HULPFUNCTIES
# ============================================================================

def load_history():
    """Laad eerder verwerkte bestanden"""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return set(f.read().splitlines())
    return set()


def save_to_history(file_path):
    """Sla bestand op in geschiedenis"""
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(file_path + "\n")


def format_file_size(size_bytes):
    """Formatteer bestandsgrootte"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def check_file_matches(filename):
    """Check of bestand aan criteria voldoet"""
    matches_extension = any(filename.lower().endswith(ext) for ext in FILE_EXTENSIONS)
    print(f"      Extensie: {matches_extension}")

    if not matches_extension:
        return False

    if KEYWORDS:
        matches_keyword = any(keyword.lower() in filename.lower() for keyword in KEYWORDS)
        print(f"      Keyword: {matches_keyword}")
        if not matches_keyword:
            return False

    return True


def get_file_content(dbx, file_path):
    """Haal volledige inhoud van tekstbestand op"""
    try:
        _, response = dbx.files_download(file_path)
        content = response.content.decode('utf-8', errors='ignore')
        return content.strip()
    except Exception as e:
        print(f"    ⚠️ Inhoud ophalen fout: {e}")
        return None


# ============================================================================
# 🔌 DROPBOX FUNCTIES
# ============================================================================

def init_dropbox():
    """Initialiseer Dropbox verbinding"""
    try:
        if not DROPBOX_ACCESS_TOKEN or DROPBOX_ACCESS_TOKEN == "jouw-dropbox-token":
            print("❌ Geen Dropbox access token ingevuld!")
            return None

        print("🔄 Verbinden met Dropbox...")
        dbx = dropbox.Dropbox(DROPBOX_ACCESS_TOKEN)

        account = dbx.users_get_current_account()
        print(f"✅ Verbonden met: {account.name.display_name}")
        return dbx

    except dropbox.exceptions.AuthError as e:
        print(f"❌ Authenticatie mislukt: {e}")
        print("⚠️ Token verlopen? Genereer nieuwe op: https://www.dropbox.com/developers/apps")
        return None
    except Exception as e:
        print(f"❌ Verbinding mislukt: {e}")
        return None


def scan_dropbox(dbx):
    """Scan Dropbox voor nieuwe bestanden"""
    history = load_history()
    new_files = []
    total_files = 0
    matching_files = 0

    try:
        print(f"🔍 Scanning: '{DROPBOX_FOLDER or '/'}'...")
        result = dbx.files_list_folder(DROPBOX_FOLDER, recursive=True)

        while True:
            for entry in result.entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    total_files += 1
                    file_path = entry.path_display
                    filename = entry.name

                    print(f"  📄 {filename}")

                    if check_file_matches(filename):
                        matching_files += 1
                        print(f"    ✅ Matcht!")

                        if file_path not in history:
                            print(f"    🆕 NIEUW!")
                            print(f"    📖 Volledige inhoud ophalen...")

                            # Haal volledige inhoud op
                            content = get_file_content(dbx, file_path)

                            new_files.append({
                                'path': file_path,
                                'name': filename,
                                'size': entry.size,
                                'modified': entry.client_modified,
                                'content': content
                            })
                        else:
                            print(f"    ⏭️ Al verwerkt")

            if not result.has_more:
                break
            result = dbx.files_list_folder_continue(result.cursor)

        print(f"\n📊 Totaal: {total_files} | Matchend: {matching_files} | Nieuw: {len(new_files)}\n")
        return new_files

    except dropbox.exceptions.ApiError as e:
        print(f"⚠️ API fout: {e}")
        return []
    except Exception as e:
        print(f"⚠️ Scan fout: {e}")
        return []


# ============================================================================
# 🚀 HOOFDPROGRAMMA
# ============================================================================

def monitor_dropbox():
    """Monitort Dropbox en verstuurt emails"""

    if SENDER_EMAIL == "jouw-email@gmail.com":
        print("❌ Configureer eerst je email!")
        return

    dbx = init_dropbox()
    if not dbx:
        return

    print(f"\n🚀 Monitor gestart")
    print(f"📧 Naar: {', '.join(RECIPIENT_EMAILS)}")
    print(f"📁 Folder: {DROPBOX_FOLDER or 'Hele Dropbox'}")
    print(f"🔎 Keywords: {KEYWORDS}")
    print(f"📄 Extensies: {FILE_EXTENSIONS}")
    print(f"⏱️  Interval: {CHECK_INTERVAL}s")
    print("Druk Ctrl+C om te stoppen\n")

    while True:
        try:
            new_files = scan_dropbox(dbx)

            if new_files:
                for file_info in new_files:
                    print(f"\n🆕 Nieuw: {file_info['name']}")

                    # Nieuw onderwerp
                    subject = "Nieuw document, Alexander gesprek met stagecoördinator"

                    # Email body met volledige tekst
                    body = file_info.get('content', '[Geen inhoud beschikbaar]')

                    if send_email(subject, body):
                        save_to_history(file_info['path'])
                        print(f"✅ Email verzonden!")
                    else:
                        print(f"⚠️ Email mislukt!")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Geen nieuwe bestanden", end="\r")

            time.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            print("\n\n👋 Gestopt")
            break
        except Exception as e:
            print(f"\n⚠️ Fout: {e}")
            print("Retry over 10s...")
            time.sleep(10)


if __name__ == "__main__":
    monitor_dropbox()