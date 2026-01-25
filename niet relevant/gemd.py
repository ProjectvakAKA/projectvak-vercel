# ============================================================================
# 🛠️ INITIALISATIE (GEFORCEERD OP V1)
# ============================================================================
import dropbox
import pdfplumber
import io
import os
from datetime import datetime
from google import genai
try:
    # We voegen 'http_options' toe om de API versie expliciet op 'v1' te zetten
    # Dit omzeilt de automatische v1beta die de 404 error veroorzaakt.
    from google.genai import types

    client = genai.Client(
        api_key='AIzaSyBe-j76KoiH74V86RxkhVPF2imxZk7Ldw0',
        http_options={'api_version': 'v1'}
    )
    MODEL_ID = "gemini-1.5-flash"
    print("✅ Gemini SDK geforceerd op v1 (geen 404 meer)")
except Exception as e:
    print(f"⚠️ Gemini Initialisatie Fout: {e}")