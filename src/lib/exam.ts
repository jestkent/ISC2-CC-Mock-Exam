import type { Question } from "./questions";

export interface PreparedQuestion {
  q: Question;
  optionOrder: number[]; // displayed index -> original index
  correctDisplayIndex: number;
}

export interface ExamState {
  mode: "full" | "fullB" | "quick" | "advA" | "advB" | "mistakes" | "domainDrill";
  label: string;
  timeLimitSec: number | null; // null = untimed
  startedAt: number;
  endsAt: number | null;
  items: PreparedQuestion[];
  answers: (number | null)[]; // displayed index chosen
  flags: boolean[];
  current: number;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function prepareQuestions(pool: Question[], count?: number): PreparedQuestion[] {
  const chosen = shuffle(pool).slice(0, count ?? pool.length);
  return chosen.map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      q,
      optionOrder: order,
      correctDisplayIndex: order.indexOf(q.answerIndex),
    };
  });
}

export function buildExam(
  mode: ExamState["mode"],
  label: string,
  items: PreparedQuestion[],
  timeLimitSec: number | null,
): ExamState {
  const now = Date.now();
  return {
    mode,
    label,
    timeLimitSec,
    startedAt: now,
    endsAt: timeLimitSec ? now + timeLimitSec * 1000 : null,
    items,
    answers: items.map(() => null),
    flags: items.map(() => false),
    current: 0,
  };
}

export interface ResultSummary {
  total: number;
  correct: number;
  pct: number;
  passed: boolean;
  domains: Record<string, { total: number; correct: number }>;
  wrongIndices: number[];
}

export function scoreExam(state: ExamState, passPct: number): ResultSummary {
  const domains: Record<string, { total: number; correct: number }> = {};
  const wrongIndices: number[] = [];
  let correct = 0;
  state.items.forEach((it, i) => {
    const dn = it.q.domainName;
    domains[dn] ??= { total: 0, correct: 0 };
    domains[dn].total++;
    const isCorrect = state.answers[i] === it.correctDisplayIndex;
    if (isCorrect) {
      correct++;
      domains[dn].correct++;
    } else {
      wrongIndices.push(i);
    }
  });
  const total = state.items.length;
  const pct = total ? (correct / total) * 100 : 0;
  return { total, correct, pct, passed: pct >= passPct, domains, wrongIndices };
}

const KEY = "cc-exam-inprogress-v1";
export function saveInProgress(state: ExamState | null) {
  if (state === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(state));
}
export function loadInProgress(): ExamState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ExamState;
    if (s.endsAt && s.endsAt < Date.now()) return s; // expired but still resumable to auto-submit
    return s;
  } catch {
    return null;
  }
}
