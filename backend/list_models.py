import os
import sys
from dotenv import load_dotenv
from google import genai

load_dotenv()

def list_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ No API Key found.")
        return

    client = genai.Client(api_key=api_key)
    print("Checking available models...")
    try:
        for model in client.models.list():
            print(f"- {model.name}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    list_models()
