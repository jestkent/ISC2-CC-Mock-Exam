import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Home } from "@/components/Home";
import { Exam } from "@/components/Exam";
import { Results } from "@/components/Results";
import { Progress } from "@/components/Progress";
import type { ExamState, ResultSummary } from "@/lib/exam";
import { buildExam, prepareQuestions, saveInProgress, scoreExam } from "@/lib/exam";
import { PASS_PCT, QUESTIONS, type Question } from "@/lib/questions";
import {
  fetchAttempts,
  fetchMasteryRows,
  fetchSettings,
  incrementCorrect,
  saveAttempt,
} from "@/lib/db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ISC2 CC Exam Center" },
      { name: "description", content: "Study and practice for the ISC2 Certified in Cybersecurity (CC) exam." },
    ],
  }),
  pendingComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>
  ),
  component: Index,
});

type View = "home" | "exam" | "results" | "progress";

const RETIRE_THRESHOLD = 3;

async function filteredPool(userId: string | undefined, pool: Question[], hide: boolean): Promise<Question[]> {
  if (!hide || !userId) return pool;
  const rows = await fetchMasteryRows(userId);
  const retired = new Set(rows.filter((r) => r.correct_count >= RETIRE_THRESHOLD).map((r) => r.question_id));
  return pool.filter((q) => !retired.has(q.id));
}

function Index() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("home");
  const [exam, setExam] = useState<ExamState | null>(null);
  const [result, setResult] = useState<{ state: ExamState; summary: ResultSummary } | null>(null);

  const passPct = PASS_PCT;
  const userId = user?.id;

  const startExam = useMemo(() => async (mode: "full" | "fullB" | "quick" | "advA" | "advB" | "domainDrill") => {
    const settings = userId ? await fetchSettings(userId) : { hide_mastered: false };
    const hide = settings.hide_mastered;

    const build = (
      m: ExamState["mode"],
      baseLabel: string,
      sourcePool: Question[],
      normalCount: number | undefined,
      timeLimitSec: number | null,
    ): ExamState | null => {
      const pool = sourcePool; // already filtered when passed in
      if (pool.length === 0) {
        alert("You've mastered every question in this set. Toggle off \"Hide mastered questions\" to practice them again.");
        return null;
      }
      const target = normalCount ?? pool.length;
      const useCount = Math.min(target, pool.length);
      const note = hide && useCount < (normalCount ?? sourcePool.length)
        ? ` · ${useCount} unmastered`
        : "";
      return buildExam(m, baseLabel + note, prepareQuestions(pool, useCount), timeLimitSec);
    };

    let state: ExamState | null = null;
    if (mode === "full") {
      const pool = await filteredPool(userId, QUESTIONS.core, hide);
      state = build("full", "Full Exam", pool, 100, 2 * 60 * 60);
    } else if (mode === "quick") {
      const pool = await filteredPool(userId, QUESTIONS.core, hide);
      state = build("quick", "Quick Drill", pool, 25, null);
    } else if (mode === "advA") {
      const pool = await filteredPool(userId, QUESTIONS.advancedA, hide);
      state = build("advA", "Advanced · Set A", pool, 50, 60 * 60);
    } else if (mode === "advB") {
      const pool = await filteredPool(userId, QUESTIONS.advancedB, hide);
      state = build("advB", "Advanced · Set B", pool, 50, 60 * 60);
    } else {
      // domainDrill — find weakest domain from history
      let weakest = QUESTIONS.core[0].domainName;
      if (userId) {
        const att = await fetchAttempts(userId);
        const agg: Record<string, { total: number; correct: number }> = {};
        for (const a of att) for (const [n, d] of Object.entries(a.domains ?? {})) {
          agg[n] ??= { total: 0, correct: 0 };
          agg[n].total += d.total;
          agg[n].correct += d.correct;
        }
        const ranked = Object.entries(agg)
          .filter(([, d]) => d.total > 0)
          .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
        if (ranked.length) weakest = ranked[0][0];
      }
      const basePool = QUESTIONS.core.filter((q) => q.domainName === weakest);
      const pool = await filteredPool(userId, basePool, hide);
      state = build("domainDrill", `Drill · ${weakest}`, pool, undefined, null);
    }

    if (state) {
      setExam(state);
      setView("exam");
    }
  }, [userId]);

  async function handleSubmit(state: ExamState) {
    const summary = scoreExam(state, passPct);
    saveInProgress(null);
    if (userId) {
      const setLabel = state.mode === "advA" ? "A" : state.mode === "advB" ? "B" : null;
      await saveAttempt(userId, state.mode, setLabel, summary);
      // Track correct_count for every question answered correctly (all pools).
      const correctQids = state.items
        .map((it, i) => (state.answers[i] === it.correctDisplayIndex ? it.q.id : null))
        .filter((x): x is string => x !== null);
      if (correctQids.length) await incrementCorrect(userId, correctQids);
    }
    setResult({ state, summary });
    setView("results");
  }

  function practiceMistakes() {
    if (!result) return;
    const wrongQs: Question[] = result.summary.wrongIndices.map((i) => result.state.items[i].q);
    const state = buildExam("mistakes", `Practice · ${wrongQs.length} mistake${wrongQs.length === 1 ? "" : "s"}`, prepareQuestions(wrongQs), null);
    setExam(state);
    setView("exam");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <AuthGate />;

  if (view === "exam" && exam) {
    return (
      <Exam
        state={exam}
        onSubmit={handleSubmit}
        onExit={() => {
          if (confirm("Exit exam? Your progress is auto-saved and resumable from Home.")) setView("home");
        }}
      />
    );
  }
  if (view === "results" && result) {
    return (
      <Results
        state={result.state}
        summary={result.summary}
        onHome={() => setView("home")}
        onPracticeMistakes={practiceMistakes}
        onReviewAll={() => { /* handled inside */ }}
      />
    );
  }
  if (view === "progress") {
    return <Progress userId={user.id} onBack={() => setView("home")} />;
  }
  return (
    <Home
      userEmail={user.email ?? ""}
      userId={user.id}
      onStart={(m) => startExam(m)}
      onResume={(state) => { setExam(state); setView("exam"); }}
      onShowProgress={() => setView("progress")}
    />
  );
}
