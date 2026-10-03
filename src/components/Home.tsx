import { useEffect, useState } from "react";
import { Clock, Zap, BookOpen, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMasteryRows, fetchSettings, saveSettings } from "@/lib/db";
import { clearInProgress, loadInProgress, type ExamState } from "@/lib/exam";
import { TRACKS, TRACK_ORDER, type ExamMode, type TrackId } from "@/lib/questions";

interface Props {
  userEmail: string;
  userId: string;
  track: TrackId;
  onTrackChange: (t: TrackId) => void;
  onStart: (mode: ExamMode) => void;
  onResume: (state: ExamState) => void;
  onShowProgress: () => void;
}

const RETIRE_THRESHOLD = 3;

function timerLabel(timeMin: number) {
  if (timeMin >= 60 && timeMin % 60 === 0) return `${timeMin / 60}-hour timer`;
  return `${timeMin}-minute timer`;
}

export function Home({ userEmail, userId, track, onTrackChange, onStart, onResume, onShowProgress }: Props) {
  const t = TRACKS[track];
  const [masteredCount, setMasteredCount] = useState<number | null>(null);
  const [resume, setResume] = useState<ExamState | null>(null);
  const [hideMastered, setHideMastered] = useState(false);

  useEffect(() => {
    (async () => {
      const [rows, settings] = await Promise.all([
        fetchMasteryRows(userId),
        fetchSettings(userId),
      ]);
      const coreIds = new Set(t.banks.core.map((q) => q.id));
      let n = 0;
      rows.forEach((r) => coreIds.has(r.question_id) && n++);
      setMasteredCount(n);
      setHideMastered(settings.hide_mastered);
    })();
    setResume(loadInProgress(track));
  }, [userId, track]);

  async function toggleHide(next: boolean) {
    setHideMastered(next);
    await saveSettings(userId, next);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-primary">Security Exam Center</div>
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
        <div className="mb-8 flex flex-wrap gap-2">
          {TRACK_ORDER.map((id) => {
            const active = id === track;
            return (
              <button
                key={id}
                onClick={() => onTrackChange(id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-white/5"
                }`}
              >
                {TRACKS[id].eyebrow}
              </button>
            );
          })}
        </div>

        <div className="mb-10">
          <h2 className="font-serif text-4xl mb-2">{t.title}</h2>
          <p className="text-muted-foreground">
            Pass mark {t.passPercent}%. Core mastery:{" "}
            <span className="text-primary font-medium">{masteredCount ?? "—"}/{t.banks.core.length}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t.blurb}</p>
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
                onClick={() => { clearInProgress(track); setResume(null); }}
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
          {t.fullSets.map((def) => (
            <div key={def.id} className="bg-card text-card-foreground rounded-xl p-6 border border-border/30 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2 rounded-lg bg-primary/20 text-primary">
                  <Clock />
                </span>
                <h3 className="font-serif text-xl">
                  Full Exam{t.fullSets.length > 1 ? ` · ${def.label}` : ""}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{def.note}</p>
              <p className="text-xs text-muted-foreground mb-4">{def.count} questions · {timerLabel(def.timeMin)}</p>
              <button
                onClick={() => onStart(def.id)}
                className="self-start px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
              >Start</button>
            </div>
          ))}
          <ModeCard
            icon={<Zap />}
            title="Quick Drill"
            desc={`${t.quickCount} random core questions · untimed`}
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
          {t.advancedSets && (
            <div className="bg-card text-card-foreground rounded-xl p-6 border border-border/30">
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2 rounded-lg bg-primary/20 text-primary">
                  <BookOpen />
                </span>
                <h3 className="font-serif text-xl">Advanced Exam</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t.advancedSets.map((s) => `${s.label}: ${s.count} questions, ${timerLabel(s.timeMin)}`).join(" · ")}.
              </p>
              <div className="flex gap-2">
                {t.advancedSets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onStart(s.id)}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
                  >{s.label}</button>
                ))}
              </div>
            </div>
          )}
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
