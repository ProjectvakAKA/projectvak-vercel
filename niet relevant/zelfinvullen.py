import dropbox
from dropbox import DropboxOAuth2FlowNoRedirect
import json
import os
from datetime import datetime

# ===== CONFIGURATIE =====
# Haal deze van https://www.dropbox.com/developers/apps
APP_KEY = "d8li5ydxt3p8dq0"
APP_SECRET = "hw4buf91uz47n8n"
REFRESH_TOKEN = "eq6jdeEHkx4AAAAAAAAAAZcWphmo4vgotMe_xxugSXmoIQ14RJU8gFIkQIk3Z-Op"  # Wordt eenmalig gegenereerd

DROPBOX_JSON_PATH = "/pad/naar/jouw/data.json"  # Pad in Dropbox
LOCAL_JSON_PATH = "./data.json"  # Lokaal pad


# ===== EENMALIGE SETUP: REFRESH TOKEN GENEREREN =====
def generate_refresh_token():
    """
    Deze functie gebruik je EENMALIG om je refresh token te krijgen.
    Daarna bewaar je die token veilig en gebruik je die permanent.
    """
    print("=== DROPBOX REFRESH TOKEN GENERATOR ===\n")
    print("1. Ga naar https://www.dropbox.com/developers/apps")
    print("2. Selecteer je app (of maak een nieuwe)")
    print("3. Kopieer de 'App key' en 'App secret'\n")

    app_key = input("Voer je App Key in: ").strip()
    app_secret = input("Voer je App Secret in: ").strip()

    # Start OAuth flow
    auth_flow = DropboxOAuth2FlowNoRedirect(
        app_key,
        app_secret,
        token_access_type='offline'  # Dit geeft ons een refresh token!
    )

    authorize_url = auth_flow.start()
    print(f"\n1. Ga naar deze URL in je browser:\n{authorize_url}")
    print("\n2. Klik op 'Allow' (geef je app toestemming)")
    print("3. Kopieer de authorization code die je krijgt\n")

    auth_code = input("Voer de authorization code in: ").strip()

    try:
        oauth_result = auth_flow.finish(auth_code)

        print("\n✓ Succes! Hier is je refresh token:")
        print(f"\nREFRESH_TOKEN = \"{oauth_result.refresh_token}\"")
        print("\n⚠️  BELANGRIJK: Bewaar deze token veilig!")
        print("Deze token verloopt NOOIT (tenzij je de toegang intrekt)")
        print("\nGebruik deze token in de REFRESH_TOKEN variabele hierboven.\n")

        return oauth_result.refresh_token

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        return None


# ===== DROPBOX CLIENT MET REFRESH TOKEN =====
def get_dropbox_client():
    """
    Maak een Dropbox client met refresh token.
    De SDK handelt automatisch het verversen van access tokens af.
    """
    try:
        dbx = dropbox.Dropbox(
            app_key=APP_KEY,
            app_secret=APP_SECRET,
            oauth2_refresh_token=REFRESH_TOKEN
        )

        # Test de connectie
        dbx.users_get_current_account()
        return dbx

    except dropbox.exceptions.AuthError as e:
        print(f"✗ Authenticatie fout: {e}")
        print("Controleer je APP_KEY, APP_SECRET en REFRESH_TOKEN")
        return None
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return None


# ===== DOWNLOAD JSON VAN DROPBOX =====
def download_json_from_dropbox():
    """Download JSON bestand van Dropbox en sla lokaal op"""
    dbx = get_dropbox_client()
    if not dbx:
        return None

    try:
        account = dbx.users_get_current_account()
        print(f"✓ Verbonden met: {account.name.display_name}")

        print(f"Downloading {DROPBOX_JSON_PATH}...")
        metadata, response = dbx.files_download(DROPBOX_JSON_PATH)

        json_content = response.content.decode('utf-8')
        json_data = json.loads(json_content)

        # Sla lokaal op
        with open(LOCAL_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)

        print(f"✓ JSON succesvol gedownload naar {LOCAL_JSON_PATH}")
        print(f"  Bestandsgrootte: {metadata.size} bytes")
        print(f"  Laatste wijziging: {metadata.server_modified}")

        return json_data

    except dropbox.exceptions.ApiError as e:
        print(f"✗ Dropbox API fout: {e}")
        if 'not_found' in str(e):
            print(f"   Bestand niet gevonden: {DROPBOX_JSON_PATH}")
        return None
    except json.JSONDecodeError:
        print("✗ ERROR: Bestand is geen geldige JSON")
        return None
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return None


# ===== UPLOAD JSON NAAR DROPBOX =====
def upload_json_to_dropbox(json_data):
    """Upload JSON bestand naar Dropbox"""
    dbx = get_dropbox_client()
    if not dbx:
        return False

    try:
        json_string = json.dumps(json_data, indent=2, ensure_ascii=False)
        json_bytes = json_string.encode('utf-8')

        dbx.files_upload(
            json_bytes,
            DROPBOX_JSON_PATH,
            mode=dropbox.files.WriteMode.overwrite
        )

        print(f"✓ JSON succesvol geupload naar Dropbox")
        return True

    except Exception as e:
        print(f"✗ ERROR bij uploaden: {e}")
        return False


# ===== LIST BESTANDEN IN DROPBOX =====
def list_dropbox_files(folder_path=""):
    """Lijst alle bestanden in een Dropbox folder"""
    dbx = get_dropbox_client()
    if not dbx:
        return

    try:
        result = dbx.files_list_folder(folder_path)

        print(f"\n=== Bestanden in '{folder_path or '/'}' ===")
        for entry in result.entries:
            if isinstance(entry, dropbox.files.FileMetadata):
                print(f"📄 {entry.path_display} ({entry.size} bytes)")
            elif isinstance(entry, dropbox.files.FolderMetadata):
                print(f"📁 {entry.path_display}/")

    except Exception as e:
        print(f"✗ ERROR: {e}")


# ===== AUTO-SYNC MONITOR =====
def watch_and_sync(interval_seconds=60):
    """Blijf periodiek checken voor updates"""
    import time

    print(f"\n=== AUTO-SYNC GESTART ===")
    print(f"Checking elke {interval_seconds} seconden...")
    print("Druk Ctrl+C om te stoppen\n")

    last_modified = None

    try:
        while True:
            dbx = get_dropbox_client()
            if not dbx:
                print("Kan geen connectie maken, probeer over 60 sec...")
                time.sleep(60)
                continue

            try:
                metadata = dbx.files_get_metadata(DROPBOX_JSON_PATH)

                if last_modified is None or metadata.server_modified > last_modified:
                    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 🔄 Nieuwe versie gedetecteerd!")
                    download_json_from_dropbox()
                    last_modified = metadata.server_modified
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Geen wijzigingen", end='\r')

            except Exception as e:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] ✗ Check failed: {e}")

            time.sleep(interval_seconds)

    except KeyboardInterrupt:
        print("\n\n=== SYNC GESTOPT ===")


# ===== MAIN =====
if __name__ == "__main__":
    import sys

    # Check of we refresh token moeten genereren
    if len(sys.argv) > 1 and sys.argv[1] == "setup":
        print("\n🔧 SETUP MODE: Genereer refresh token\n")
        generate_refresh_token()
        sys.exit(0)

    # Check of credentials zijn ingevuld
    if APP_KEY == "jouw_app_key_hier" or REFRESH_TOKEN == "jouw_refresh_token_hier":
        print("\n⚠️  SETUP VEREIST!")
        print("\nStap 1: Run eerst: python script.py setup")
        print("Stap 2: Vul APP_KEY, APP_SECRET en REFRESH_TOKEN in")
        print("Stap 3: Run opnieuw\n")
        sys.exit(1)

    # Menu
    print("\n=== DROPBOX JSON SYNC ===")
    print("1. Download JSON (eenmalig)")
    print("2. Upload JSON (eenmalig)")
    print("3. List Dropbox bestanden")
    print("4. Start auto-sync (blijft draaien)")
    print("5. Exit")

    choice = input("\nKeuze (1-5): ").strip()

    if choice == "1":
        data = download_json_from_dropbox()
        if data:
            print("\n--- Data Preview ---")
            print(json.dumps(data, indent=2)[:500] + "...\n")

    elif choice == "2":
        if os.path.exists(LOCAL_JSON_PATH):
            with open(LOCAL_JSON_PATH, 'r') as f:
                data = json.load(f)
            upload_json_to_dropbox(data)
        else:
            print(f"✗ Lokaal bestand niet gevonden: {LOCAL_JSON_PATH}")

    elif choice == "3":
        folder = input("Folder path (laat leeg voor root): ").strip()
        list_dropbox_files(folder)

    elif choice == "4":
        interval = input("Check interval in seconden (default 60): ").strip()
        interval = int(interval) if interval.isdigit() else 60
        watch_and_sync(interval)

    else:
        print("Bye!")