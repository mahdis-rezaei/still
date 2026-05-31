import { useState } from "react";
import { useStill } from "@/lib/store";

export function DevPanel() {
  const { scoreResult } = useStill();
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV || !scoreResult) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end">
      {isOpen && (
        <div className="mb-2 w-[500px] max-w-[90vw] max-h-[80vh] overflow-auto bg-gray-900 text-green-400 font-mono text-xs p-4 rounded shadow-2xl border border-gray-700">
          <h3 className="text-white font-bold mb-2">Dev Panel: Score Result</h3>
          <div className="mb-4 text-gray-300">
            <strong>Register:</strong> {scoreResult.register} <br/>
            <strong>Overall Why:</strong> {scoreResult.why}
          </div>
          
          <div className="flex flex-col gap-4">
            {scoreResult.scores.map((score, i) => (
              <div key={i} className="border border-gray-700 p-2 rounded bg-gray-800/50">
                <div className="font-bold text-blue-300 mb-1">{score.function}</div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <div>Persistence: {score.persistence}</div>
                  <div>Pers. Function: {score.persistence_of_function}</div>
                  <div>Recognition: {score.recognition}</div>
                  <div>Endurance Not Wound: {score.endurance_not_wound}</div>
                  <div>Safety: {score.safety}</div>
                  <div className={score.surfaceable ? "text-green-400 font-bold" : "text-red-400"}>
                    Surfaceable: {String(score.surfaceable)}
                  </div>
                </div>
                <div className="text-gray-400 mt-1">
                  <strong>Why:</strong> {score.why}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-900 text-white font-mono text-xs px-3 py-1 rounded shadow hover:bg-gray-800"
      >
        {isOpen ? "Close Dev" : "Dev Panel"}
      </button>
    </div>
  );
}
