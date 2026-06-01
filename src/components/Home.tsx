import { useEffect, useState } from "react";
import { Clock, Zap, BookOpen, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMasteryRows, fetchSettings, saveSettings } from "@/lib/db";
import { QUESTIONS } from "@/lib/questions";
import type { ExamState } from "@/lib/exam";
import { loadInProgress } from "@/lib/exam";

interface Props {
  userEmail: string;
  userId: string;
  onStart: (mode: "full" | "quick" | "advA" | "advB" | "domainDrill") => void;
  onResume: (state: ExamState) => void;
  onShowProgress: () => void;
}

const RETIRE_THRESHOLD = 3;

export function Home({ userEmail, userId, onStart, onResume, onShowProgress }: Props) {
  const [masteredCount, setMasteredCount] = useState<number | null>(null);
  const [resume, setResume] = useState<ExamState | null>(null);
  const [hideMastered, setHideMastered] = useState(false);

  useEffect(() => {
    (async () => {
      const [rows, settings] = await Promise.all([
        fetchMasteryRows(userId),
        fetchSettings(userId),
      ]);
      const coreIds = new Set(QUESTIONS.core.map((q) => q.id));
      let n = 0;
      rows.forEach((r) => coreIds.has(r.question_id) && n++);
      setMasteredCount(n);
      setHideMastered(settings.hide_mastered);
    })();
    setResume(loadInProgress());
  }, [userId]);

  async function toggleHide(next: boolean) {
    setHideMastered(next);
    await saveSettings(userId, next);
  }

  

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-primary">ISC2 CC</div>
            <h1 className="font-serif text-xl">Exam Center</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={onShowProgress} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5">
              <BarChart3 size={16} /> Progress
            </button>
            <span className="text-muted-foreground hidden sm:inline">{userEmail}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h2 className="font-serif text-4xl mb-2">Certified in Cybersecurity</h2>
          <p className="text-muted-foreground">
            Pass mark {QUESTIONS.meta.passPercent}%. Core mastery:{" "}
            <span className="text-primary font-medium">{masteredCount ?? "—"}/{QUESTIONS.core.length}</span>
          </p>
        </div>

        {resume && (
          <div className="mb-8 bg-card text-card-foreground rounded-xl p-5 flex items-center justify-between border border-primary/40">
            <div>
              <div className="font-serif text-lg">Resume in-progress exam</div>
              <div className="text-sm text-muted-foreground">{resume.label} · question {resume.current + 1} of {resume.items.length}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onResume(resume)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
              >Resume</button>
              <button
                onClick={() => { localStorage.removeItem("cc-exam-inprogress-v1"); setResume(null); }}
                className="px-4 py-2 border border-border/30 rounded-lg text-sm"
              >Discard</button>
            </div>
          </div>
        )}

        <div className="mb-6 bg-card text-card-foreground rounded-xl p-5 border border-border/30 flex items-center justify-between gap-4">
          <div>
            <div className="font-serif text-lg">Hide questions I've answered correctly {RETIRE_THRESHOLD}+ times</div>
            <div className="text-sm text-muted-foreground">Retired questions are excluded from new tests. Nothing is deleted — toggle off to bring them back.</div>
          </div>
          <button
            role="switch"
            aria-checked={hideMastered}
            onClick={() => toggleHide(!hideMastered)}
            className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${hideMastered ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-background transition-transform ${hideMastered ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <ModeCard
            icon={<Clock />}
            title="Full Exam"
            desc="All 100 core questions · 2-hour timer"
            cta="Start full exam"
            onClick={() => onStart("full")}
          />
          <ModeCard
            icon={<Zap />}
            title="Quick Drill"
            desc="25 random core questions · untimed"
            cta="Start quick drill"
            onClick={() => onStart("quick")}
          />
          <ModeCard
            icon={<BookOpen />}
            title="Drill Weakest Domain"
            desc="Untimed drill of your weakest domain from history"
            cta="Drill weakest"
            onClick={() => onStart("domainDrill")}
          />
          <div className="bg-card text-card-foreground rounded-xl p-6 border border-border/30">
            <div className="flex items-center gap-3 mb-3">
              <span className={`p-2 rounded-lg ${unlocked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {unlocked ? <BookOpen /> : <Lock />}
              </span>
              <h3 className="font-serif text-xl">Advanced Exam</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Two 50-question sets, 1 hour each.
              {!unlocked && (
                <> Locked — <span className="text-primary">{masteredCount ?? 0}/{QUESTIONS.core.length}</span> to unlock.</>
              )}
            </p>
            <div className="flex gap-2">
              <button
                disabled={!unlocked}
                onClick={() => onStart("advA")}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >Set A</button>
              <button
                disabled={!unlocked}
                onClick={() => onStart("advB")}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >Set B</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ModeCard({ icon, title, desc, cta, onClick }: { icon: React.ReactNode; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <div className="bg-card text-card-foreground rounded-xl p-6 border border-border/30 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <span className="p-2 rounded-lg bg-primary/20 text-primary">{icon}</span>
        <h3 className="font-serif text-xl">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4 flex-1">{desc}</p>
      <button onClick={onClick} className="self-start px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
        {cta}
      </button>
    </div>
  );
}
