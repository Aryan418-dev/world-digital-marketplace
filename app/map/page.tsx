import { createClient } from "@/lib/supabase/server";
import { InteractiveMap } from "@/components/InteractiveMap";
import type { Location } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .not("lat", "is", null);

  const locations = (data as Location[]) || [];

  return (
    <div style={{ height: "calc(100dvh - var(--nav-h))", position: "relative" }}>
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
