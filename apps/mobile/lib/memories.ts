import { api, ApiError } from "./api";

// The engine on mobile: Bring a page back (a scoped two-pass run), On This Day
// (date-based resurfacing), Returns (the archive of what the engine surfaced),
// and Look Back (every date-based way a page returns). Mirrors the web hooks
// (use-on-this-day, use-look-back, run-job) and the same backend endpoints, so
// the native surface reads the exact same contract — never a second engine.
// (Phase 0.x swaps these hand-typed shapes for @workspace/api-zod once Metro
// monorepo resolution is set up.)

// --- Shapes (mirror lib/api-client-react schemas + the memories route) ---

// A surfaced page the engine chose to return (toMemory in routes/memories.ts).
export interface Memory {
  id: string;
  label?: string | null;
  observation?: string | null;
  quote?: string | null;
  quoteDate?: string | null;
  lens?: string | null;
  journalEntryId?: string | null;
  dismissed: boolean;
  favorite: boolean;
  createdAt: string;
  openedAt?: string | null;
}

export interface MemoryRunResult {
  surfaced: boolean;
  reason?: string | null;
  supportMessage?: string | null;
  memory?: Memory;
}

// One date-based memory (GET /memories/on-this-day). onThisExactDay is only on
// the exact-day shape; the wider buckets (around-this-time, favorites) omit it.
export interface DateMemory {
  entryId: string;
  title: string | null;
  excerpt: string;
  entryDate: string;
  favorite: boolean;
  yearsAgo: number;
  onThisExactDay?: boolean;
}

// The Look Back browse payload (GET /memories/look-back).
export interface LookBack {
  onThisDay: DateMemory[];
  aroundThisTime: DateMemory[];
  favorites: DateMemory[];
  forgotten: DateMemory[];
}

// --- Helpers ---

// Local calendar day as YYYY-MM-DD; the date window must match the reader's
// calendar, so we pass the device's local day (mirrors the web's localTodayISO).
export function localTodayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

// "A year ago today" / "7 years ago, around this day" — honest about whether
// it's the exact calendar day or merely near it.
export function onThisDayLabel(m: {
  yearsAgo: number;
  onThisExactDay?: boolean;
}): string {
  const span = m.yearsAgo === 1 ? "A year ago" : `${m.yearsAgo} years ago`;
  return m.onThisExactDay ? `${span} today` : `${span}, around this day`;
}

// What each lens means, in the reader's language (never shown as a "lens").
// Mirrors the web's LENS_LABELS so the heading is identical across surfaces.
export const LENS_LABELS: Record<string, string> = {
  memory: "A page from then",
  thread: "What kept returning",
  distance: "How far you've come",
  wisdom: "Something you seemed to know",
  value_signal: "What mattered then",
  becoming: "Who you were becoming",
  survival: "What you carried through",
};

// --- Bring a page back (the costly two-pass run) ---

// Poll an async memory job (ADR 0002) to completion, then resolve to the same
// shape a synchronous run returns. Bounded (~4 min) so it never spins forever.
async function pollRunJob(jobId: string): Promise<MemoryRunResult> {
  for (let i = 0; i < 80; i++) {
    const r = await api<{ status: string; result?: MemoryRunResult }>(
      `/memories/jobs/${jobId}`,
    );
    if (r.status === "done" && r.result) return r.result;
    if (r.status === "error") return { surfaced: false, reason: "error" };
    await new Promise((res) => setTimeout(res, 3000));
  }
  return { surfaced: false, reason: "error" };
}

// POST /memories/run. The run may come back synchronously (a result) or as an
// async job to poll (ADR 0002). A 402 means the free quota is spent (only when
// enforcement is on) — surface it as a calm "quota" reason rather than an error.
export async function bringPageBack(): Promise<MemoryRunResult> {
  try {
    const resp = await api<MemoryRunResult & { jobId?: string }>(
      "/memories/run",
      { method: "POST", body: {} },
    );
    if (resp && typeof resp.jobId === "string") return pollRunJob(resp.jobId);
    return resp as MemoryRunResult;
  } catch (err) {
    if (err instanceof ApiError && err.status === 402) {
      return { surfaced: false, reason: "quota" };
    }
    throw err;
  }
}

// --- On This Day / Look Back (date-based, free, no model call) ---

export const getOnThisDay = (date = localTodayISO()) =>
  api<DateMemory[]>(`/memories/on-this-day?date=${date}`);

export const getLookBack = (date = localTodayISO()) =>
  api<LookBack>(`/memories/look-back?date=${date}`);

// --- Returns archive ---

export const listMemories = () => api<Memory[]>("/memories");

export const updateMemory = (
  id: string,
  patch: Partial<{ favorite: boolean; dismissed: boolean; opened: boolean }>,
) => api<Memory>(`/memories/${id}`, { method: "PATCH", body: patch });
