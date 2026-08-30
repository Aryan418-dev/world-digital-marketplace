import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Location } from "@/lib/types";
import { PurchaseButton } from "@/components/PurchaseButton";
import { LocationBrandingForm } from "@/components/LocationBrandingForm";
import Link from "next/link";
import { TrackLocationEvent } from "@/components/TrackLocationEvent";

export const dynamic = "force-dynamic";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function SocialLinks({
  website,
  twitter,
  instagram,
  facebook,
  linkedin,
  youtube,
  email,
}: {
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  email?: string | null;
}) {
  const items = [
    website && { label: "Website", href: website },
    twitter && { label: "X / Twitter", href: twitter },
    instagram && { label: "Instagram", href: instagram },
    facebook && { label: "Facebook", href: facebook },
    linkedin && { label: "LinkedIn", href: linkedin },
    youtube && { label: "YouTube", href: youtube },
    email && { label: "Email", href: `mailto:${email}` },
  ].filter(Boolean) as { label: string; href: string }[];

  if (!items.length) return null;

  return (
    <div className="social-row">
      {items.map((i) => (
        <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer" className="social-chip">
          {i.label}
        </a>
      ))}
    </div>
  );
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!location) notFound();
  const loc = location as Location;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ownerName: string | null = null;
  let ownerLogo: string | null = null;
  if (loc.owner_id) {
    const { data: owner } = await supabase
      .from("profiles")
      .select("display_name, username, logo_url, avatar_url")
      .eq("id", loc.owner_id)
      .single();
    ownerName = owner?.display_name || owner?.username || null;
    ownerLogo = owner?.logo_url || owner?.avatar_url || null;
  }

  const isOwner = !!user && user.id === loc.owner_id;
  const statusClass =
    loc.status === "available"
      ? "badge-available"
      : loc.status === "listed"
        ? "badge-listed"
        : "badge-owned";

  const displayLogo = loc.logo_url || ownerLogo;
  const heroImage = loc.brand_image_url || loc.cover_image_url;

  return (
    <>
      <TrackLocationEvent locationId={loc.id} eventType="view" />
      <div className="container" style={{ padding: "2rem 1.25rem 4rem", maxWidth: 720 }}>
      <Link href="/marketplace" className="muted" style={{ fontSize: "0.9rem" }}>
        ← Marketplace
      </Link>

      {heroImage && (
        <div style={{ marginTop: "1.25rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" className="location-hero-img" />
        </div>
      )}

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
        {displayLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayLogo} alt="" className="brand-logo-lg" />
        )}
        <div style={{ flex: 1 }}>
          <div>
            <span className={`badge ${statusClass}`}>{loc.status}</span>
            <span
              className="muted"
              style={{
                marginLeft: 12,
                fontSize: "0.85rem",
                textTransform: "uppercase",
              }}
            >
              {loc.type}
            </span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0.75rem 0" }}>{loc.name}</h1>
          {loc.tagline && (
            <p style={{ fontSize: "1.05rem", color: "var(--primary)", marginBottom: "0.5rem" }}>
              {loc.tagline}
            </p>
          )}
          {loc.description && (
            <p className="muted" style={{ marginBottom: "1rem", lineHeight: 1.6 }}>
              {loc.description}
            </p>
          )}
          <SocialLinks
            website={loc.website_url}
            twitter={loc.twitter_url}
            instagram={loc.instagram_url}
            facebook={loc.facebook_url}
            linkedin={loc.linkedin_url}
            youtube={loc.youtube_url}
            email={loc.contact_email}
          />
        </div>
      </div>

      <div className="card" style={{ margin: "1.5rem 0" }}>
        <div className="muted" style={{ fontSize: "0.85rem" }}>
          Current price
        </div>
        <div className="price" style={{ fontSize: "2rem", color: "var(--primary)" }}>
          {formatPrice(loc.current_price_cents)}
        </div>
        {ownerName && (
          <p className="muted" style={{ marginTop: 8 }}>
            Owned by {ownerName}
          </p>
        )}
      </div>

      {loc.status === "available" && (
        <PurchaseButton
          locationId={loc.id}
          priceCents={loc.current_price_cents}
          isLoggedIn={!!user}
        />
      )}

      {isOwner && (
        <>
          <p className="muted" style={{ marginBottom: "0.5rem" }}>
            You own this territory. Add a map ad image so it shows on the global map for everyone.
          </p>
          <LocationBrandingForm location={loc} />
        </>
      )}
    </div>
    </>
  );
}
