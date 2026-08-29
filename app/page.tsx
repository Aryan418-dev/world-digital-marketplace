import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LocationCard } from "@/components/LocationCard";
import type { Location } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: locations } = await supabase.from("locations").select("*").eq("status", "available").order("current_price_cents", { ascending: false }).limit(8);
  const { count: total } = await supabase.from("locations").select("*", { count: "exact", head: true });
  const { count: owned } = await supabase.from("locations").select("*", { count: "exact", head: true }).neq("status", "available");

  return (
    <>
      <section className="hero container">
        <h1>Own a piece of the<br /><span style={{ color: "var(--primary)" }}>digital world</span></h1>
        <p>Exclusive digital ownership of countries, states, and cities. Claim your territory on the interactive global map.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/map" className="btn btn-primary">Explore the map</Link>
          <Link href="/marketplace" className="btn btn-ghost">Browse marketplace</Link>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: "3rem" }}>
        <div className="grid grid-3" style={{ marginBottom: "3rem" }}>
          <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 800 }}>{total ?? 0}</div><div className="muted">Locations</div></div>
          <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--available)" }}>{(total ?? 0) - (owned ?? 0)}</div><div className="muted">Available</div></div>
          <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--owned)" }}>{owned ?? 0}</div><div className="muted">Owned</div></div>
        </div>
        <h2 className="section-title">Featured territories</h2>
        <div className="grid grid-2 grid-4">
          {(locations as Location[] | null)?.map((loc) => (<LocationCard key={loc.id} location={loc} />))}
        </div>
      </section>
    </>
  );
}
