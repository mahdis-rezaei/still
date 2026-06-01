import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type {
  ScoreResult,
  ExtractResult,
} from "@workspace/api-client-react/src/generated/api.schemas";

const STORAGE_KEY = "still:saved_result";

interface SavedEntry {
  result: ScoreResult;
  savedAt: string;
}

interface StillState {
  entries: string;
  setEntries: (entries: string) => void;
  extractResult: ExtractResult | null;
  setExtractResult: (result: ExtractResult | null) => void;
  scoreResult: ScoreResult | null;
  setScoreResult: (result: ScoreResult | null) => void;
  savedAt: Date | null;
  reset: () => void;
}

const StillContext = createContext<StillState | undefined>(undefined);

function loadFromStorage(): SavedEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedEntry;
  } catch {
    return null;
  }
}

function saveToStorage(result: ScoreResult) {
  try {
    const entry: SavedEntry = { result, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export function StillProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState("");
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [scoreResult, setScoreResultState] = useState<ScoreResult | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setScoreResultState(saved.result);
      setSavedAt(new Date(saved.savedAt));
    }
  }, []);

  const setScoreResult = (result: ScoreResult | null) => {
    setScoreResultState(result);
    if (result) {
      saveToStorage(result);
      setSavedAt(new Date());
    }
  };

  const reset = () => {
    setEntries("");
    setExtractResult(null);
    setScoreResultState(null);
    setSavedAt(null);
    clearStorage();
  };

  return (
    <StillContext.Provider
      value={{
        entries,
        setEntries,
        extractResult,
        setExtractResult,
        scoreResult,
        setScoreResult,
        savedAt,
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
