#!/usr/bin/env python3
from dotenv import load_dotenv
from google import genai
import os

load_dotenv(override=True)

print("Testing NEW Gemini API Keys...\n")

# Test ORGANIZE key
key_organize = os.getenv('GEMINI_API_KEY_ORGANIZE')
print(f"1. GEMINI_API_KEY_ORGANIZE: {key_organize[:20]}...")
try:
    client = genai.Client(api_key=key_organize)
    # Try different model names
    for model_name in ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']:
        try:
            response = client.models.generate_content(model=model_name, contents='Say hi')
            print(f"   ✓ VALID - Works with {model_name}!")
            break
        except Exception as e2:
            continue
    else:
        # If all models fail, try listing available models
        try:
            models = client.models.list()
            print(f"   ✓ VALID - Key works! Available models: {[m.name for m in list(models)[:3]]}")
        except Exception as e3:
            print(f"   ✗ ERROR: {str(e3)[:150]}")
except Exception as e:
    error_msg = str(e)
    if "expired" in error_msg.lower():
        print("   ✗ EXPIRED - API Key has expired")
    elif "API Key not found" in error_msg or "API_KEY_INVALID" in error_msg:
        print("   ✗ INVALID - API Key not found or invalid")
    else:
        print(f"   ✗ ERROR: {error_msg[:150]}")

print()

# Test ANALYZE key
key_analyze = os.getenv('GEMINI_API_KEY_ANALYZE')
print(f"2. GEMINI_API_KEY_ANALYZE: {key_analyze[:20]}...")
try:
    client = genai.Client(api_key=key_analyze)
    # Try different model names
    for model_name in ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']:
        try:
            response = client.models.generate_content(model=model_name, contents='Say hi')
            print(f"   ✓ VALID - Works with {model_name}!")
            break
        except Exception as e2:
            continue
    else:
        # If all models fail, try listing available models
        try:
            models = client.models.list()
            print(f"   ✓ VALID - Key works! Available models: {[m.name for m in list(models)[:3]]}")
        except Exception as e3:
            print(f"   ✗ ERROR: {str(e3)[:150]}")
except Exception as e:
    error_msg = str(e)
    if "expired" in error_msg.lower():
        print("   ✗ EXPIRED - API Key has expired")
    elif "API Key not found" in error_msg or "API_KEY_INVALID" in error_msg:
        print("   ✗ INVALID - API Key not found or invalid")
    else:
        print(f"   ✗ ERROR: {error_msg[:150]}")
