import data from "@/data/questions.json";

export interface Question {
  id: string;
  domain: number;
  domainName: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface QuestionsFile {
  meta: {
    exam: string;
    passPercent: number;
    domains: Record<string, string>;
    counts: { core: number; advancedA: number; advancedB: number };
  };
  core: Question[];
  advancedA: Question[];
  advancedB: Question[];
}

export const QUESTIONS = data as unknown as QuestionsFile;
export const DOMAINS = QUESTIONS.meta.domains;
export const PASS_PCT = QUESTIONS.meta.passPercent;

export function getBank(mode: "full" | "quick" | "advA" | "advB" | "drill" | "domain"): Question[] {
  if (mode === "advA") return QUESTIONS.advancedA;
  if (mode === "advB") return QUESTIONS.advancedB;
  return QUESTIONS.core;
}

export function questionById(id: string): Question | undefined {
  return [...QUESTIONS.core, ...QUESTIONS.advancedA, ...QUESTIONS.advancedB].find((q) => q.id === id);
}
