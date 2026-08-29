"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });
        if (error) throw error;
        setMessage("Account created. You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  const authError = searchParams.get("error");

  return (
    <div className="container" style={{ maxWidth: 420, padding: "3rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        Access your portfolio and claim digital territories.
      </p>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{ width: "100%", marginBottom: "1rem", gap: "0.75rem" }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.3C9.6 39.7 16.3 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.3 44 31 44 24c0-1.2-.1-2.3-.4-3.5z" />
        </svg>
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span className="muted" style={{ fontSize: "0.8rem" }}>or email</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <form onSubmit={handleEmail} className="card" style={{ display: "grid", gap: "1rem" }}>
        <label>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "0.65rem 0.85rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
            }}
          />
        </label>
        <label>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "0.65rem 0.85rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
            }}
          />
        </label>

        {(error || authError) && (
          <p style={{ color: "var(--danger)", fontSize: "0.9rem" }}>
            {error || "Authentication failed. Try again."}
          </p>
        )}
        {message && (
          <p style={{ color: "var(--available)", fontSize: "0.9rem" }}>{message}</p>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign in with email" : "Sign up with email"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: "1.25rem", textAlign: "center" }}>
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600 }}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setMessage(null); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600 }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "3rem" }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
