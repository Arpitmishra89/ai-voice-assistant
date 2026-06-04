from dotenv import load_dotenv
load_dotenv()

import os
import sys

from livekit.plugins.deepgram import STT as DeepgramSTT, TTS as DeepgramTTS
from livekit.plugins.groq import LLM as GroqLLM
from livekit.plugins.silero import VAD as SileroVAD


_initialized = False


def _ensure_env():
    global _initialized
    if _initialized:
        return
    missing = []
    if not os.getenv("DEEPGRAM_API_KEY"):
        missing.append("DEEPGRAM_API_KEY")
    if not os.getenv("GROQ_API_KEY"):
        missing.append("GROQ_API_KEY")
    if not os.getenv("LIVEKIT_API_KEY"):
        missing.append("LIVEKIT_API_KEY")
    if not os.getenv("LIVEKIT_API_SECRET"):
        missing.append("LIVEKIT_API_SECRET")
    if missing:
        print(f"[ENV] Missing: {', '.join(missing)}")
        sys.exit(1)
    _initialized = True
    print("[ENV] All required keys present")


def create_stt():
    _ensure_env()
    return DeepgramSTT(
        model="nova-3",
        language="en-US",
        smart_format=True,
        interim_results=True,
    )


def create_llm():
    _ensure_env()
    return GroqLLM(
        model="llama-3.3-70b-versatile",
        temperature=0.6,
    )


def create_tts():
    _ensure_env()
    return DeepgramTTS(
        model="aura-asteria-en",
    )


def create_vad():
    _ensure_env()
    vad = SileroVAD.load(
        activation_threshold=0.3,
        deactivation_threshold=0.4,
        min_silence_duration=0.3,
        prefix_padding_duration=0.3,
        sample_rate=16000,
    )
    return vad
