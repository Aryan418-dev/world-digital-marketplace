import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Location } from "@/lib/types";
import { PurchaseButton } from "@/components/PurchaseButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: location } = await supabase.from("locations").select("*").eq("slug", slug).single();
  if (!location) notFound();
  const loc = location as Location;
  const { data: { user } } = await supabase.auth.getUser();

  let ownerName: string | null = null;
  if (loc.owner_id) {
    const { data: owner } = await supabase.from("profiles").select("display_name, username").eq("id", loc.owner_id).single();
    ownerName = owner?.display_name || owner?.username || null;
  }

  const statusClass = loc.status === "available" ? "badge-available" : loc.status === "listed" ? "badge-listed" : "badge-owned";

  return (
    <div className="container" style={{ padding: "2rem 1.25rem 4rem", maxWidth: 720 }}>
      <Link href="/marketplace" className="muted" style={{ fontSize: "0.9rem" }}>← Marketplace</Link>
      <div style={{ marginTop: "1.5rem" }}>
        <span className={`badge ${statusClass}`}>{loc.status}</span>
        <span className="muted" style={{ marginLeft: 12, fontSize: "0.85rem", textTransform: "uppercase" }}>{loc.type}</span>
      </div>
      <h1 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0.75rem 0" }}>{loc.name}</h1>
      {loc.description && <p className="muted" style={{ marginBottom: "1.5rem", lineHeight: 1.6 }}>{loc.description}</p>}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="muted" style={{ fontSize: "0.85rem" }}>Current price</div>
        <div className="price" style={{ fontSize: "2rem", color: "var(--primary)" }}>{formatPrice(loc.current_price_cents)}</div>
        {ownerName && <p className="muted" style={{ marginTop: 8 }}>Owned by {ownerName}</p>}
      </div>
      {loc.status === "available" && (
        <PurchaseButton locationId={loc.id} priceCents={loc.current_price_cents} isLoggedIn={!!user} />
      )}
      {loc.status === "owned" && user?.id === loc.owner_id && (
        <p className="muted">You own this territory. Listing for sale coming soon.</p>
      )}
    </div>
  );
}
