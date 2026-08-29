import { createClient } from "@/lib/supabase/server";
import { LocationCard } from "@/components/LocationCard";
import type { Location } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "all" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("locations").select("*").order("current_price_cents", {
    ascending: false,
  });

  if (tab === "available") query = query.eq("status", "available");
  else if (tab === "listed") query = query.eq("status", "listed");
  else if (tab === "countries") query = query.eq("type", "country");
  else if (tab === "states") query = query.eq("type", "state");
  else if (tab === "cities") query = query.eq("type", "city");

  const { data: locations } = await query.limit(48);

  const tabs = [
    { key: "all", label: "All" },
    { key: "available", label: "Available" },
    { key: "listed", label: "For sale" },
    { key: "countries", label: "Countries" },
    { key: "states", label: "States" },
    { key: "cities", label: "Cities" },
  ];

  return (
    <div className="container" style={{ padding: "2rem 1.25rem 4rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "1.5rem" }}>
        Marketplace
      </h1>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/marketplace?tab=${t.key}`}
            className={`btn ${tab === t.key ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-2 grid-4">
        {(locations as Location[] | null)?.map((loc) => (
          <LocationCard key={loc.id} location={loc} />
        ))}
      </div>

      {(!locations || locations.length === 0) && (
        <p className="muted" style={{ textAlign: "center", padding: "3rem" }}>
          No locations match this filter. Seed data may still be loading.
        </p>
      )}
    </div>
  );
}
