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
RECIPIENT_EMAIL = "alexanderverstraete1@gmail.com"

# Dropbox Configuratie
DROPBOX_ACCESS_TOKEN = "sl.u.AGOTkaKHDXOG0Gzc8zhRZqlWuDHWNqWVA2sE7ET-aA5EBkeWrgA_hH_i70A4THpsBM-P-KhbLLreYMYbvcaOFIzQB8sIhuZrpi2HOufxN_jRAQCQHsDwHu9jibHcGTQk-PFCes-zGcNflJMZ8s2Dgzx0hgI9L1k_H7fqvC5oO99J99LwGM91tFMZIpv5Vfyh3DXUZTcP2zrUmuCgXVyHJaj3BVyvbpaTO7COT-OiBB8Y7soEwJgzmt7z4aOsGKE6ShUEOaTbgTTcV6SBQQ100_vCzCJsZXiAEHK3D3aWgppHPPO0srPNOPITBSMV_PsPzkXdXjjnpWHhOuLU7f1JqW1nVKmHSTBS-Sb85Jor1VFE4o4xUCct_pZYUoq0rGtT8cv8jHjWyUZK1KYBsvfhDaRwiKcHkqQXmPPxIMinBu9NifV14d0rCe9gdp2JWLYdTPw8gOrlIPoQFqWf7fx-yFtq5cEuNaQ2BAdAn9ySbvsu9NCi3E0mPiABrDQoj9YjIA4eq_bHgecaDvqHg-MyaQ3FIZJnhhbetQlHKq5X47Jrr-quiCYiYjQn8gmvn3M3uVgZ6jD5civDMQeYadkrCGgrkkRUVYcTya34Olm2DVZjx0Q3Ao4NGR6-i07XBLtsmph0_1qKX3xFSfUIyrNXPnlZ1b7h4yp0S5L2Z7DCZVZX7mYwxLuj27ia0DiC8URUF8Mhbh203W7kGvGDs3AB0EedAxl2N3S7S8OE4latCQbBYvQbguH3CSlasDqElG2XwBb8bAPMJ0OZQ6yJ2RqvJOcgNtDX73zJwrLTpPY3gzhPgKRg0eKB3b7dmr01DcFqWoA7vATxiqSMcDKAMUq2o1TWhvr_tF2YZaVvfb8bfLUcSc4Mejf1hGMd4pcI6RmZebLMC1QQuuOfG_DjoQp1zC7sOaNwnqUxRE01TKCde2NJpJfjGS21A5gjR6_c9AHXJGuCZ6Lae6l2j4fzOxvX7fp88_xLseu_TkrnJqBBA3pTB4mYNt4mY_x7Rt_za_v94_UDK6eJaug8R-QpO3jfIiSaSXGhIPjL31bEp6cqSTNL4QCF3oXMGXGJexv7trBhMcyf3KEK4VGDqW_VM-3_bhvS8O028uIZqgB3KuqNQDKfD6w7DkLTwOWpPGsRgLMdCY6dl7_8PWutYo5jT58hFFsfWTxvP2n1rbP1czdo7f6IVjHqFzoHhL84r9N0Awhn_T-QMDiLtHV1iiX9PactH49Fs6ezCKFGVK-_8Zmsv1uSzO8YUGk_5QfXpjbveHIJtP_UwUC_QE39IY1ji_ZLRTeqo9a_u621fFniAAg9HWXgBwLt64zO1E9lsipRp0amhsDo0xXhdD5q8iBFJQz0C5abYPIUzo_uGaq9CIPkLjcZsUDdqlfwjyIxPQeFVlXnLHryOrpaGcs-ZnRDYNpn9_6w-bF96sGaw5wlVrLHkYNs8eu48XDemcAvlxQbJKHxy8w"
DROPBOX_FOLDER = ""  # ← Laat leeg voor hele Dropbox, of bijv. "/Documenten"

# Monitor Instellingen
KEYWORDS = ['vakvak']
FILE_EXTENSIONS = ['.txt']
CHECK_INTERVAL = 30
HISTORY_FILE = "dropbox_monitor_historyf.txt"


# ============================================================================
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
                            new_files.append({
                                'path': file_path,
                                'name': filename,
                                'size': entry.size,
                                'modified': entry.client_modified
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
                    body = f"""Er is een nieuw bestand in je Dropbox!

Bestand: {file_info['name']}
Pad: {file_info['path']}
Grootte: {format_file_size(file_info['size'])}
Gewijzigd: {file_info['modified'].strftime('%Y-%m-%d %H:%M:%S')}

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


if __name__ == "__main__":
    monitor_dropbox()