"""
Gemini organize key rotator: 21 keys, max 15 calls per key per 24h.
Eén globaal 24u-venster: alle keys resetten tegelijk elke 24u.
Als het script >24u uit stond: bij eerste get_next_key() worden alle tellers op 0 gezet.
State: gemini_organize_key_state.json (next_reset_at + counts per key).
"""

import os
import json
import time
from pathlib import Path

# Config
NUM_KEYS = 21
MAX_CALLS_PER_24H = 15
STATE_FILE = Path(__file__).resolve().parent / "gemini_organize_key_state.json"
ENV_PREFIX = "GEMINI_API_KEY_"
ONE_DAY = 24 * 3600


def _load_keys():
    """Alleen GEMINI_API_KEY_1…21. Geen fallback naar KEY_ORGANIZE."""
    keys = []
    for i in range(1, NUM_KEYS + 1):
        val = os.getenv(f"{ENV_PREFIX}{i}", "").strip()
        if val:
            keys.append(val)
    return keys


def _load_state(keys):
    """
    Laad state: next_reset_at (unix timestamp) en counts (list van int per key).
    Als next_reset_at verstreken is of ontbreekt: tel als "moet resetten bij volgende get_next_key".
    """
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            next_reset_at = data.get("next_reset_at")
            counts = data.get("counts", [])
            while len(counts) < len(keys):
                counts.append(0)
            counts = counts[: len(keys)]
            return counts, next_reset_at
        except (json.JSONDecodeError, TypeError, KeyError):
            pass
    return [0] * len(keys), None


def _save_state(counts, next_reset_at):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump({"next_reset_at": next_reset_at, "counts": counts}, f, indent=2)


def get_next_key():
    """
    Eén 24u-venster voor alle keys: als nu >= next_reset_at (of script stond >24u uit),
    eerst alle tellers op 0 en next_reset_at = nu + 24u. Kies dan key met laagste count.
    Returns (api_key, key_index) of (None, -1).
    """
    keys = _load_keys()
    if not keys:
        return None, -1

    counts, next_reset_at = _load_state(keys)
    now = time.time()

    # Elke 24u (of bij opstart na >24u uit): alle keys resetten
    if next_reset_at is None or now >= next_reset_at:
        counts = [0] * len(keys)
        next_reset_at = now + ONE_DAY
        _save_state(counts, next_reset_at)

    # Key met laagste count (eerste bij gelijk)
    best_i = -1
    best_count = MAX_CALLS_PER_24H
    for i, c in enumerate(counts):
        if c < best_count:
            best_count = c
            best_i = i

    if best_i < 0 or counts[best_i] >= MAX_CALLS_PER_24H:
        return None, -1

    counts[best_i] += 1
    _save_state(counts, next_reset_at)
    return keys[best_i], best_i


def get_state_summary():
    """
    Voor weergave: (index, count, next_reset_at) per key.
    Als next_reset_at verstreken is: count wordt als 0 getoond (wordt bij volgende get_next_key gereset).
    """
    keys = _load_keys()
    if not keys:
        return []
    counts, next_reset_at = _load_state(keys)
    now = time.time()
    if next_reset_at is None or now >= next_reset_at:
        counts = [0] * len(keys)
        next_reset_at = now + ONE_DAY
    return [(i, counts[i], next_reset_at) for i in range(len(keys))]
