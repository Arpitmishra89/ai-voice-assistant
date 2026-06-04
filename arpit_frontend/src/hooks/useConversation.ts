import { useState, useCallback, useRef } from "react";
import type { Message } from "../types/message";

export interface ConversationHook {
  messages: Message[];
  addUserMessage: (content: string) => void;
  updateOrAddUserMessage: (content: string, isFinal: boolean) => void;
  addAssistantMessage: (content: string) => void;
  clear: () => void;
}

function generateId(counter: number): string {
  return `msg_${counter}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useConversation(): ConversationHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const hasPartialRef = useRef(false);
  const idCounterRef = useRef(0);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    idCounterRef.current += 1;
    const msg: Message = {
      id: generateId(idCounterRef.current),
      role,
      content,
      timestamp: Date.now(),
    };
    messagesRef.current = [...messagesRef.current, msg];
    setMessages(messagesRef.current);
  }, []);

  const addUserMessage = useCallback(
    (content: string) => { addMessage("user", content); },
    [addMessage],
  );

  const updateOrAddUserMessage = useCallback(
    (content: string, isFinal: boolean) => {
      if (isFinal) {
        hasPartialRef.current = false;
        addMessage("user", content);
      } else {
        if (hasPartialRef.current) {
          const current = messagesRef.current;
          const lastIdx = current.length - 1;
          if (lastIdx >= 0 && current[lastIdx]?.role === "user") {
            const updated = [...current];
            updated[lastIdx] = { ...updated[lastIdx]!, content };
            messagesRef.current = updated;
            setMessages(updated);
            return;
          }
        }
        hasPartialRef.current = true;
        addMessage("user", content);
      }
    },
    [addMessage],
  );

  const addAssistantMessage = useCallback(
    (content: string) => { addMessage("assistant", content); },
    [addMessage],
  );

  const clear = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    idCounterRef.current = 0;
  }, []);

  return { messages, addUserMessage, updateOrAddUserMessage, addAssistantMessage, clear };
}
