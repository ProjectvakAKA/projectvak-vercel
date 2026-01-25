"""
GEMINI QUOTA STATUS CHECKER
Shows your current API usage and limits
"""

from google import genai
import time

# Your API keys
GEMINI_API_KEY_ORGANIZE = 'AIzaSyChRUNA5jpUu67uT8csZbHjsfE8rnhy4Rg'
GEMINI_API_KEY_ANALYZE = 'AIzaSyBu_7vIHcOzMUBdrZ_JVqEGlRO9C2LlILo'

def test_quota_with_retries(api_key, key_name):
    """Test quota by doing multiple calls"""
    print(f"\n{'='*60}")
    print(f"Testing Quota: {key_name}")
    print(f"{'='*60}")

    try:
        client = genai.Client(api_key=api_key)

        # Get models
        all_models = client.models.list()
        generative_models = []

        for m in all_models:
            model_name = m.name.replace('models/', '')
            if 'gemini' in model_name.lower() and 'embedding' not in model_name.lower():
                generative_models.append(model_name)

        if not generative_models:
            print("❌ No models available")
            return False

        test_model = generative_models[0]
        print(f"Using model: {test_model}")

        # Try 5 quick calls to test rate limiting
        print("\nTesting rate limits (5 calls)...")
        success_count = 0

        for i in range(5):
            try:
                response = client.models.generate_content(
                    model=test_model,
                    contents=f"Say the number {i+1}"
                )
                success_count += 1
                print(f"  Call {i+1}: ✓ Success")
                time.sleep(0.5)  # Small delay

            except Exception as e:
                error_str = str(e).lower()

                if '429' in error_str or 'quota' in error_str or 'resource_exhausted' in error_str:
                    print(f"  Call {i+1}: ❌ QUOTA/RATE LIMIT HIT")
                    print(f"\n⚠️  ERROR DETAILS: {str(e)[:200]}")

                    if 'quota' in error_str:
                        print("\n💡 DAILY QUOTA EXCEEDED")
                        print("   - Free tier: ~1500 requests/day")
                        print("   - Vision/OCR uses more quota")
                        print("   - Resets at midnight Pacific Time")

                    if '429' in error_str or 'rate' in error_str:
                        print("\n💡 RATE LIMIT HIT")
                        print("   - Free tier: ~15 requests/minute")
                        print("   - Wait 60 seconds between batches")

                    return False
                else:
                    print(f"  Call {i+1}: ❌ {str(e)[:100]}")
                    return False

        print(f"\n✅ All {success_count} calls succeeded!")
        print("✓ No immediate quota issues detected")

        # Check if we can do a vision call (uses more quota)
        print("\nTesting Vision API (OCR simulation)...")
        try:
            # Simple vision test
            from google.genai import types

            # Create a tiny test image (1x1 pixel)
            import io
            from PIL import Image

            img = Image.new('RGB', (1, 1), color='white')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')

            parts = [
                types.Part.from_text("What color is this?"),
                types.Part.from_bytes(data=img_bytes.getvalue(), mime_type="image/png")
            ]

            response = client.models.generate_content(
                model=test_model,
                contents=parts
            )

            print("  ✓ Vision API works")

        except Exception as e:
            error_str = str(e).lower()
            if '429' in error_str or 'quota' in error_str:
                print("  ❌ Vision API quota exceeded")
                print(f"     {str(e)[:150]}")
                return False
            else:
                print(f"  ⚠️  Vision test failed (but might be OK): {str(e)[:100]}")

        return True

    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False


def check_free_tier_limits():
    """Show free tier limits"""
    print(f"\n{'='*60}")
    print("GEMINI FREE TIER LIMITS")
    print(f"{'='*60}")
    print("""
📊 Rate Limits:
   - 15 requests per minute (RPM)
   - 1 million tokens per minute (TPM)
   - 1,500 requests per day (RPD)

🖼️  Vision API (OCR):
   - Uses MORE quota per request
   - Images count as extra tokens
   - ~10-20x more expensive than text

⏰ Quota Reset:
   - Daily limits reset at midnight Pacific Time
   - Rate limits reset every minute

💡 Tips:
   - Wait 4+ seconds between requests (15 RPM = 1 per 4s)
   - Batch process max 10-15 docs per session
   - Use OCR only when needed
   - Check quota at: https://aistudio.google.com/app/apikey
""")


def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║           GEMINI QUOTA STATUS CHECKER                        ║
╚══════════════════════════════════════════════════════════════╝
""")

    # Show limits first
    check_free_tier_limits()

    # Test organize key
    org_ok = test_quota_with_retries(GEMINI_API_KEY_ORGANIZE, "ORGANIZE KEY")

    print("\n" + "="*60)
    time.sleep(2)  # Brief pause

    # Test analyze key
    ana_ok = test_quota_with_retries(GEMINI_API_KEY_ANALYZE, "ANALYZE KEY")

    # Final summary
    print(f"\n{'='*60}")
    print("QUOTA STATUS SUMMARY")
    print(f"{'='*60}")

    if org_ok and ana_ok:
        print("✅ BOTH KEYS: Quota available")
        print("\n💡 You can start processing documents!")
    elif not org_ok and not ana_ok:
        print("❌ BOTH KEYS: Quota exhausted")
        print("\n⏰ Wait until midnight Pacific Time for reset")
        print("🔗 Check status: https://aistudio.google.com/app/apikey")
    else:
        if not org_ok:
            print("❌ ORGANIZE KEY: Quota exhausted")
        if not ana_ok:
            print("❌ ANALYZE KEY: Quota exhausted")
        print("\n⚠️  At least one key has quota issues")

    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()