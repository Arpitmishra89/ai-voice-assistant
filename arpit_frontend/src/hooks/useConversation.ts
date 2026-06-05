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
    const current = messagesRef.current;
    const lastIdx = current.length - 1;
    const lastMessage = current[lastIdx];

    if (isFinal) {
      // If we already have a partial user message,
      // replace it with the final transcript
      if (
        hasPartialRef.current &&
        lastIdx >= 0 &&
        lastMessage?.role === "user"
      ) {
        const updated = [...current];

        updated[lastIdx] = {
          ...updated[lastIdx]!,
          content,
        };

        messagesRef.current = updated;
        setMessages(updated);

        hasPartialRef.current = false;
        return;
      }

      // Safety dedupe:
      // Ignore identical consecutive user messages
      if (
        lastMessage &&
        lastMessage.role === "user" &&
        lastMessage.content.trim() === content.trim()
      ) {
        hasPartialRef.current = false;
        return;
      }

      hasPartialRef.current = false;
      addMessage("user", content);
      return;
    }

    // Partial transcript handling
    if (
      hasPartialRef.current &&
      lastIdx >= 0 &&
      lastMessage?.role === "user"
    ) {
      const updated = [...current];

      updated[lastIdx] = {
        ...updated[lastIdx]!,
        content,
      };

      messagesRef.current = updated;
      setMessages(updated);
      return;
    }

    hasPartialRef.current = true;
    addMessage("user", content);
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
