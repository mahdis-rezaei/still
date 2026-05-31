import React, { createContext, useContext, useState, ReactNode } from "react";
import type { ScoreResult } from "@workspace/api-client-react/src/generated/api.schemas";

interface StillState {
  entries: string;
  setEntries: (entries: string) => void;
  scoreResult: ScoreResult | null;
  setScoreResult: (result: ScoreResult | null) => void;
  reset: () => void;
}

const StillContext = createContext<StillState | undefined>(undefined);

export function StillProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState("");
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);

  const reset = () => {
    setEntries("");
    setScoreResult(null);
  };

  return (
    <StillContext.Provider
      value={{
        entries,
        setEntries,
        scoreResult,
        setScoreResult,
        reset,
      }}
    >
      {children}
    </StillContext.Provider>
  );
}

export function useStill() {
  const context = useContext(StillContext);
  if (context === undefined) {
    throw new Error("useStill must be used within a StillProvider");
  }
  return context;
}
