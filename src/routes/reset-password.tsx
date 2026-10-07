import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Security Exam Center" },
      { name: "description", content: "Choose a new password for your Security Exam Center account." },
      { property: "og:title", content: "Reset Password — Security Exam Center" },
      { property: "og:description", content: "Choose a new password for your Security Exam Center account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const hasRecoveryHash = hash.get("type") === "recovery";
    if (hasRecoveryHash) setRecoveryReady(true);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (hasRecoveryHash && sessionData.session) setRecoveryReady(true);
      setChecking(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError(updateError.message);
    else setComplete(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border/50 bg-card p-6 text-card-foreground shadow-2xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/20 text-primary">
            {complete ? <CheckCircle2 aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          </div>
          <div className="mb-3 text-xs uppercase tracking-[0.3em] text-primary">Security Exam Center</div>
          <h1 className="mb-2 text-3xl font-serif font-semibold">{complete ? "Password updated" : "Choose a new password"}</h1>
          <p className="text-sm text-muted-foreground">
            {complete ? "Your new password is ready to use." : "Use at least 8 characters that you don’t reuse elsewhere."}
          </p>
        </div>

        {checking ? (
          <p className="text-center text-sm text-muted-foreground">Checking your reset link…</p>
        ) : complete ? (
          <Button asChild className="h-11 w-full"><Link to="/">Continue to sign in</Link></Button>
        ) : recoveryReady ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-11" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input id="confirm-new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11" />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="h-11 w-full">{loading ? "Updating…" : "Update password"}</Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm text-destructive">This password reset link is invalid or has expired.</p>
            <Button asChild variant="outline" className="h-11 w-full"><Link to="/">Request a new link</Link></Button>
          </div>
        )}
      </section>
    </main>
  );
}