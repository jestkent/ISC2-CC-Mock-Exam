import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "sign-in" | "sign-up" | "forgot";

export function AuthGate() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeMode(next: AuthMode) {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (resetError) setError(resetError.message);
      else setMessage("Check your inbox for a secure password reset link.");
      return;
    }

    if (mode === "sign-up") {
      if (password.length < 8) {
        setLoading(false);
        setError("Use at least 8 characters for your password.");
        return;
      }
      if (password !== confirmPassword) {
        setLoading(false);
        setError("Passwords do not match.");
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (signUpError) setError(signUpError.message);
      else if (data.session) window.location.assign("/");
      else setMessage("Account created. Check your email to confirm it, then sign in.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError("Email or password is incorrect.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md bg-card text-card-foreground rounded-xl p-6 sm:p-8 shadow-2xl border border-border/50">
        <div className="text-center mb-7">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <LockKeyhole aria-hidden="true" />
          </div>
          <div className="text-xs tracking-[0.3em] uppercase text-primary mb-3">Security Exam Center</div>
          <h1 className="text-3xl font-serif font-semibold mb-2">
            {mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Create your account" : "Reset your password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "sign-in"
              ? "Sign in to continue your exam preparation."
              : mode === "sign-up"
                ? "Save your progress securely across devices."
                : "We’ll email you a secure link to choose a new password."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="auth-password">Password</Label>
                {mode === "sign-in" && (
                  <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => changeMode("forgot")}>
                    Forgot password?
                  </Button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                  placeholder="At least 8 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
          )}

          {mode === "sign-up" && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
                placeholder="Enter your password again"
              />
            </div>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="rounded-md bg-primary/15 px-3 py-2 text-sm text-card-foreground">{message}</p>}

          <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full"
            >
            {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? (
            <>New here? <Button type="button" variant="link" className="h-auto p-0" onClick={() => changeMode("sign-up")}>Create an account</Button></>
          ) : (
            <>Already have an account? <Button type="button" variant="link" className="h-auto p-0" onClick={() => changeMode("sign-in")}>Sign in</Button></>
          )}
        </div>
      </section>
    </main>
  );
}
