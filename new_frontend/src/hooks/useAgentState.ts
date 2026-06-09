import { useState, useCallback } from "react";
import type { AgentState } from "../types/state";

export interface AgentStateHook {
  agentState: AgentState;
  setFromString: (state: string) => void;
  reset: () => void;
}

export function useAgentState(): AgentStateHook {
  const [agentState, setAgentState] = useState<AgentState>("idle");

  const setFromString = useCallback((state: string) => {
    switch (state) {
      case "listening":
        setAgentState("listening");
        break;
      case "thinking":
        setAgentState("thinking");
        break;
      case "speaking":
        setAgentState("speaking");
        break;
      case "interrupted":
        setAgentState("interrupted");
        break;
      default:
        setAgentState("idle");
        break;
    }
  }, []);

  const reset = useCallback(() => {
    setAgentState("idle");
  }, []);

  return { agentState, setFromString, reset };
}
