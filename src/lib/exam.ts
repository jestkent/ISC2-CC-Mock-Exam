import type { Question, ExamMode, TrackId } from "./questions";

export interface PreparedQuestion {
  q: Question;
  optionOrder: number[]; // displayed index -> original index
  correctDisplayIndex: number;
}

export interface ExamState {
  track: TrackId;
  mode: ExamMode;
  passPct: number;
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
  mode: ExamMode,
  label: string,
  items: PreparedQuestion[],
  timeLimitSec: number | null,
  track: TrackId,
  passPct: number,
): ExamState {
  const now = Date.now();
  return {
    track,
    mode,
    passPct,
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

const keyFor = (track: TrackId) => `exam-inprogress-${track}-v1`;
const LEGACY_CC_KEY = "cc-exam-inprogress-v1";

export function saveInProgress(state: ExamState | null, track: TrackId) {
  if (state === null) localStorage.removeItem(keyFor(track));
  else localStorage.setItem(keyFor(track), JSON.stringify(state));
}

export function loadInProgress(track: TrackId): ExamState | null {
  try {
    let raw = localStorage.getItem(keyFor(track));
    if (!raw && track === "cc") raw = localStorage.getItem(LEGACY_CC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExamState;
  } catch {
    return null;
  }
}

export function clearInProgress(track: TrackId) {
  localStorage.removeItem(keyFor(track));
  if (track === "cc") localStorage.removeItem(LEGACY_CC_KEY);
}
