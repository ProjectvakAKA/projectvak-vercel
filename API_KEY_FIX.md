# 🔑 Gemini API Key Issue - How to Fix

## Problem
Your Gemini API key is invalid or expired. The error message is:
```
API Key not found. Please pass a valid API key.
```

## Solution

### Step 1: Get a New Gemini API Key

1. Go to: https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Select or create a Google Cloud project
5. Copy the new API key

### Step 2: Update Your .env File

Open `.env` and replace the Gemini API keys:

```bash
# Replace these lines in .env:
GEMINI_API_KEY_ORGANIZE=your_new_api_key_here
GEMINI_API_KEY_ANALYZE=your_new_api_key_here
```

You can use the same key for both, or create separate keys.

### Step 3: Test the Key

Run the test script:
```bash
source venv/bin/activate
python3 test_api_key.py
```

If it says "✓ API key works!", you're good to go!

### Step 4: Run Your Code

```bash
python3 allesfocusophuur.py
```

## Note
The code will still start even with an invalid API key, but Gemini features (AI classification, contract analysis) will fail when used. Dropbox operations will work fine.
