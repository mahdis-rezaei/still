import { useState } from "react";
import { useStill } from "@/lib/store";

const THRESHOLD = 4;

function score(n: number | undefined) {
  if (n === undefined) return "—";
  const color =
    n >= THRESHOLD ? "text-green-400" : n === THRESHOLD - 1 ? "text-yellow-400" : "text-red-400";
  return <span className={color}>{n}</span>;
}

export function DevPanel() {
  const { extractResult, scoreResult } = useStill();
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV) return null;
  if (!extractResult && !scoreResult) return null;

  const scoreMap = new Map(
    (scoreResult?.scores ?? []).map((s) => [s.function, s])
  );

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end">
      {isOpen && (
        <div className="mb-2 w-[560px] max-w-[95vw] max-h-[85vh] overflow-auto bg-gray-950 text-gray-200 font-mono text-[11px] p-4 rounded shadow-2xl border border-gray-700 leading-relaxed">

          {/* Header */}
          <div className="text-white font-bold text-sm mb-3 border-b border-gray-700 pb-2 flex justify-between">
            <span>Still Dev Panel</span>
            <span className="text-gray-400">
              register: <span className={scoreResult?.register === "thread" ? "text-green-400" : "text-red-400"}>
                {scoreResult?.register ?? "—"}
              </span>
            </span>
          </div>

          {/* Pass 1 candidates */}
          <div className="mb-4">
            <div className="text-yellow-300 font-bold mb-2">
              PASS 1 — Extracted candidates ({extractResult?.candidates.length ?? 0})
            </div>
            {(extractResult?.candidates ?? []).length === 0 && (
              <div className="text-gray-500 italic">No candidates extracted.</div>
            )}
            {(extractResult?.candidates ?? []).map((c, i) => {
              const s = scoreMap.get(c.function);
              const failed = s
                ? [
                    s.safety < 5 && `safety=${s.safety} (disqualifying)`,
                    s.persistence < THRESHOLD && `persistence=${s.persistence} < ${THRESHOLD}`,
                    s.persistence_of_function < THRESHOLD && `pers_fn=${s.persistence_of_function} < ${THRESHOLD}`,
                    s.recognition < THRESHOLD && `recognition=${s.recognition} < ${THRESHOLD}`,
                    s.endurance_not_wound < THRESHOLD && `endurance=${s.endurance_not_wound} < ${THRESHOLD}`,
                  ].filter(Boolean)
                : [];
              return (
                <div key={i} className="mb-3 border border-gray-700 rounded p-2 bg-gray-900/60">
                  <div className="font-bold text-blue-300 mb-1">
                    [{i + 1}] {c.function}
                    <span className="ml-2 text-gray-500 font-normal">({c.type})</span>
                  </div>
                  <div className="text-gray-400 text-[10px] mb-1 italic">{c.surface_variation}</div>
                  <div className="text-gray-500 text-[10px] mb-1">
                    Evidence: {c.evidence.map((e) => `${e.date}: "${e.fragment}"`).join(" · ")}
                  </div>
                  {s ? (
                    <div className="mt-1">
                      <div className="flex gap-3 flex-wrap text-[10px] mb-1">
                        <span>persist: {score(s.persistence)}</span>
                        <span>pers_fn: {score(s.persistence_of_function)}</span>
                        <span>recog: {score(s.recognition)}</span>
                        <span>endure: {score(s.endurance_not_wound)}</span>
                        <span>safety: {score(s.safety)}</span>
                        <span className="font-bold">
                          total: {s.persistence + s.persistence_of_function + s.recognition + s.endurance_not_wound + s.safety}
                        </span>
                      </div>
                      {s.surfaceable ? (
                        <div className="text-green-400 font-bold text-[10px]">✓ SURFACEABLE — winner candidate</div>
                      ) : (
                        <div className="text-red-400 text-[10px]">
                          ✗ Failed: {failed.length > 0 ? failed.join(", ") : "threshold not met"}
                        </div>
                      )}
                      <div className="text-gray-500 text-[10px] mt-1">why: {s.why}</div>
                    </div>
                  ) : (
                    <div className="text-gray-600 text-[10px] italic">Not scored (no matching score entry)</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pass 2 overall */}
          {scoreResult && (
            <div className="border-t border-gray-700 pt-3">
              <div className="text-yellow-300 font-bold mb-1">PASS 2 — Selection result</div>
              <div className="text-gray-400 mb-1">
                <span className="text-white">why:</span> {scoreResult.why}
              </div>
              {scoreResult.thread && (
                <div className="mt-2 border-l-2 border-green-600 pl-2 text-gray-200 italic">
                  "{scoreResult.thread}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-900 text-white font-mono text-[11px] px-3 py-1.5 rounded shadow hover:bg-gray-800 border border-gray-700"
      >
        {isOpen ? "✕ close dev" : "⚙ dev"}
      </button>
    </div>
  );
}
