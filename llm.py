import os
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic(
    api_key=os.getenv("API_KEY")
)

response = client.messages.create(
    model="claude-sonnet-4-6'",
    max_tokens=100,
    messages=[
        {"role": "user", "content": "Sag Hallo!"}
    ]
)

print(response.content)