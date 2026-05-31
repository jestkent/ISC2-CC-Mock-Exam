import { useEffect, useState } from "react";
import type { AttemptRow, MasteryRow } from "@/lib/db";
import { clearHistory, fetchAttempts, fetchMasteryRows } from "@/lib/db";
import { QUESTIONS } from "@/lib/questions";

interface Props {
  userId: string;
  onBack: () => void;
}

const RETIRE_THRESHOLD = 3;

export function Progress({ userId, onBack }: Props) {
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [mastery, setMastery] = useState<number>(0);
  const [masteryRows, setMasteryRows] = useState<MasteryRow[]>([]);

  async function refresh() {
    const [a, rows] = await Promise.all([fetchAttempts(userId), fetchMasteryRows(userId)]);
    setAttempts(a);
    setMasteryRows(rows);
    const coreIds = new Set(QUESTIONS.core.map((q) => q.id));
    let n = 0;
    rows.forEach((r) => coreIds.has(r.question_id) && n++);
    setMastery(n);
  }

  useEffect(() => { refresh(); }, [userId]);

  if (!attempts) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const taken = attempts.length;
  const best = taken ? Math.max(...attempts.map((a) => Number(a.pct))) : 0;
  const latest = taken ? Number(attempts[0].pct) : 0;
  const passes = attempts.filter((a) => a.passed).length;
  const passRate = taken ? (passes / taken) * 100 : 0;
  const last20 = attempts.slice(0, 20).slice().reverse();

  // domain mastery across all exams
  const domAgg: Record<string, { total: number; correct: number }> = {};
  for (const a of attempts) {
    for (const [name, d] of Object.entries(a.domains ?? {})) {
      domAgg[name] ??= { total: 0, correct: 0 };
      domAgg[name].total += d.total;
      domAgg[name].correct += d.correct;
    }
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="mb-6 text-sm text-primary">← Home</button>
        <h1 className="font-serif text-3xl mb-8">Progress</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Stat label="Exams taken" value={taken.toString()} />
          <Stat label="Best score" value={`${Math.round(best)}%`} />
          <Stat label="Latest" value={`${Math.round(latest)}%`} />
          <Stat label="Pass rate" value={`${Math.round(passRate)}%`} />
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl">Core mastery</h2>
            <span className="text-primary font-medium">{mastery}/{QUESTIONS.core.length}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${(mastery / QUESTIONS.core.length) * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {mastery >= QUESTIONS.core.length ? "Advanced unlocked." : `${QUESTIONS.core.length - mastery} more to unlock Advanced.`}
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-6 mb-6">
          <h2 className="font-serif text-xl mb-4">Last 20 exams</h2>
          {last20.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exams yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {last20.map((a) => (
                <div key={a.id} className="flex-1 flex flex-col justify-end" title={`${Math.round(Number(a.pct))}%`}>
                  <div
                    className={`rounded-t ${a.passed ? "bg-[color:var(--success)]" : "bg-destructive/70"}`}
                    style={{ height: `${Math.max(4, Number(a.pct))}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-6 mb-6">
          <h2 className="font-serif text-xl mb-4">Domain mastery (all exams)</h2>
          <div className="space-y-3">
            {Object.entries(domAgg).map(([name, d]) => {
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
            {Object.keys(domAgg).length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl">Attempt log</h2>
            {attempts.length > 0 && (
              <button
                onClick={async () => {
                  if (confirm("Delete all attempts and mastery? This cannot be undone.")) {
                    await clearHistory(userId);
                    refresh();
                  }
                }}
                className="text-sm text-destructive"
              >Clear history</button>
            )}
          </div>
          <div className="divide-y divide-border">
            {attempts.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{a.mode}{a.set ? ` · ${a.set}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${a.passed ? "text-[color:var(--success)]" : "text-destructive"}`}>
                    {Math.round(Number(a.pct))}%
                  </div>
                  <div className="text-xs text-muted-foreground">{a.correct}/{a.total}</div>
                </div>
              </div>
            ))}
            {attempts.length === 0 && <p className="text-sm text-muted-foreground py-4">No attempts yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card text-card-foreground rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-serif text-2xl mt-1">{value}</div>
    </div>
  );
}
