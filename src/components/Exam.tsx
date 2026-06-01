import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, X } from "lucide-react";
import type { ExamState } from "@/lib/exam";
import { saveInProgress, scoreExam } from "@/lib/exam";
import { PASS_PCT } from "@/lib/questions";

interface Props {
  state: ExamState;
  onSubmit: (state: ExamState) => void;
  onExit: () => void;
}

export function Exam({ state: initial, onSubmit, onExit }: Props) {
  const [state, setState] = useState<ExamState>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    saveInProgress(state);
  }, [state]);

  useEffect(() => {
    if (!state.endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.endsAt]);

  useEffect(() => {
    if (state.endsAt && now >= state.endsAt && !submittedRef.current) {
      submittedRef.current = true;
      onSubmit(state);
    }
  }, [now, state, onSubmit]);

  const item = state.items[state.current];
  const remainingMs = state.endsAt ? Math.max(0, state.endsAt - now) : null;

  function setAnswer(i: number) {
    setState((s) => {
      const answers = s.answers.slice();
      answers[s.current] = i;
      return { ...s, answers };
    });
  }
  function toggleFlag() {
    setState((s) => {
      const flags = s.flags.slice();
      flags[s.current] = !flags[s.current];
      return { ...s, flags };
    });
  }
  function go(delta: number) {
    setState((s) => ({ ...s, current: Math.max(0, Math.min(s.items.length - 1, s.current + delta)) }));
  }
  function jump(i: number) {
    setState((s) => ({ ...s, current: i }));
    setNavOpen(false);
  }
  function doSubmit() {
    submittedRef.current = true;
    onSubmit(state);
  }

  const answered = state.answers.filter((a) => a !== null).length;
  const summary = useMemo(() => scoreExam(state, PASS_PCT), [state]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          <button onClick={onExit} className="p-2 -ml-1 hover:bg-white/5 rounded-lg shrink-0" title="Exit">
            <X size={18} />
          </button>
          <div className="text-center flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-primary truncate">{state.label}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {state.current + 1} / {state.items.length} · {answered} answered
            </div>
          </div>
          {remainingMs !== null ? (
            <div className={`tabular-nums font-mono px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm shrink-0 ${remainingMs < 5 * 60_000 ? "bg-destructive/20 text-destructive" : "bg-white/5"}`}>
              {formatTime(remainingMs)}
            </div>
          ) : <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">untimed</span>}
        </div>
      </header>

      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground truncate">{item.q.domainName}</span>
              <button
                onClick={toggleFlag}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition shrink-0 ${state.flags[state.current] ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Flag size={12} /> {state.flags[state.current] ? "Flagged" : "Flag"}
              </button>
            </div>
            <h2 className="font-serif text-lg sm:text-2xl mb-5 sm:mb-6 leading-snug break-words">{item.q.question}</h2>
            <div className="space-y-2">
              {item.optionOrder.map((origIdx, dispIdx) => {
                const selected = state.answers[state.current] === dispIdx;
                return (
                  <button
                    key={dispIdx}
                    onClick={() => setAnswer(dispIdx)}
                    className={`w-full text-left px-3 sm:px-4 py-3 rounded-lg border transition flex items-start gap-3 ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                  >
                    <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-medium ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                      {String.fromCharCode(65 + dispIdx)}
                    </span>
                    <span className="text-sm sm:text-base break-words min-w-0">{item.q.options[origIdx]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-5 sm:mt-6 gap-2">
            <button
              onClick={() => go(-1)}
              disabled={state.current === 0}
              className="flex items-center gap-1 px-3 sm:px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 text-sm"
            >
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
            </button>
            <button onClick={() => setNavOpen(true)} className="px-3 sm:px-4 py-2.5 rounded-lg bg-white/5 text-sm">
              Navigator
            </button>
            {state.current < state.items.length - 1 ? (
              <button
                onClick={() => go(1)}
                className="flex items-center gap-1 px-3 sm:px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                className="px-3 sm:px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
              >Submit</button>
            )}
          </div>
        </div>
      </main>

      {navOpen && (
        <Modal onClose={() => setNavOpen(false)} title="Navigator">
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 mb-4">
            {state.items.map((_, i) => {
              const isCur = i === state.current;
              const isAns = state.answers[i] !== null;
              const isFlag = state.flags[i];
              return (
                <button
                  key={i}
                  onClick={() => jump(i)}
                  className={`aspect-square rounded text-xs font-medium relative
                    ${isCur ? "ring-2 ring-primary" : ""}
                    ${isAns ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {i + 1}
                  {isFlag && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/20" /> answered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> blank</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> flagged</span>
          </div>
        </Modal>
      )}

      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)} title="Submit exam?">
          <p className="text-sm text-muted-foreground mb-2">
            You have answered <strong>{answered}</strong> of <strong>{state.items.length}</strong>.
          </p>
          {answered < state.items.length && (
            <p className="text-sm text-destructive mb-2">{state.items.length - answered} unanswered will count as wrong.</p>
          )}
          <p className="text-xs text-muted-foreground mb-4">Pass mark: {PASS_PCT}%. Current pct if submitted: {summary.pct.toFixed(0)}%.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-lg border border-border text-card-foreground">Cancel</button>
            <button onClick={doSubmit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">Submit</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-card text-card-foreground rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
