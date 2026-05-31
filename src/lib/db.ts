import { supabase as supabaseClient } from "@/integrations/supabase/client";
import type { ResultSummary } from "./exam";

// Types are not auto-generated for our tables yet; cast through any.
const supabase = supabaseClient as unknown as {
  from: (t: string) => any;
};

export interface AttemptRow {
  id: string;
  user_id: string;
  mode: string;
  set: string | null;
  total: number;
  correct: number;
  pct: number;
  passed: boolean;
  domains: Record<string, { total: number; correct: number }>;
  created_at: string;
}

export async function saveAttempt(
  userId: string,
  mode: string,
  set: string | null,
  summary: ResultSummary,
) {
  const { error } = await supabase.from("attempts").insert({
    user_id: userId,
    mode,
    set,
    total: summary.total,
    correct: summary.correct,
    pct: Number(summary.pct.toFixed(2)),
    passed: summary.passed,
    domains: summary.domains,
  });
  if (error) console.error("saveAttempt", error);
}

export async function fetchAttempts(userId: string): Promise<AttemptRow[]> {
  const { data, error } = await supabase
    .from("attempts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as AttemptRow[];
}

export async function clearHistory(userId: string) {
  await supabase.from("attempts").delete().eq("user_id", userId);
  await supabase.from("mastery").delete().eq("user_id", userId);
}

export async function fetchMastery(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("mastery")
    .select("question_id")
    .eq("user_id", userId);
  if (error) {
    console.error(error);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.question_id));
}

export async function recordMastery(userId: string, questionIds: string[]) {
  if (!questionIds.length) return;
  const rows = questionIds.map((qid) => ({ user_id: userId, question_id: qid }));
  await supabase.from("mastery").upsert(rows, { onConflict: "user_id,question_id" });
}
