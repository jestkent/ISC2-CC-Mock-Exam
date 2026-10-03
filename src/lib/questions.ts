import ccData from "@/data/questions.json";
import cisspData from "@/data/cissp-questions.json";
import secaiData from "@/data/secai-questions.json";

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

export type TrackId = "cc" | "cissp" | "secai";

export type ExamMode = "full" | "fullB" | "quick" | "advA" | "advB" | "mistakes" | "domainDrill";

export interface FullSetDef {
  id: "full" | "fullB";
  /** Label shown on the Home card button. */
  label: string;
  /** Title shown in the exam header / results. */
  header: string;
  note: string;
  count: number;
  timeMin: number;
  pool: "core" | "all";
  weights?: Record<string, number>;
}

export interface AdvancedSetDef {
  id: "advA" | "advB";
  label: string;
  count: number;
  timeMin: number;
}

export interface TrackDef {
  id: TrackId;
  /** Small uppercase label for the track tab. */
  eyebrow: string;
  title: string;
  blurb: string;
  passPercent: number;
  banks: { core: Question[]; advancedA: Question[]; advancedB: Question[] };
  quickCount: number;
  fullSets: FullSetDef[];
  advancedSets: AdvancedSetDef[] | null;
}

const cc = ccData as unknown as QuestionsFile;
const cissp = cisspData as unknown as QuestionsFile;
const secai = secaiData as unknown as QuestionsFile;
const secaiMeta = secai.meta as QuestionsFile["meta"] & {
  timeLimitMin?: number;
  officialQuestionCount?: number;
};

export const TRACK_ORDER: TrackId[] = ["cc", "cissp", "secai"];

export const TRACKS: Record<TrackId, TrackDef> = {
  cc: {
    id: "cc",
    eyebrow: "ISC2 CC",
    title: "Certified in Cybersecurity",
    blurb: "The reviewer that got me through the real exam. Set A is the review set I built while preparing; Set B is based on what the actual exam focused on.",
    passPercent: cc.meta.passPercent,
    banks: { core: cc.core, advancedA: cc.advancedA, advancedB: cc.advancedB },
    quickCount: 25,
    fullSets: [
      {
        id: "full",
        label: "Set A",
        header: "Full Exam · Set A",
        note: "The review set I built while preparing for the exam — 100 core questions, 2-hour timer.",
        count: 100,
        timeMin: 120,
        pool: "core",
      },
      {
        id: "fullB",
        label: "Set B",
        header: "Full Exam · Set B (Access Controls focus)",
        note: "Based on what the actual exam focused on: more Access Controls, BC/DR & Incident Response, and Security Principles.",
        count: 100,
        timeMin: 120,
        pool: "all",
        weights: {
          "Access Controls": 30,
          "Security Principles": 30,
          "BC, DR & Incident Response": 20,
          "Network Security": 10,
          "Security Operations": 10,
        },
      },
    ],
    advancedSets: [
      { id: "advA", label: "Set A", count: 50, timeMin: 60 },
      { id: "advB", label: "Set B", count: 50, timeMin: 60 },
    ],
  },
  cissp: {
    id: "cissp",
    eyebrow: "ISC2 CISSP",
    title: "CISSP",
    blurb: "Eight-domain certification review across security & risk management, asset security, architecture, communications, IAM, assessment, operations, and software security. Starter bank — your own question files can expand it.",
    passPercent: cissp.meta.passPercent ?? 70,
    banks: { core: cissp.core, advancedA: cissp.advancedA, advancedB: cissp.advancedB },
    quickCount: 25,
    fullSets: [
      {
        id: "full",
        label: "Full Exam",
        header: "Full Exam",
        note: "100 questions drawn across all eight CISSP domains.",
        count: 100,
        timeMin: 150,
        pool: "all",
      },
    ],
    advancedSets: [
      { id: "advA", label: "Set A", count: 30, timeMin: 45 },
      { id: "advB", label: "Set B", count: 30, timeMin: 45 },
    ],
  },
  secai: {
    id: "secai",
    eyebrow: "CompTIA Security AI+",
    title: "Security AI+",
    blurb: "Securing AI systems — governance, threat landscape, secure design, operations and incident response for AI. Starter bank — your own question files can expand it.",
    passPercent: secai.meta.passPercent ?? 70,
    banks: { core: secai.core, advancedA: secai.advancedA, advancedB: secai.advancedB },
    quickCount: 15,
    fullSets: [
      {
        id: "full",
        label: "Full Exam",
        header: "Full Exam",
        note: `Full-length simulation of ${secaiMeta.officialQuestionCount ?? 60} questions · ${secaiMeta.timeLimitMin ?? 90}-minute timer.`,
        count: secaiMeta.officialQuestionCount ?? 60,
        timeMin: secaiMeta.timeLimitMin ?? 90,
        pool: "all",
      },
    ],
    advancedSets: [
      { id: "advA", label: "Set A", count: 15, timeMin: 20 },
      { id: "advB", label: "Set B", count: 15, timeMin: 20 },
    ],
  },
};

export function allQuestions(t: TrackDef): Question[] {
  return [...t.banks.core, ...t.banks.advancedA, ...t.banks.advancedB];
}
