import type { EngineResult, Fixture } from "./types";
import { recordings } from "./recordings";

// How the harness gets an EngineResult for a fixture.
//
//   STILL_MODE=recording  (default) — replay captured outputs from recordings.ts.
//       Runs fully offline; great for reproducing known results and for CI of the
//       harness itself. Fixtures without a recording are skipped.
//
//   STILL_MODE=http  — call the live engine. Set STILL_API_URL (e.g.
//       http://localhost:5000). The ONLY engine-specific code is normalizeResponse
//       below — adjust it to match the live engine's JSON and nothing else changes.

const MODE = process.env.STILL_MODE ?? "recording";
const API_URL = process.env.STILL_API_URL ?? "http://localhost:5000";

export interface EngineOutcome {
  status: "ok" | "skipped" | "error";
  result?: EngineResult;
  reason?: string;
}

export async function runEngine(fx: Fixture): Promise<EngineOutcome> {
  if (MODE === "recording") {
    const rec = recordings[fx.id];
    return rec
      ? { status: "ok", result: rec }
      : {
          status: "skipped",
          reason: "no recording (run STILL_MODE=http against the live engine)",
        };
  }

  if (MODE === "http") {
    try {
      const res = await fetch(`${API_URL}/still/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entries: fx.entry,
          mode: "wisdom",
          debug: true,
        }),
      });
      if (!res.ok) return { status: "error", reason: `HTTP ${res.status}` };
      const raw = (await res.json()) as unknown;
      return { status: "ok", result: normalizeResponse(raw) };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  }

  return { status: "error", reason: `unknown STILL_MODE: ${MODE}` };
}

// EDIT THIS to match the live engine. Maps the raw debug response into the
// normalized EngineResult the checks understand. The default assumes a shape
// close to the dev panel (candidates[] with scores/gates, plus a result block).
function normalizeResponse(raw: unknown): EngineResult {
  const r = raw as any;
  const candidates = (r.candidates ?? r.pass1 ?? []).map((c: any) => ({
    lens: c.lens ?? c.register ?? "unknown",
    fragments: Array.isArray(c.fragments)
      ? c.fragments.map((f: any) =>
          typeof f === "string" ? f : (f.text ?? f.fragment ?? ""),
        )
      : (c.evidence?.map((e: any) => e.fragment ?? e.text ?? "") ?? []),
    scores: {
      center: c.scores?.center ?? c.center,
      specific: c.scores?.specific ?? c.specific,
      discovery: c.scores?.discovery ?? c.discovery,
      contra: c.scores?.contra ?? c.contra,
      worth: c.scores?.worth ?? c.worth,
    },
    gates: {
      floors: c.gates?.floors ?? c.floors,
      perspective: c.gates?.perspective ?? c.perspective,
      evidence: c.gates?.evidence ?? c.evidence,
    },
    resolutionPenalized: c.resolutionPenalized ?? c.resolution_penalized,
    surfaceable: c.surfaceable,
    why: c.why,
  }));

  const result = r.result ?? r.pass2 ?? {};
  return {
    mode: r.mode,
    candidates,
    result: {
      register: result.register ?? "nothing",
      label: result.label ?? null,
      observation: result.observation ?? null,
      quotes: (result.quotes ?? []).map((q: any) => ({
        date: q.date ?? "",
        text: q.text ?? q.fragment ?? "",
      })),
      wonAt: result.wonAt ?? result.won_at,
      why: result.why,
    },
  };
}

export const mode = MODE;
