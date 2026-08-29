import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LocationCard } from "@/components/LocationCard";
import type { Location, Profile } from "@/lib/types";
import { ClaimCreditsButton } from "@/components/ClaimCreditsButton";
import { SignOutButton } from "@/components/SignOutButton";
import { ProfileBrandingForm } from "@/components/ProfileBrandingForm";

export const dynamic = "force-dynamic";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();
  const { data: owned } = await supabase
    .from("locations")
    .select("*")
    .eq("owner_id", user.id)
    .order("owned_at", { ascending: false });

  return (
    <div className="container" style={{ padding: "2rem 1.25rem 4rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {(profile?.logo_url || profile?.avatar_url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo_url || profile.avatar_url}
              alt=""
              className="brand-logo-lg"
            />
          )}
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
              {profile?.display_name || user.email}
            </h1>
            <p className="muted">
              @{profile?.username || user.email?.split("@")[0]}
            </p>
          </div>
        </div>
        <SignOutButton />
      </div>

      <div className="grid grid-2" style={{ marginBottom: "2.5rem" }}>
        <div className="card">
          <div className="muted" style={{ fontSize: "0.85rem", marginBottom: 4 }}>
            Wallet balance
          </div>
          <div className="price" style={{ fontSize: "1.75rem", color: "var(--primary)" }}>
            {formatPrice(wallet?.balance_cents ?? 0)}
          </div>
          {!wallet?.preview_credits_claimed && (
            <div style={{ marginTop: 12 }}>
              <ClaimCreditsButton />
            </div>
          )}
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: "0.85rem", marginBottom: 4 }}>
            Portfolio
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>
            {owned?.length ?? 0}{" "}
            <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--muted)" }}>
              locations
            </span>
          </div>
        </div>
      </div>

      <ProfileBrandingForm profile={profile as Profile | null} />

      <h2 className="section-title">Your territories</h2>
      {owned && owned.length > 0 ? (
        <div className="grid grid-2 grid-4">
          {(owned as Location[]).map((loc) => (
            <LocationCard key={loc.id} location={loc} />
          ))}
        </div>
      ) : (
        <p className="muted">
          No territories yet.{" "}
          <a href="/map" style={{ color: "var(--primary)" }}>
            Explore the map
          </a>{" "}
          and claim your first location.
        </p>
      )}
    </div>
  );
}
