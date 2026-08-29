import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LocationCard } from "@/components/LocationCard";
import { InteractiveMap } from "@/components/InteractiveMap";
import type { Location } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: allLocs }, { data: featured }, { count: total }, { count: owned }] =
    await Promise.all([
      supabase.from("locations").select("*").not("lat", "is", null),
      supabase
        .from("locations")
        .select("*")
        .eq("status", "available")
        .order("current_price_cents", { ascending: false })
        .limit(8),
      supabase.from("locations").select("*", { count: "exact", head: true }),
      supabase
        .from("locations")
        .select("*", { count: "exact", head: true })
        .neq("status", "available"),
    ]);

  const locations = (allLocs as Location[]) || [];
  const available = (total ?? 0) - (owned ?? 0);

  return (
    <>
      {/* Full interactive map — no overlay */}
      <section className="hero-shell">
        <div className="hero-map" style={{ position: "relative" }}>
          <InteractiveMap
            locations={locations}
            height="100%"
            showSearch
            initialZoom={1.55}
            initialCenter={[15, 20]}
          />
          {/* Compact floating stats — does not block map */}
          <div className="map-float-stats">
            <div>
              <strong>{total ?? 0}</strong>
              <span>Locations</span>
            </div>
            <div>
              <strong style={{ color: "var(--available)" }}>{available}</strong>
              <span>Available</span>
            </div>
            <div>
              <strong style={{ color: "var(--owned)" }}>{owned ?? 0}</strong>
              <span>Owned</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">How WORLD works</h2>
          <div className="grid grid-3">
            <div className="feature-card">
              <div className="icon">1</div>
              <h3>Explore the map</h3>
              <p>
                Pan and zoom the live global map. Green markers are available to claim.
                Search any city or state.
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">2</div>
              <h3>Claim with credits</h3>
              <p>
                Create a free account, claim $10,000 preview credits, and purchase exclusive
                digital ownership on the ledger.
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">3</div>
              <h3>List &amp; trade</h3>
              <p>
                Own territories in your portfolio. List them on the marketplace when you are
                ready to sell to other collectors.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ paddingBottom: "3.5rem" }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1.15rem",
            }}
          >
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              Featured territories
            </h2>
            <Link href="/marketplace" style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem" }}>
              View marketplace →
            </Link>
          </div>
          <div className="grid grid-2 grid-4">
            {(featured as Location[] | null)?.map((loc) => (
              <LocationCard key={loc.id} location={loc} />
            ))}
          </div>
        </div>
      </section>

      <div className="cta-band">
        <h2>Start claiming territory today</h2>
        <p>Free signup · $10,000 preview credits · No card required</p>
        <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-primary">
            Create account
          </Link>
          <Link href="/map" className="btn btn-ghost">
            Explore map
          </Link>
        </div>
      </div>

      <footer className="site-footer container">
        <span>WORLD — Digital Real Estate Marketplace</span>
        <span>buyworld.vercel.app</span>
      </footer>
    </>
  );
}
