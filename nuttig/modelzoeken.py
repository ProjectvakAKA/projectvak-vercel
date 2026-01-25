"""
GEMINI MODEL TESTER
Test welke Gemini models werken met jouw API key
"""

from google import genai
import json

# Jouw API key
GEMINI_API_KEY = 'AIzaSyCKXLUb2MYgDCHfU75OCSxAvfNtM97R4qc'

def test_models():
    """Test alle beschikbare Gemini models"""

    print("🔍 GEMINI MODEL TESTER")
    print("=" * 70)

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)

        # List alle models
        print("\n📋 Alle beschikbare models:\n")
        all_models = client.models.list()

        generative_models = []

        for m in all_models:
            model_name = m.name if hasattr(m, 'name') else str(m)

            # Filter generative models (niet embedding)
            if 'gemini' in model_name.lower() and 'embedding' not in model_name.lower():
                generative_models.append(model_name)
                print(f"   ✓ {model_name}")

        if not generative_models:
            print("   ❌ Geen generative Gemini models gevonden!")
            return

        # Test elk model
        print(f"\n{'=' * 70}")
        print("🧪 Models testen met simpele prompt...\n")

        test_prompt = "Classify this as 'invoice' or 'contract': Invoice #12345, Total: €500"

        working_models = []

        for model_name in generative_models:
            print(f"Testing: {model_name}")

            try:
                # Probeer generateContent
                response = client.models.generate_content(
                    model=model_name,
                    contents=test_prompt
                )

                result = response.text.strip()
                print(f"   ✅ WERKT! Response: {result[:100]}...")
                working_models.append(model_name)

            except Exception as e:
                error_str = str(e)
                if "404" in error_str or "NOT_FOUND" in error_str:
                    print(f"   ❌ Niet gevonden (404)")
                elif "429" in error_str:
                    print(f"   ⚠️  Rate limit - model werkt waarschijnlijk wel")
                    working_models.append(model_name)
                else:
                    print(f"   ❌ Error: {error_str[:100]}")

            print()

        # Samenvatting
        print(f"{'=' * 70}")
        print("📊 RESULTATEN\n")

        if working_models:
            print(f"✅ {len(working_models)} werkende model(s):\n")
            for model in working_models:
                print(f"   • {model}")

            print(f"\n💡 GEBRUIK DEZE IN JE SCRIPT:")
            print(f"\n   MODEL = '{working_models[0]}'")

        else:
            print("❌ Geen werkende models gevonden!")
            print("\nMogelijke oorzaken:")
            print("   • API key heeft geen toegang tot Gemini")
            print("   • API key is incorrect")
            print("   • Google AI Studio account is niet geactiveerd")
            print("\n💡 Check: https://aistudio.google.com/apikey")

        print(f"\n{'=' * 70}")

    except Exception as e:
        print(f"\n❌ FOUT: {e}")
        print("\nCheck:")
        print("   1. Is je API key correct?")
        print("   2. Heb je google-generativeai geïnstalleerd?")
        print("      pip install google-generativeai")

if __name__ == "__main__":
    test_models()
