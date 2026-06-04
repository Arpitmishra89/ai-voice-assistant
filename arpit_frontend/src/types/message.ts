export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface DataChannelEvent {
  type: "user_message" | "assistant_message" | "agent_state";
  content?: string;
  state?: string;
}
