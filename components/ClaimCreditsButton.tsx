"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimCreditsButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function claim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claim-credits", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn btn-available" onClick={claim} disabled={loading}>
        {loading ? "Claiming…" : "Claim $10,000 preview credits"}
      </button>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
