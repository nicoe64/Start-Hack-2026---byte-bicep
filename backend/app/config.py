import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL        = os.getenv("LLM_MODEL", "claude-haiku-3-5-20241022")
DATA_DIR         = os.path.join(os.path.dirname(__file__), "data")
PROMPTS_DIR      = os.path.join(os.path.dirname(__file__), "prompts")