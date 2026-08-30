import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LocationCard } from "@/components/LocationCard";
import { InteractiveMap } from "@/components/InteractiveMap";
import type { Location } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function HomePage() {
  const supabase = await createClient();
  const [
    { data: allLocs },
    { data: featured },
    { data: heating },
    { data: recentlyOwned },
    { count: total },
    { count: owned },
  ] = await Promise.all([
    supabase.from("locations").select("*").not("lat", "is", null),
    supabase
      .from("locations")
      .select("*")
      .eq("status", "available")
      .order("current_price_cents", { ascending: false })
      .limit(8),
    supabase
      .from("locations")
      .select("*")
      .eq("status", "available")
      .order("heat_score", { ascending: false })
      .limit(6),
    supabase
      .from("locations")
      .select("name, slug, owned_at, type")
      .eq("status", "owned")
      .order("owned_at", { ascending: false })
      .limit(5),
    supabase.from("locations").select("*", { count: "exact", head: true }),
    supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .neq("status", "available"),
  ]);

  const locations = (allLocs as Location[]) || [];
  const available = (total ?? 0) - (owned ?? 0);
  const claimedPct =
    total && total > 0 ? Math.round(((owned ?? 0) / total) * 100) : 0;

  return (
    <>
      <section
        className="hero-shell"
        style={{
          position: "relative",
          width: "100%",
          height: "calc(100dvh - 60px)",
          minHeight: 480,
        }}
      >
        <InteractiveMap
          locations={locations}
          height="100%"
          showSearch
          initialZoom={1.55}
          initialCenter={[15, 20]}
        />
        <div className="hero-curiosity">
          <p className="hero-eyebrow">Digital real estate · Live map</p>
          <h1 className="hero-title">
            Someone will own your city.
            <span> Will it be you?</span>
          </h1>
          <p className="hero-sub">
            Claim exclusive digital ownership of cities, states, and countries.
            Prices rise when the world pays attention — every view, search, and
            click heats the market.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn btn-primary">
              Claim free credits
            </Link>
            <Link href="/map" className="btn btn-ghost">
              Explore the map
            </Link>
          </div>
        </div>
        <div className="map-float-stats">
          <div>
            <strong>{total ?? 0}</strong>
            <span>Locations</span>
          </div>
          <div>
            <strong style={{ color: "var(--available)" }}>{available}</strong>
            <span>Still open</span>
          </div>
          <div>
            <strong style={{ color: "var(--owned)" }}>{owned ?? 0}</strong>
            <span>Claimed</span>
          </div>
          <div>
            <strong style={{ color: "var(--primary)" }}>{claimedPct}%</strong>
            <span>Taken</span>
          </div>
        </div>
      </section>

      {(recentlyOwned?.length ?? 0) > 0 && (
        <div className="activity-ticker">
          <div className="container ticker-inner">
            <span className="ticker-label">Just claimed</span>
            <div className="ticker-items">
              {recentlyOwned!.map((r) => (
                <Link key={r.slug} href={`/location/${r.slug}`} className="ticker-chip">
                  {r.name}
                  <em>{r.type}</em>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <div className="container">
          <h2 className="section-title">Why the map is moving</h2>
          <p className="section-lead">
            WORLD is not a static catalog. Every interaction changes the price.
            The more people look at a place, the hotter — and more expensive —
            it becomes.
          </p>
          <div className="grid grid-3">
            <div className="feature-card">
              <div className="icon">◎</div>
              <h3>Demand sets the price</h3>
              <p>
                Views, searches, and clicks feed a live heat score. High interest
                multiplies the base price — up to 5×. Ignore a city and it stays
                cheap. Hunt it and the cost climbs.
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">◈</div>
              <h3>One owner. Forever visible.</h3>
              <p>
                When you claim a territory, your brand image fills its border on
                the global map. Billions of map glances — your mark stays put.
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">◇</div>
              <h3>Race before it closes</h3>
              <p>
                {available} territories are still open. Every green pin is a
                window that can close the moment someone else taps Claim.
              </p>
            </div>
          </div>
        </div>
      </section>

      {(heating?.length ?? 0) > 0 && (
        <section className="section section-tight">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                Heating up right now
              </h2>
              <Link href="/marketplace" className="section-link">
                Full marketplace →
              </Link>
            </div>
            <p className="section-lead" style={{ marginTop: "0.5rem" }}>
              Highest heat score — attention is already bidding these up.
            </p>
            <div className="heat-list">
              {(heating as Location[]).map((loc, i) => {
                const lift =
                  loc.base_price_cents > 0
                    ? Math.round(
                        ((loc.current_price_cents - loc.base_price_cents) /
                          loc.base_price_cents) *
                          100,
                      )
                    : 0;
                return (
                  <Link
                    key={loc.id}
                    href={`/location/${loc.slug}`}
                    className="heat-row"
                  >
                    <span className="heat-rank">#{i + 1}</span>
                    <div className="heat-meta">
                      <strong>{loc.name}</strong>
                      <span>
                        {loc.type} · {loc.view_count ?? 0} views ·{" "}
                        {loc.click_count ?? 0} clicks
                      </span>
                    </div>
                    <div className="heat-price">
                      <strong>{formatPrice(loc.current_price_cents)}</strong>
                      {lift > 0 && (
                        <span className="heat-lift">+{lift}% from base</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section section-tight" style={{ paddingBottom: "3.5rem" }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              High-value territories still open
            </h2>
            <Link href="/marketplace" className="section-link">
              View all →
            </Link>
          </div>
          <div className="grid grid-2 grid-4" style={{ marginTop: "1.15rem" }}>
            {(featured as Location[] | null)?.map((loc) => (
              <LocationCard key={loc.id} location={loc} />
            ))}
          </div>
        </div>
      </section>

      <div className="cta-band">
        <h2>The map remembers who claimed first</h2>
        <p>
          Free signup · $10,000 preview credits · Live demand pricing · No card
          required
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.65rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/login" className="btn btn-primary">
            Create account
          </Link>
          <Link href="/map" className="btn btn-ghost">
            Scout the map
          </Link>
        </div>
      </div>

      <footer className="site-footer container">
        <span>WORLD — Digital Real Estate Marketplace</span>
        <span>Prices move with attention</span>
      </footer>
    </>
  );
}
