"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, padding: "3rem 1.25rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        Access your portfolio and claim digital territories.
      </p>
      <form onSubmit={handleSubmit} className="card" style={{ display: "grid", gap: "1rem" }}>
        <label>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: "0.65rem 0.85rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
        </label>
        <label>
          <span className="muted" style={{ fontSize: "0.85rem" }}>Password</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: "0.65rem 0.85rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
        </label>
        {error && <p style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1.25rem", textAlign: "center" }}>
        {mode === "signin" ? (
          <>No account? <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600 }}>Sign up</button></>
        ) : (
          <>Already have an account? <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600 }}>Sign in</button></>
        )}
      </p>
    </div>
  );
}
