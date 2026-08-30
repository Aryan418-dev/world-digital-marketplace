import { createClient } from "@/lib/supabase/server";
import { InteractiveMap } from "@/components/InteractiveMap";
import { TopOwnedBanner, type TopOwnedItem } from "@/components/TopOwnedBanner";
import type { Location } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const supabase = await createClient();
  const [{ data }, { data: topOwnedRaw }] = await Promise.all([
    supabase.from("locations").select("*").not("lat", "is", null),
    supabase
      .from("locations")
      .select(
        "id, slug, name, type, current_price_cents, logo_url, brand_image_url, website_url, tagline, owner_id",
      )
      .eq("status", "owned")
      .order("current_price_cents", { ascending: false })
      .limit(3),
  ]);

  const locations = (data as Location[]) || [];

  const topOwned: TopOwnedItem[] = [];
  if (topOwnedRaw?.length) {
    const ownerIds = [
      ...new Set(
        topOwnedRaw.map((r) => r.owner_id).filter(Boolean) as string[],
      ),
    ];
    const { data: profiles } = ownerIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name, username, logo_url, avatar_url")
          .in("id", ownerIds)
      : { data: [] as { id: string; display_name: string | null; username: string | null; logo_url: string | null; avatar_url: string | null }[] };

    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    for (const row of topOwnedRaw) {
      const p = row.owner_id ? byId.get(row.owner_id) : null;
      topOwned.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        type: row.type,
        current_price_cents: row.current_price_cents,
        logo_url: row.logo_url,
        brand_image_url: row.brand_image_url,
        website_url: row.website_url,
        tagline: row.tagline,
        owner_name: p?.display_name || p?.username || null,
        owner_logo: p?.logo_url || p?.avatar_url || null,
      });
    }
  }

  return (
    <div style={{ height: "calc(100dvh - var(--nav-h))", position: "relative" }}>
      <TopOwnedBanner items={topOwned} />
      <InteractiveMap
        locations={locations}
        height="100%"
        showSearch
        initialZoom={1.7}
        initialCenter={[20, 18]}
      />
    </div>
  );
}
