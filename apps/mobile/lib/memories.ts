import { api, ApiError } from "./api";

// The engine on mobile. Slice 1: "Bring a page back" — a scoped two-pass read of
// your years that returns ONE page worth returning to, or stays honestly silent.
// Same backend endpoints as web (no second engine). Date-based surfaces (On This
// Day, Look Back) and the Returns archive arrive in later slices.

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

// What each lens means, in the reader's language (never shown as a "lens").
// Mirrors the web's LENS_LABELS so the heading reads identically across surfaces.
export const LENS_LABELS: Record<string, string> = {
  memory: "A page from then",
  thread: "What kept returning",
  distance: "How far you've come",
  wisdom: "Something you seemed to know",
  value_signal: "What mattered then",
  becoming: "Who you were becoming",
  survival: "What you carried through",
};

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
