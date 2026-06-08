import { api } from "./api";

// Paste import: bring past journaling in by pasting text. The backend parses it
// into dated entries you review, then confirm. Mirrors the web's paste flow
// (POST /imports/paste → review → PATCH includes → POST confirm).

export type DateConfidence = "high" | "medium" | "low" | "unknown";

export interface ParsedEntry {
  id: string;
  detectedDate?: string | null;
  dateConfidence: DateConfidence;
  body: string;
  title?: string | null;
  include: boolean;
  orderIndex?: number | null;
}

export interface ImportReview {
  id: string;
  source: string;
  status: string;
  parsedCount: number;
  importedCount: number;
  entries: ParsedEntry[];
}

export const pasteImport = (rawText: string) =>
  api<ImportReview>("/imports/paste", { method: "POST", body: { rawText } });

export const getImportReview = (id: string) =>
  api<ImportReview>(`/imports/${id}/review`);

export const updateParsedEntry = (
  importId: string,
  parsedEntryId: string,
  patch: Partial<{
    include: boolean;
    detectedDate: string | null;
    title: string | null;
    body: string;
  }>,
) =>
  api<ParsedEntry>(`/imports/${importId}/parsed/${parsedEntryId}`, {
    method: "PATCH",
    body: patch,
  });

export const confirmImport = (id: string) =>
  api<{ importedCount: number }>(`/imports/${id}/confirm`, { method: "POST" });
