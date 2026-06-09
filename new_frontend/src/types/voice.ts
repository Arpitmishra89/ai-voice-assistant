import type { ConnectionStatus, AgentState } from "./state";
import type { Message, DataChannelEvent } from "./message";

export type { ConnectionStatus, AgentState, Message, DataChannelEvent };

export type ListeningStatus = "idle" | "listening" | "processing";

export interface VoiceState {
  isListening: boolean;
  isConnected: boolean;
  isMuted: boolean;
  status: ListeningStatus;
  connectionStatus: ConnectionStatus;
  audioLevel: number;
  messages: Message[];
}

export interface MicrophoneCallbacks {
  onAudioLevel: (level: number) => void;
  onError: (error: string) => void;
}

export interface AudioServiceInterface {
  startListening: (callbacks: MicrophoneCallbacks) => Promise<void>;
  stopListening: () => void;
  isListening: () => boolean;
  cleanup: () => void;
}
