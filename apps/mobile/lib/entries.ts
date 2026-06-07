import { api } from "./api";

// Journal entries + reflections, over the shared backend. (Phase 0.x will swap the
// hand-typed shapes for @workspace/api-zod once Metro monorepo resolution is set.)

export interface Entry {
  id: string;
  title?: string | null;
  body: string;
  bodyRich?: string | null;
  entryDate?: string | null;
  source: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reflection {
  id: string;
  journalEntryId: string;
  body: string;
  reflectionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listEntries = () => api<Entry[]>("/entries");
export const getEntry = (id: string) => api<Entry>(`/entries/${id}`);

export const createEntry = (input: {
  body: string;
  entryDate?: string;
  title?: string;
}) => api<Entry>("/entries", { method: "POST", body: input });

export const updateEntry = (
  id: string,
  patch: Partial<{ body: string; title: string | null; favorite: boolean }>,
) => api<Entry>(`/entries/${id}`, { method: "PATCH", body: patch });

export const listReflections = (id: string) =>
  api<Reflection[]>(`/entries/${id}/reflections`);

export const addReflection = (id: string, body: string) =>
  api<Reflection>(`/entries/${id}/reflections`, {
    method: "POST",
    body: { body },
  });

// Local calendar day as YYYY-MM-DD (matches the web's todayISO).
export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function longDate(iso?: string | null): string {
  if (!iso) return "Undated";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
