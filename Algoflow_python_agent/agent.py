from __future__ import annotations

from dotenv import load_dotenv
import asyncio
import json
import re
import time
import uuid
from collections.abc import AsyncIterable
from dataclasses import dataclass
from datetime import datetime, timezone

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    cli,
    AgentServer,
    ModelSettings,
)
from livekit import rtc

from ai_clients import create_llm, create_stt, create_tts, create_vad

load_dotenv()

server = AgentServer()

# ── Structured Logging ─────────────────────────────────────────────

@dataclass
class TurnLogger:
    session_id: str = ""
    turn_id: str = ""
    _start: float = 0.0

    def begin_turn(self, session_id: str):
        self.session_id = session_id
        self.turn_id = uuid.uuid4().hex[:8]
        self._start = time.monotonic()
        return self

    def log(self, stage: str, **extra):
        elapsed = time.monotonic() - self._start
        ts = datetime.now(timezone.utc).isoformat()
        parts = [
            f"[TURN:{self.turn_id}]",
            f"[{stage}]",
            f"t={elapsed:.3f}s",
            f"at={ts}",
        ]
        for k, v in extra.items():
            parts.append(f"{k}={v}")
        print(" ".join(parts))

    def end(self):
        total = time.monotonic() - self._start
        self.log("TURN_END", total=f"{total:.3f}s")

    @property
    def elapsed(self) -> float:
        return time.monotonic() - self._start


# ── Separator ──────────────────────────────────────────────────────

RESULT_SEPARATOR = "<<RESULT>>"


def split_response(text: str) -> tuple[str, dict | None]:
    if RESULT_SEPARATOR not in text:
        return text.strip(), None
    parts = text.split(RESULT_SEPARATOR, 1)
    spoken = parts[0].strip()
    raw_json = re.sub(r'^```json\s*', '', parts[1].strip(), flags=re.IGNORECASE)
    raw_json = re.sub(r'\s*```$', '', raw_json)
    try:
        return spoken, json.loads(raw_json)
    except Exception:
        return spoken, None


# ── Agent State ────────────────────────────────────────────────────

class AgentTurnState:
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"
    INTERRUPTED = "interrupted"

    VALID_TRANSITIONS = {
        IDLE: [LISTENING],
        LISTENING: [THINKING, SPEAKING, INTERRUPTED],
        THINKING: [SPEAKING, LISTENING],
        SPEAKING: [LISTENING, THINKING, INTERRUPTED, IDLE],
        INTERRUPTED: [LISTENING],
    }

    def __init__(self):
        self._state = self.IDLE
        self._lock = asyncio.Lock()

    @property
    def state(self) -> str:
        return self._state

    async def transition(self, to: str) -> bool:
        async with self._lock:
            allowed = self.VALID_TRANSITIONS.get(self._state, [])
            if to not in allowed:
                print(f"[STATE] Rejected {self._state} -> {to} (not allowed)")
                return False
            old = self._state
            self._state = to
            print(f"[STATE] {old} -> {to}")
            return True

    async def reset(self):
        async with self._lock:
            self._state = self.IDLE


# ── Voice Assistant ────────────────────────────────────────────────

class VoiceAssistant(Agent):
    def __init__(self):
        self._room: rtc.Room | None = None
        self._session: AgentSession | None = None
        self._state_machine = AgentTurnState()
        self._pending_tasks: list[asyncio.Task] = []
        self._turn_logger = TurnLogger()
        self._greeted = False
        self._greeting_lock = asyncio.Lock()
        self._last_user_transcript = ""
        self._last_user_time = 0.0

        Agent.__init__(self, instructions=("""
            You are a professional hospital receptionist for a modern healthcare clinic.

            Your primary responsibilities are:

            - Welcome patients warmly.
            - Help patients book appointments.
            - Collect patient information.
            - Answer general hospital-related questions.
            - Guide patients through the appointment process.

            IMPORTANT RULES:

            1. Never provide medical diagnoses.
            2. Never prescribe medicines.
            3. Never claim to be a doctor.
            4. Always recommend consulting a qualified doctor for medical concerns.
            5. Keep responses short because this is a voice conversation.
            6. Ask only ONE question at a time.

           When a patient wants to book an appointment, collect the following information step-by-step:

           1. Full Name
           2. Age
           3. Gender
           4. Main health concern or symptoms
           5. How long they have been experiencing the issue
           6. Severity of symptoms
           7. Preferred doctor or department
           8. Contact number

           Do not ask all questions together.

           After collecting information, summarize it clearly and confirm the appointment request.

          Example:

          Patient: I want to book an appointment.

          Receptionist:
          Certainly. May I have your full name?

          Patient: Arpit Mishra

          Receptionist:
          Thank you. What is your age?

          Continue until all required information has been collected.

          Always maintain a polite, professional, and friendly tone."""
        
        ))

    # ── Task tracking ─────────────────────────────────────────────

    def _safe_task(self, coro) -> asyncio.Task:
        task = asyncio.ensure_future(coro)
        self._pending_tasks.append(task)
        task.add_done_callback(lambda t: self._pending_tasks.remove(t) if t in self._pending_tasks else None)
        return task

    async def _cancel_all_tasks(self):
        for t in self._pending_tasks:
            t.cancel()
        if self._pending_tasks:
            await asyncio.gather(*self._pending_tasks, return_exceptions=True)
        self._pending_tasks.clear()

    # ── Data channel ──────────────────────────────────────────────

    async def _publish(self, payload: dict):
        if self._room is None:
            return
        try:
            await self._room.local_participant.publish_data(
                json.dumps(payload).encode("utf-8"),
                reliable=True,
            )
        except Exception as e:
            print(f"[PUBLISH] {e}")

    async def emit_user_message(self, text: str, is_final: bool = True):
        await self._publish({
            "type": "user_message",
            "content": text.strip(),
            "is_final": is_final,
        })

    async def emit_assistant_message(self, text: str):
        await self._publish({
            "type": "assistant_message",
            "content": text.strip(),
        })

    async def emit_agent_state(self, state: str):
        await self._publish({
            "type": "agent_state",
            "state": state,
        })

    # ── Greeting ──────────────────────────────────────────────────

    async def ensure_greeting(self):
        async with self._greeting_lock:
            if self._greeted:
                return
            # Wait until audio pipeline is confirmed ready
            for attempt in range(30):
                if self._room and self._session:
                    try:
                        await self._session.say("Hello! How may I help you?")
                        self._greeted = True
                        print("[GREETING] Sent successfully")
                        return
                    except Exception as e:
                        print(f"[GREETING] Attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(0.5)
            print("[GREETING] Failed after 30 attempts")

    # ── tts_node — streams to TTS progressively ───────────────────

    async def tts_node(
        self,
        text: AsyncIterable[str],
        model_settings: ModelSettings,
    ) -> AsyncIterable[rtc.AudioFrame]:
        """
        Override to:
        1. Stream LLM tokens to TTS progressively (no full-drain)
        2. Strip <<RESULT>> blocks before TTS
        3. Emit transcript simultaneously with audio start
        """
        buffer = ""
        sep_len = len(RESULT_SEPARATOR)
        sep_found = False
        full_spoken = ""

        async def _stream():
            nonlocal buffer, sep_found, full_spoken
            async for chunk in text:
                t = str(chunk)

                if sep_found:
                    buffer += t
                    continue

                buffer += t
                full_spoken += t

                if RESULT_SEPARATOR in buffer:
                    sep_found = True
                    idx = buffer.index(RESULT_SEPARATOR)
                    spoken = buffer[:idx].strip()
                    raw_json = buffer[idx + sep_len:].strip()

                    if full_spoken.strip():
                        self._safe_task(self.emit_assistant_message(full_spoken.strip()))
                        self._turn_logger.log("TRANSCRIPT_EMITTED", chars=len(full_spoken.strip()))
                        if spoken:
                            yield spoken

                    raw_json = re.sub(r'^```json\s*', '', raw_json, flags=re.IGNORECASE)
                    raw_json = re.sub(r'\s*```$', '', raw_json)
                    try:
                        data = json.loads(raw_json.strip())
                        self._safe_task(self._publish({"type": "result", "data": data}))
                        self._turn_logger.log("RESULT_EMITTED", keys=list(data.keys()))
                    except Exception as e:
                        print(f"[TTS_NODE] JSON parse: {e}")
                    return

                # Yield safe portion (keep trailing sep_len chars for cross-chunk detection)
                if len(buffer) > sep_len:
                    safe = len(buffer) - sep_len
                    yieldable = buffer[:safe]
                    buffer = buffer[safe:]
                    if yieldable:
                        yield yieldable

            # End of generator — no separator, yield remaining buffer
            if full_spoken.strip() and not sep_found:
                self._safe_task(self.emit_assistant_message(full_spoken.strip()))
                self._turn_logger.log("TRANSCRIPT_EMITTED", chars=len(full_spoken.strip()))
                if buffer.strip():
                    yield buffer.strip()

        async for chunk in super().tts_node(_stream(), model_settings):  # type: ignore[arg-type]
            yield chunk


# ── Entrypoint ─────────────────────────────────────────────────────

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session_id = uuid.uuid4().hex[:12]
    turn_log = TurnLogger().begin_turn(session_id)
    turn_log.log("JOB_RECEIVED", room=ctx.room.name)

    try:
        await ctx.connect()
        turn_log.log("ROOM_CONNECTED")
    except Exception as e:
        turn_log.log("ROOM_CONNECT_FAILED", error=str(e))
        return

    session = AgentSession(
        stt=create_stt(),
        llm=create_llm(),
        tts=create_tts(),
        vad=create_vad(),
        max_tool_steps=6,
    )

    agent = VoiceAssistant()
    agent._room = ctx.room
    agent._session = session
    agent._turn_logger = turn_log

    # ── User speech transcribed ───────────────────────────────────

    @session.on("user_input_transcribed")
    def on_user_input(event):
       transcript = event.transcript.strip()

       is_final = getattr(event, "is_final", True)

       if not is_final:
        is_final = getattr(event, "final", True)

       if is_final:
        now = time.time()

        if (
            transcript == agent._last_user_transcript
            and (now - agent._last_user_time) < 1.5
        ):
            turn_log.log(
                "DUPLICATE_STT_IGNORED",
                text=transcript[:80],
            )
            return

        agent._last_user_transcript = transcript
        agent._last_user_time = now

        turn_log.log(
            "STT_FINAL",
            text=transcript[:80],
        )

        agent._safe_task(
            agent.emit_user_message(
                transcript,
                is_final=True,
            )
        )

       else:
        turn_log.log(
            "STT_PARTIAL",
            text=transcript[:60],
        )

        agent._safe_task(
            agent.emit_user_message(
                transcript,
                is_final=False,
            )
        )

    # ── Agent state changes ───────────────────────────────────────

    @session.on("agent_state_changed")
    def on_state(event):
        old = event.old_state
        new = event.new_state
        turn_log.log("STATE_CHANGE", old=old, new=new)
        agent._safe_task(agent._state_machine.transition(new))
        agent._safe_task(agent.emit_agent_state(new))

    # ── Conversation item added ───────────────────────────────────

    @session.on("conversation_item_added")
    def on_conversation_item(event):
        item = event.item
        if not hasattr(item, "role") or item.role != "assistant":
            return
        raw = ""
        c = item.content
        if isinstance(c, str):
            raw = c
        elif isinstance(c, list):
            parts = []
            for block in c:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    parts.append(block)
            raw = " ".join(p for p in parts if p).strip()
        elif hasattr(c, "text"):
            raw = str(c.text)
        else:
            raw = str(c)

        raw = raw.strip("[]'\"")
        if raw:
            spoken, _ = split_response(raw)
            if spoken:
                turn_log.log("AGENT_RESPONSE", text=spoken[:120])

    # ── Start session and greet ───────────────────────────────────

    try:
        await session.start(agent=agent, room=ctx.room)
        turn_log.log("SESSION_STARTED")
    except Exception as e:
        turn_log.log("SESSION_FAILED", error=str(e))
        return

    # Greet with readiness check instead of magic sleep
    await agent.ensure_greeting()
    turn_log.end()


if __name__ == "__main__":
    cli.run_app(server)
