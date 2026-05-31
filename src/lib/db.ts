import { supabase as supabaseClient } from "@/integrations/supabase/client";
import type { ResultSummary } from "./exam";

const supabase = supabaseClient as unknown as {
  from: (t: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
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

export interface MasteryRow {
  question_id: string;
  correct_count: number;
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

export async function fetchMasteryRows(userId: string): Promise<MasteryRow[]> {
  const { data, error } = await supabase
    .from("mastery")
    .select("question_id, correct_count")
    .eq("user_id", userId);
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as MasteryRow[];
}

export async function fetchMastery(userId: string): Promise<Set<string>> {
  const rows = await fetchMasteryRows(userId);
  return new Set(rows.map((r) => r.question_id));
}

/**
 * Increment correct_count by 1 for each given question id (upsert if missing).
 */
export async function incrementCorrect(userId: string, questionIds: string[]) {
  if (!questionIds.length) return;
  // Read existing rows
  const { data: existing } = await supabase
    .from("mastery")
    .select("question_id, correct_count")
    .eq("user_id", userId)
    .in("question_id", questionIds);
  const map = new Map<string, number>(
    ((existing ?? []) as MasteryRow[]).map((r) => [r.question_id, r.correct_count]),
  );
  const now = new Date().toISOString();
  const rows = questionIds.map((qid) => ({
    user_id: userId,
    question_id: qid,
    correct_count: (map.get(qid) ?? 0) + 1,
    last_correct_at: now,
  }));
  const { error } = await supabase
    .from("mastery")
    .upsert(rows, { onConflict: "user_id,question_id" });
  if (error) console.error("incrementCorrect", error);
}

export async function fetchSettings(userId: string): Promise<{ hide_mastered: boolean }> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("hide_mastered")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error(error);
  return { hide_mastered: Boolean((data as { hide_mastered?: boolean } | null)?.hide_mastered) };
}

export async function saveSettings(userId: string, hide_mastered: boolean) {
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, hide_mastered, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) console.error("saveSettings", error);
}
