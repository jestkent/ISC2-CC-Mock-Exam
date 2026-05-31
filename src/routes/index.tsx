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
import { fetchAttempts, recordMastery, saveAttempt } from "@/lib/db";

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

function Index() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("home");
  const [exam, setExam] = useState<ExamState | null>(null);
  const [result, setResult] = useState<{ state: ExamState; summary: ResultSummary } | null>(null);

  const passPct = PASS_PCT;
  const userId = user?.id;

  const startExam = useMemo(() => async (mode: "full" | "quick" | "advA" | "advB" | "domainDrill") => {
    let state: ExamState;
    if (mode === "full") {
      state = buildExam("full", "Full Exam", prepareQuestions(QUESTIONS.core), 2 * 60 * 60);
    } else if (mode === "quick") {
      state = buildExam("quick", "Quick Drill", prepareQuestions(QUESTIONS.core, 25), null);
    } else if (mode === "advA") {
      state = buildExam("advA", "Advanced · Set A", prepareQuestions(QUESTIONS.advancedA), 60 * 60);
    } else if (mode === "advB") {
      state = buildExam("advB", "Advanced · Set B", prepareQuestions(QUESTIONS.advancedB), 60 * 60);
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
      const pool = QUESTIONS.core.filter((q) => q.domainName === weakest);
      state = buildExam("domainDrill", `Drill · ${weakest}`, prepareQuestions(pool), null);
    }
    setExam(state);
    setView("exam");
  }, [userId]);

  async function handleSubmit(state: ExamState) {
    const summary = scoreExam(state, passPct);
    saveInProgress(null);
    if (userId) {
      const setLabel = state.mode === "advA" ? "A" : state.mode === "advB" ? "B" : null;
      await saveAttempt(userId, state.mode, setLabel, summary);
      // Mastery: any CORE question answered correctly
      const masteredQids = state.items
        .map((it, i) => (state.answers[i] === it.correctDisplayIndex && it.q.id.startsWith("core-") ? it.q.id : null))
        .filter((x): x is string => x !== null);
      if (masteredQids.length) await recordMastery(userId, masteredQids);
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
