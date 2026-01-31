#!/usr/bin/env python3
"""
One-time script: copy all JSON contract files from Dropbox TARGET to Supabase.
Dropbox TARGET credentials and Supabase credentials must be set in .env.
After migration, set SUPABASE_URL and SUPABASE_SERVICE_KEY in Python/Next.js
and optionally stop writing JSON to Dropbox (Python will use Supabase).
CSV log stays in Dropbox.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error

# Load .env from project root
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(script_dir)

from dotenv import load_dotenv

env_path = os.path.join(root_dir, '.env')
loaded = load_dotenv(env_path)

import dropbox
# Project has a folder "supabase/" (migrations) that shadows the pip package — temporarily remove root from path
_save_path = sys.path.copy()
sys.path = [p for p in sys.path if os.path.abspath(p) != os.path.abspath(root_dir)]
from supabase import create_client
sys.path = _save_path

APP_KEY_TARGET = os.getenv('APP_KEY_TARGET')
APP_SECRET_TARGET = os.getenv('APP_SECRET_TARGET')
REFRESH_TOKEN_TARGET = os.getenv('REFRESH_TOKEN_TARGET')
def _clean_env_value(s):
    if not s:
        return ''
    s = s.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    return s


def _sanitize_json(obj):
    """Replace NaN/Infinity so PostgreSQL jsonb accepts the payload."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_json(v) for v in obj]
    if isinstance(obj, float):
        if obj != obj:  # NaN
            return None
        if obj == float('inf') or obj == float('-inf'):
            return None
    return obj

# Accept both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL (same value)
SUPABASE_URL = _clean_env_value(os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL') or '')
SUPABASE_SERVICE_KEY = _clean_env_value(os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or '')

def main():
    if not all([APP_KEY_TARGET, APP_SECRET_TARGET, REFRESH_TOKEN_TARGET]):
        print("❌ Set APP_KEY_TARGET, APP_SECRET_TARGET, REFRESH_TOKEN_TARGET in .env")
        sys.exit(1)
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        missing = []
        if not SUPABASE_URL:
            missing.append("SUPABASE_URL (of NEXT_PUBLIC_SUPABASE_URL)")
        if not SUPABASE_SERVICE_KEY:
            missing.append("SUPABASE_SERVICE_KEY (of SUPABASE_SERVICE_ROLE_KEY)")
        print("❌ In .env ontbreekt: " + ", ".join(missing))
        env_path = os.path.join(root_dir, '.env')
        print("   .env wordt geladen uit:", env_path)
        print("   Bestand bestaat:", os.path.isfile(env_path))
        print("   load_dotenv() geladen:", loaded)
        # Welke keys staan er in het .env-bestand? (alleen namen, geen waarden)
        try:
            with open(env_path, 'r', encoding='utf-8', errors='replace') as f:
                file_keys = []
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key = line.split('=', 1)[0].strip()
                        file_keys.append(key)
                supabase_in_file = [k for k in file_keys if 'SUPABASE' in k.upper()]
                print("   Variabelen in .env (alle):", ", ".join(file_keys) if file_keys else "(geen regels KEY=value)")
                if supabase_in_file:
                    print("   Supabase-gerelateerd in .env:", ", ".join(supabase_in_file))
                else:
                    print("   Geen Supabase-variabele in .env — voeg toe: SUPABASE_URL en SUPABASE_SERVICE_KEY (exact zo).")
        except Exception as e:
            print("   Kon .env niet inlezen:", e)
        sys.exit(1)

    dbx = dropbox.Dropbox(
        app_key=APP_KEY_TARGET,
        app_secret=APP_SECRET_TARGET,
        oauth2_refresh_token=REFRESH_TOKEN_TARGET
    )
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception as e:
        if 'Invalid URL' in str(e) or 'invalid url' in str(e).lower():
            print("❌ Supabase URL ongeldig. Controleer in .env:")
            print("   - Geen aanhalingstekens rond de waarde (gebruik SUPABASE_URL=https://... niet SUPABASE_URL=\"https://...\")")
            print("   - URL moet beginnen met https:// en eindigen op .supabase.co")
            print("   - Waarde nu (eerste 60 tekens):", repr(SUPABASE_URL[:60]) if len(SUPABASE_URL) > 60 else repr(SUPABASE_URL))
        else:
            print("❌ Supabase-fout:", e)
        sys.exit(1)

    # Diagnose: directe HTTP-call om echte status/body van Supabase te zien
    rest_url = SUPABASE_URL.rstrip('/') + '/rest/v1/contracts'
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    try:
        req = urllib.request.Request(rest_url, method='GET', headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.getcode()
            body = resp.read().decode('utf-8', errors='replace')[:200]
        if status != 200:
            print("❌ Supabase GET /rest/v1/contracts:", status, body)
            sys.exit(1)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:500]
        print("❌ Supabase antwoord op GET /rest/v1/contracts:")
        print("   HTTP status:", e.code)
        print("   Body:", body)
        if e.code == 404:
            print("   → Tabel 'contracts' bestaat niet. Voer supabase/migrations/20250125000000_contracts_json_storage.sql uit in Supabase → SQL Editor.")
        elif e.code == 401:
            print("   → Verkeerde of verlopen API-key. Gebruik de service_role key uit Supabase → Settings → API.")
        elif e.code == 405:
            print("   → Method Not Allowed. Controleer of de URL klopt (moet eindigen op .supabase.co, zonder /rest/v1).")
        sys.exit(1)
    except Exception as e:
        print("❌ Kon Supabase niet bereiken:", e)
        sys.exit(1)

    # Test insert via directe HTTP (zelfde als client zou doen)
    try:
        data = json.dumps({'name': '_migration_ping', 'data': {}}).encode('utf-8')
        req = urllib.request.Request(rest_url, data=data, method='POST', headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:500]
        print("❌ Supabase weigert INSERT (testrij):")
        print("   HTTP status:", e.code)
        print("   Body:", body)
        if e.code == 405:
            print("   → Vaak: tabel bestaat niet of RLS blokkeert. Voer de migratie uit in Supabase → SQL Editor.")
        sys.exit(1)
    try:
        del_req = urllib.request.Request(rest_url + '?name=eq._migration_ping', method='DELETE', headers=headers)
        with urllib.request.urlopen(del_req, timeout=10) as resp:
            pass
    except Exception:
        pass

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print("📂 Listing JSON files in Dropbox TARGET root...")
    result = dbx.files_list_folder(path='')
    entries = result.entries
    while result.has_more:
        result = dbx.files_list_folder_continue(result.cursor)
        entries.extend(result.entries)

    json_files = [e for e in entries if getattr(e, 'name', '').endswith('.json') and getattr(e, 'name', '').startswith('data_')]
    print(f"   Found {len(json_files)} data_*.json files")

    migrated = 0
    errors = 0
    for i, entry in enumerate(json_files):
        name = entry.name
        path = entry.path_display or ('/' + name)
        try:
            _, res = dbx.files_download(path)
            if not res.content:
                errors += 1
                print(f"   ❌ {name}: leeg bestand in Dropbox")
                continue
            text = res.content.decode('utf-8', errors='replace').strip()
            if not text:
                errors += 1
                print(f"   ❌ {name}: leeg bestand")
                continue
            try:
                data = json.loads(text)
            except json.JSONDecodeError as je:
                errors += 1
                print(f"   ❌ {name}: ongeldige JSON ({je})")
                continue
            if not isinstance(data, dict):
                data = {'raw': data}
            # PostgreSQL jsonb does not accept NaN/Infinity; strip them
            data = _sanitize_json(data)
            row = {'name': name, 'data': data}
            # Client expects list for upsert in some versions
            supabase.table('contracts').upsert([row], on_conflict='name').execute()
            migrated += 1
            print(f"   ✅ {name}")
        except Exception as e:
            errors += 1
            err_msg = str(e)
            if '405' in err_msg or 'JSON could not be generated' in err_msg:
                print(f"   ❌ {name}: Supabase weigerde (RLS/permissie of ongeldige payload?) — {err_msg[:120]}")
            else:
                print(f"   ❌ {name}: {err_msg[:120]}")
        if (i + 1) % 10 == 0:
            time.sleep(0.5)

    print(f"\n✅ Migrated {migrated} files to Supabase. Errors: {errors}")

if __name__ == '__main__':
    main()
