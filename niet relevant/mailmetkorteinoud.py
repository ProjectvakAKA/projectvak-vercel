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
RECIPIENT_EMAIL = "arthur.gys@student.kuleuven.be"

# Dropbox Configuratie met REFRESH TOKEN
APP_KEY = "0sgwsygd9vy91q2"
APP_SECRET = "tr1xhuaa4pvvdoa"
REFRESH_TOKEN = 'djwaLECatRkAAAAAAAAAAWXEzKKTn3ASEkxQRzSRYBq8kXVdECyhJKq7q6h5upmH'

DROPBOX_FOLDER = ""  # ← Laat leeg voor hele Dropbox, of bijv. "/Documenten"

# Monitor Instellingen
KEYWORDS = ['vakvak']
FILE_EXTENSIONS = ['.txt']
CHECK_INTERVAL = 30
HISTORY_FILE = "dropbox_monitor_history.txt"


# 📧 EMAIL FUNCTIE
# ============================================================================

def send_email(subject, body):
    """Verstuur email notificatie"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL
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


def get_file_preview(dbx, file_path):
    """Haal eerste 20 woorden van tekstbestand op"""
    try:
        _, response = dbx.files_download(file_path)
        content = response.content.decode('utf-8', errors='ignore')
        words = content.split()[:20]
        preview = ' '.join(words)
        if len(words) >= 20:
            preview += '...'
        return preview
    except Exception as e:
        print(f"    ⚠️ Preview fout: {e}")
        return None


# ============================================================================
# 🔌 DROPBOX FUNCTIES
# ============================================================================

def init_dropbox():
    """Initialiseer Dropbox verbinding met REFRESH TOKEN"""
    try:
        print("🔄 Verbinden met Dropbox...")

        # Gebruik refresh token voor permanente verbinding
        dbx = dropbox.Dropbox(
            app_key=APP_KEY,
            app_secret=APP_SECRET,
            oauth2_refresh_token=REFRESH_TOKEN
        )

        account = dbx.users_get_current_account()
        print(f"✅ Verbonden met: {account.name.display_name}")
        return dbx

    except dropbox.exceptions.AuthError as e:
        print(f"❌ Authenticatie mislukt: {e}")
        print("⚠️ Controleer je APP_KEY, APP_SECRET en REFRESH_TOKEN")
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
                            print(f"    📖 Preview ophalen...")

                            # Haal preview op
                            preview = get_file_preview(dbx, file_path)

                            new_files.append({
                                'path': file_path,
                                'name': filename,
                                'size': entry.size,
                                'modified': entry.client_modified,
                                'preview': preview
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

    dbx = init_dropbox()
    if not dbx:
        return

    print(f"\n🚀 Monitor gestart")
    print(f"📧 Naar: {RECIPIENT_EMAIL}")
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

                    subject = f"🆕 Nieuw bestand: {file_info['name']}"

                    # Maak preview sectie
                    preview_section = ""
                    if file_info.get('preview'):
                        preview_section = f"""
Preview (eerste 20 woorden):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{file_info['preview']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

                    body = f"""Er is een nieuw bestand in je Dropbox!

Bestand: {file_info['name']}
Pad: {file_info['path']}
Grootte: {format_file_size(file_info['size'])}
Gewijzigd: {file_info['modified'].strftime('%Y-%m-%d %H:%M:%S')}
{preview_section}
Gedetecteerd: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Link: https://www.dropbox.com/home{file_info['path']}
"""

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
            # Herinitialiseer verbinding bij fout
            dbx = init_dropbox()
            if not dbx:
                print("❌ Kan verbinding niet herstellen. Stoppen...")
                break


if __name__ == "__main__":
    monitor_dropbox()