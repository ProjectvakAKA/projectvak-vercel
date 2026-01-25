from dropbox import DropboxOAuth2FlowNoRedirect

print("=" * 60)
print("DROPBOX REFRESH TOKEN GENERATOR")
print("=" * 60)
print("\nDit script maakt permanente refresh tokens voor Dropbox API")
print("Je kunt dit script altijd opnieuw gebruiken voor nieuwe apps!\n")

# Vraag om APP_KEY en APP_SECRET
APP_KEY = input("Plak je APP_KEY: ").strip()
APP_SECRET = input("Plak je APP_SECRET: ").strip()

if not APP_KEY or not APP_SECRET:
    print("❌ APP_KEY en APP_SECRET zijn verplicht!")
    exit()

print("\n" + "=" * 60)

# Start OAuth flow
try:
    auth_flow = DropboxOAuth2FlowNoRedirect(
        APP_KEY,
        APP_SECRET,
        token_access_type='offline'
    )

    authorize_url = auth_flow.start()
    print("STAP 1: Open deze URL in je browser:")
    print(authorize_url)
    print("\nSTAP 2: Login met je Dropbox account")
    print("STAP 3: Klik op 'Allow' of 'Toestaan'")
    print("STAP 4: Kopieer de authorization code die verschijnt")
    print("=" * 60)

    auth_code = input("\nPlak de authorization code hier: ").strip()

    if not auth_code:
        print("❌ Geen code ingevoerd!")
        exit()

    # Haal refresh token op
    oauth_result = auth_flow.finish(auth_code)

    print("\n" + "=" * 60)
    print("✅ SUCCESS! JE PERMANENTE REFRESH TOKEN:")
    print("=" * 60)
    print(oauth_result.refresh_token)
    print("=" * 60)
    print("\n💾 Bewaar deze token veilig!")
    print("Deze token verloopt NOOIT (tenzij je de app revoked)")
    print("\n📝 Gebruik deze in je code als:")
    print("REFRESH_TOKEN = '" + oauth_result.refresh_token + "'")
    print("=" * 60)

except Exception as e:
    print(f"\n❌ FOUT: {e}")
    print("\nControleer of:")
    print("- Je APP_KEY en APP_SECRET correct zijn")
    print("- Je de juiste authorization code hebt geplakt")
    print("- Je internetverbinding werkt")