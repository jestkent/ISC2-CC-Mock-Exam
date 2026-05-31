import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AuthGate() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl p-8 shadow-2xl border border-border/50">
        <div className="text-center mb-8">
          <div className="inline-block text-xs tracking-[0.3em] uppercase text-primary mb-3">ISC2 CC</div>
          <h1 className="text-3xl font-serif font-semibold mb-2">Exam Center</h1>
          <p className="text-sm text-muted-foreground">Sign in to sync your progress across devices.</p>
        </div>
        {sent ? (
          <div className="text-center py-6">
            <p className="font-serif text-xl mb-2">Check your inbox</p>
            <p className="text-sm text-muted-foreground">A magic link was sent to <strong>{email}</strong>.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-lg bg-background/5 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-card-foreground"
                placeholder="you@example.com"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
