import { useState } from "react";
import { useStill } from "@/lib/store";

const THRESHOLD = 4;

function S({ n }: { n: number | undefined }) {
  if (n === undefined) return <span className="text-gray-600">—</span>;
  const color =
    n >= THRESHOLD ? "text-green-400" : n === THRESHOLD - 1 ? "text-yellow-400" : "text-red-400";
  return <span className={color}>{n}</span>;
}

const REGISTER_COLORS: Record<string, string> = {
  thread: "text-purple-300",
  memory: "text-blue-300",
  distance: "text-teal-300",
  value_signal: "text-amber-300",
  becoming: "text-pink-300",
  survival: "text-orange-300",
};

export function DevPanel() {
  const { extractResult, scoreResult } = useStill();
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV) return null;
  if (!extractResult && !scoreResult) return null;

  const scoreMap = new Map(
    (scoreResult?.scores ?? []).map((s) => [s.function, s])
  );

  const registerColor = scoreResult?.register
    ? REGISTER_COLORS[scoreResult.register] ?? "text-gray-300"
    : "text-gray-500";

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end">
      {isOpen && (
        <div className="mb-2 w-[600px] max-w-[95vw] max-h-[85vh] overflow-auto bg-gray-950 text-gray-200 font-mono text-[11px] p-4 rounded shadow-2xl border border-gray-700 leading-relaxed">

          {/* Header */}
          <div className="text-white font-bold text-sm mb-3 border-b border-gray-700 pb-2 flex justify-between items-center">
            <span>Still Dev Panel</span>
            <span className="text-gray-400 font-normal">
              register:{" "}
              <span className={`font-bold ${registerColor}`}>
                {scoreResult?.register ?? "—"}
              </span>
            </span>
          </div>

          {/* Pass 1 candidates */}
          <div className="mb-4">
            <div className="text-yellow-300 font-bold mb-2">
              PASS 1 — Candidates ({extractResult?.candidates.length ?? 0})
            </div>
            {(extractResult?.candidates ?? []).length === 0 && (
              <div className="text-gray-500 italic">No candidates extracted.</div>
            )}
            {(extractResult?.candidates ?? []).map((c, i) => {
              const s = scoreMap.get(c.function);
              const failed = s
                ? [
                    s.safety < 5 && `safety=${s.safety} (disqualifying)`,
                    s.evidence_strength < THRESHOLD && `evidence_strength=${s.evidence_strength} < ${THRESHOLD}`,
                    s.recognition < THRESHOLD && `recognition=${s.recognition} < ${THRESHOLD}`,
                    s.worth_returning_to < THRESHOLD && `worth_returning_to=${s.worth_returning_to} < ${THRESHOLD}`,
                    s.perspective_not_wound < THRESHOLD && `perspective_not_wound=${s.perspective_not_wound} < ${THRESHOLD}`,
                  ].filter(Boolean)
                : [];

              const rcolor = REGISTER_COLORS[c.register] ?? "text-gray-300";

              return (
                <div key={i} className="mb-3 border border-gray-700 rounded p-2 bg-gray-900/60">
                  <div className="font-bold mb-1 flex items-center gap-2">
                    <span className={`text-[10px] uppercase tracking-wider ${rcolor}`}>[{c.register}]</span>
                    <span className="text-white">{c.function}</span>
                  </div>
                  <div className="text-gray-400 text-[10px] mb-1 italic">{c.description}</div>
                  <div className="text-gray-500 text-[10px] mb-1">
                    {c.evidence.map((e) => (
                      <span key={e.date} className="mr-2">
                        <span className="text-gray-400">{e.date}:</span> "{e.fragment}"
                        {e.source_type !== "journal" && (
                          <span className="text-amber-500 ml-1">({e.source_type})</span>
                        )}
                      </span>
                    ))}
                  </div>
                  {s ? (
                    <div className="mt-1">
                      <div className="flex gap-2 flex-wrap text-[10px] mb-1">
                        <span>evid: <S n={s.evidence_strength} /></span>
                        <span>recog: <S n={s.recognition} /></span>
                        <span>truth: <S n={s.emotional_truth} /></span>
                        <span>safety: <S n={s.safety} /></span>
                        <span>worth: <S n={s.worth_returning_to} /></span>
                        <span>specific: <S n={s.non_horoscope_specificity} /></span>
                        <span>persp: <S n={s.perspective_not_wound} /></span>
                        <span className="font-bold text-gray-300">
                          Σ {(s.evidence_strength + s.recognition + s.emotional_truth + s.safety + s.worth_returning_to + s.non_horoscope_specificity + s.perspective_not_wound)}
                        </span>
                      </div>
                      {s.surfaceable ? (
                        <div className="text-green-400 font-bold text-[10px]">✓ SURFACEABLE</div>
                      ) : (
                        <div className="text-red-400 text-[10px]">
                          ✗ Failed: {failed.length > 0 ? failed.join(", ") : "threshold not met"}
                        </div>
                      )}
                      <div className="text-gray-500 text-[10px] mt-0.5">why: {s.why}</div>
                    </div>
                  ) : (
                    <div className="text-gray-600 text-[10px] italic">Not matched in Pass 2 scores</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pass 2 result */}
          {scoreResult && (
            <div className="border-t border-gray-700 pt-3">
              <div className="text-yellow-300 font-bold mb-2">PASS 2 — Final result</div>
              {scoreResult.label && (
                <div className="text-[10px] mb-1">
                  <span className="text-gray-400">label: </span>
                  <span className={registerColor}>{scoreResult.label}</span>
                </div>
              )}
              <div className="text-gray-400 text-[10px] mb-2">
                <span className="text-gray-300">why: </span>{scoreResult.why}
              </div>
              {scoreResult.observation && (
                <div className="mt-2 border-l-2 border-green-700 pl-2 text-gray-200 italic text-[10px]">
                  {scoreResult.observation}
                </div>
              )}
              {scoreResult.quotes && scoreResult.quotes.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-500 text-[10px] mb-1">Quotes ({scoreResult.quotes.length}):</div>
                  {scoreResult.quotes.map((q, i) => (
                    <div key={i} className="text-[10px] text-gray-400 mb-1">
                      <span className="text-gray-500">{q.date}:</span> "{q.fragment}"
                      {q.source_type !== "journal" && (
                        <span className="text-amber-500 ml-1">({q.source_type})</span>
                      )}
                    </div>
                  ))}
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
