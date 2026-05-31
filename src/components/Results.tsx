import { useState } from "react";
import { Check, X as XIcon } from "lucide-react";
import type { ExamState, ResultSummary } from "@/lib/exam";
import { PASS_PCT } from "@/lib/questions";

interface Props {
  state: ExamState;
  summary: ResultSummary;
  onHome: () => void;
  onPracticeMistakes: () => void;
  onReviewAll: () => void;
}

export function Results({ state, summary, onHome, onPracticeMistakes, onReviewAll }: Props) {
  const [reviewMode, setReviewMode] = useState<"none" | "wrong" | "all">("none");

  if (reviewMode !== "none") {
    return (
      <Review
        state={state}
        onlyWrong={reviewMode === "wrong"}
        onBack={() => setReviewMode("none")}
      />
    );
  }

  const pct = Math.round(summary.pct);
  const passed = summary.passed;

  return (
    <div className="min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Results</div>
          <h1 className="font-serif text-3xl">{state.label}</h1>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-8 shadow-xl flex flex-col sm:flex-row items-center gap-8">
          <Ring pct={pct} passed={passed} />
          <div className="flex-1 text-center sm:text-left">
            <div className={`text-2xl font-serif ${passed ? "text-[color:var(--success)]" : "text-destructive"}`}>
              {passed ? "Passed" : "Did not pass"}
            </div>
            <div className="text-muted-foreground text-sm mt-1">
              {summary.correct} of {summary.total} correct · pass mark {PASS_PCT}%
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
              <button onClick={onHome} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">Home</button>
              {summary.wrongIndices.length > 0 && (
                <button onClick={onPracticeMistakes} className="px-4 py-2 rounded-lg border border-border">Practice my mistakes</button>
              )}
              {summary.wrongIndices.length > 0 && (
                <button onClick={() => setReviewMode("wrong")} className="px-4 py-2 rounded-lg border border-border">Review wrong</button>
              )}
              <button onClick={() => { onReviewAll(); setReviewMode("all"); }} className="px-4 py-2 rounded-lg border border-border">Review all</button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-card text-card-foreground rounded-2xl p-6 shadow">
          <h2 className="font-serif text-xl mb-4">Per-domain breakdown</h2>
          <div className="space-y-3">
            {Object.entries(summary.domains).map(([name, d]) => {
              const p = d.total ? (d.correct / d.total) * 100 : 0;
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="text-muted-foreground tabular-nums">{d.correct}/{d.total} · {Math.round(p)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Ring({ pct, passed }: { pct: number; passed: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const color = passed ? "var(--success)" : "var(--danger)";
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
      <circle cx="70" cy="70" r={r} fill="none" stroke="oklch(0.9 0.01 85)" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="78" textAnchor="middle" fontSize="32" fontFamily="Fraunces, serif" fill="var(--card-foreground)">
        {pct}%
      </text>
    </svg>
  );
}

function Review({ state, onlyWrong, onBack }: { state: ExamState; onlyWrong: boolean; onBack: () => void }) {
  const items = state.items
    .map((it, i) => ({ it, i }))
    .filter(({ it, i }) => !onlyWrong || state.answers[i] !== it.correctDisplayIndex);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="mb-6 text-sm text-primary">← Back to results</button>
        <h1 className="font-serif text-3xl mb-6">Review {onlyWrong ? "wrong answers" : "all answers"}</h1>
        <div className="space-y-4">
          {items.map(({ it, i }) => {
            const picked = state.answers[i];
            return (
              <div key={i} className="bg-card text-card-foreground rounded-xl p-6 shadow">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Q{i + 1} · {it.q.domainName}</div>
                <h3 className="font-serif text-lg mb-4">{it.q.question}</h3>
                <div className="space-y-2 mb-4">
                  {it.optionOrder.map((origIdx, dispIdx) => {
                    const isCorrect = dispIdx === it.correctDisplayIndex;
                    const isPicked = dispIdx === picked;
                    return (
                      <div
                        key={dispIdx}
                        className={`px-4 py-2.5 rounded-lg border text-sm flex items-start gap-3
                          ${isCorrect ? "border-[color:var(--success)] bg-[color:var(--success)]/10" : ""}
                          ${isPicked && !isCorrect ? "border-destructive bg-destructive/10" : ""}
                          ${!isCorrect && !isPicked ? "border-border" : ""}`}
                      >
                        <span className="w-6 text-xs font-medium pt-0.5">{String.fromCharCode(65 + dispIdx)}.</span>
                        <span className="flex-1">{it.q.options[origIdx]}</span>
                        {isCorrect && <Check size={16} className="text-[color:var(--success)]" />}
                        {isPicked && !isCorrect && <XIcon size={16} className="text-destructive" />}
                      </div>
                    );
                  })}
                </div>
                <div className="text-sm bg-muted/50 rounded-lg p-3 border-l-2 border-primary">
                  <strong className="text-primary">Explanation. </strong>{it.q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
