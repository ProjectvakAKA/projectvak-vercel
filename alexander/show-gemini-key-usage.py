#!/usr/bin/env python3
"""
Toon het gebruik van de 21 Gemini-organize keys (opgeteld per key in huidige 24u).
Run vanuit alexander/ of projectroot met .env geladen.
"""
import os
import sys
from pathlib import Path

# Zorg dat alexander/ op het pad staat
_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

# Laad .env zonder dotenv-package (projectroot of alexander/)
def _load_env_file(path):
    if not path.exists():
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    key, val = key.strip(), val.strip().strip('"').strip("'")
                    if key:
                        os.environ.setdefault(key, val)
    except OSError:
        pass
_load_env_file(_script_dir / ".env")
_load_env_file(_script_dir.parent / ".env")

try:
    from gemini_key_rotator import get_state_summary, NUM_KEYS, MAX_CALLS_PER_24H, STATE_FILE
except ImportError as e:
    print("Fout: gemini_key_rotator niet gevonden. Run vanuit alexander/ of zorg dat .env staat waar GEMINI_API_KEY_1..21 geladen worden.")
    sys.exit(1)

def main():
    summary = get_state_summary()
    if not summary:
        print("Geen keys geladen. Zet GEMINI_API_KEY_1 t/m GEMINI_API_KEY_21 in .env.")
        return
    total = sum(s[1] for s in summary)
    n_keys = len(summary)
    print(f"Gemini organize keys: gebruik per key (max {MAX_CALLS_PER_24H}/24u)")
    print("-" * 50)
    for i, (idx, count, reset_at) in enumerate(summary):
        status = f"{count}/{MAX_CALLS_PER_24H}"
        print(f"  Key {idx + 1:2d}/{n_keys}: {status}")
    print("-" * 50)
    print(f"  Totaal deze 24u: {total} calls")
    if summary:
        _, _, next_reset_at = summary[0]
        from datetime import datetime
        try:
            dt = datetime.fromtimestamp(next_reset_at)
            print(f"  Volgende reset (alle keys): {dt.strftime('%Y-%m-%d %H:%M')}")
        except Exception:
            pass
    print()
    print(f"Statebestand: {STATE_FILE}")
    if total == 0:
        print()
        print("0 calls = nog geen document georganiseerd deze 24u, of pipeline draait niet met KEY_1..21.")

if __name__ == "__main__":
    main()
