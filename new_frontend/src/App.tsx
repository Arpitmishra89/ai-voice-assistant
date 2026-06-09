import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "./components/Navbar/Navbar";
import { MicButton } from "./components/MicButton/MicButton";
import { ConversationPanel } from "./components/ConversationPanel/ConversationPanel";
import { AudioControls } from "./components/AudioControls/AudioControls";
import { ErrorToast } from "./components/ErrorToast/ErrorToast";
import { useMicrophone } from "./hooks/useMicrophone";
import { useLiveKit } from "./hooks/useLiveKit";
import { useAgentState } from "./hooks/useAgentState";
import { useConversation } from "./hooks/useConversation";
import type { ListeningStatus } from "./types/voice";

function App() {
  const conversation = useConversation();
  const agentStateHook = useAgentState();

  const [localError, setLocalError] = useState<string | null>(null);

  const onDataEvent = useCallback(
    (event: { type: string; content?: string; state?: string; is_final?: boolean }) => {
      switch (event.type) {
        case "user_message":
          if (event.content) {
            conversation.updateOrAddUserMessage(event.content, event.is_final !== false);
          }
          break;
        case "assistant_message":
          if (event.content) {
            conversation.addAssistantMessage(event.content);
          }
          break;
        case "agent_state":
          if (event.state) {
            agentStateHook.setFromString(event.state);
          }
          break;
      }
    },
    [conversation, agentStateHook],
  );

  const livekit = useLiveKit(onDataEvent);

  // Use LiveKit's local audio track for mic visualization (avoids dual getUserMedia)
  const audio = useMicrophone(livekit.localAudioTrack);

  const [isMuted, setIsMuted] = useState(false);
  const mutedRef = useRef(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const sessionStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayError = localError || livekit.error;

  const startSession = useCallback(async () => {
    setLocalError(null);
    try {
      await livekit.connect();
      await livekit.setMicEnabled(true);
      await audio.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setLocalError(msg);
      audio.stop();
      return;
    }
  }, [audio, livekit]);

  const stopSession = useCallback(async () => {
    audio.stop();
    await livekit.setMicEnabled(false);
    await livekit.disconnect();
    agentStateHook.reset();
  }, [audio, livekit, agentStateHook]);

  const resetSession = useCallback(async () => {
    await stopSession();
    conversation.clear();
    setSessionDuration(0);
    setLocalError(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    sessionStartRef.current = null;
  }, [stopSession, conversation]);

  const handleMicClick = useCallback(async () => {
    if (livekit.isMicEnabled) {
      await stopSession();
    } else {
      await startSession();
    }
  }, [livekit.isMicEnabled, startSession, stopSession]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      return next;
    });
  }, []);

  const dismissError = useCallback(() => {
    setLocalError(null);
  }, []);

  // Session timer
  useEffect(() => {
    if (audio.isActive) {
      if (sessionStartRef.current === null) {
        sessionStartRef.current = Date.now();
      }
      timerRef.current = setInterval(() => {
        if (sessionStartRef.current) {
          setSessionDuration(Math.floor((Date.now() - sessionStartRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      sessionStartRef.current = null;
      setSessionDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [audio.isActive]);

  const listeningStatus: ListeningStatus = livekit.isMicEnabled ? "listening" : "idle";

  const backgroundIntensity = livekit.isMicEnabled
    ? 0.03 + audio.audioLevel * 0.04
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar
        connectionStatus={livekit.connectionStatus}
        listeningStatus={listeningStatus}
        onSettingsClick={() => {}}
      />

      <ErrorToast message={displayError} onDismiss={dismissError} />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-8 pt-20 sm:px-6">
        <motion.div
          className="pointer-events-none fixed inset-0"
          initial={false}
          animate={{
            background: livekit.isMicEnabled
              ? `radial-gradient(600px circle at 50% 40%, rgba(139, 92, 246, ${backgroundIntensity}), transparent 80%)`
              : agentStateHook.agentState === "thinking"
                ? "radial-gradient(600px circle at 50% 40%, rgba(251, 191, 36, 0.03), transparent 80%)"
                : agentStateHook.agentState === "speaking"
                  ? "radial-gradient(600px circle at 50% 40%, rgba(52, 211, 153, 0.03), transparent 80%)"
                  : "transparent",
          }}
          transition={{ duration: 0.5 }}
        />

        <AnimatePresence mode="wait">
          {displayError && (
            <motion.div
              key="error-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm"
            >
              {displayError}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 sm:mb-12"
        >
          <MicButton
            isListening={livekit.isMicEnabled}
            isMuted={isMuted}
            audioLevel={audio.audioLevel}
            onClick={handleMicClick}
          />
        </motion.div>

        <div className="mb-6 w-full max-w-2xl">
          <ConversationPanel messages={conversation.messages} />
        </div>

        <AudioControls
          isListening={livekit.isMicEnabled}
          isMuted={isMuted}
          sessionDuration={sessionDuration}
          onToggleListening={handleMicClick}
          onToggleMute={toggleMute}
          onReset={resetSession}
        />
      </div>
    </div>
  );
}

export default App;
