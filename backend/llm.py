import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://router.huggingface.co/v1/chat/completions"
MODEL   = "Qwen/Qwen2.5-7B-Instruct"


def generate_answer(context, question):
    prompt = f"""Answer based only on the context below.
If the answer is not in the context, say "I don't have enough information to answer that."

Context:
{context}

Question: {question}"""

    headers = {
        "Authorization": f"Bearer {os.getenv('HUGGINGFACE_API_KEY')}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user",   "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 512,
    }

    response = requests.post(API_URL, headers=headers, json=payload, timeout=60)

    print("HF Status:", response.status_code)
    print("HF Response:", response.text[:500])

    if response.status_code != 200:
        return f"HF Error {response.status_code}: {response.text}"

    result = response.json()
    return result["choices"][0]["message"]["content"].strip()
