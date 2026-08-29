"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function PurchaseButton({
  locationId,
  priceCents,
  isLoggedIn,
}: {
  locationId: string;
  priceCents: number;
  isLoggedIn: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="btn btn-primary">
        Sign in to claim — {formatPrice(priceCents)}
      </Link>
    );
  }

  async function purchase() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn btn-available" onClick={purchase} disabled={loading}>
        {loading ? "Processing…" : `Claim for ${formatPrice(priceCents)}`}
      </button>
      {error && (
        <p style={{ color: "var(--danger)", marginTop: 12, fontSize: "0.9rem" }}>{error}</p>
      )}
    </div>
  );
}
