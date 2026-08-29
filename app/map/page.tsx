"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/lib/types";
import Link from "next/link";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Location | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("locations").select("*").not("lat", "is", null).then(({ data }) => {
      setLocations((data as Location[]) || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !mapContainer.current) return;
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: [20, 20],
        zoom: 1.4,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      mapRef.current = map;
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return;
    (async () => {
      const map = mapRef.current;
      const geojson = {
        type: "FeatureCollection" as const,
        features: locations.map((loc) => ({
          type: "Feature" as const,
          properties: { id: loc.id, name: loc.name, status: loc.status, slug: loc.slug, price: loc.current_price_cents, type: loc.type },
          geometry: { type: "Point" as const, coordinates: [loc.lng!, loc.lat!] },
        })),
      };
      if (map.getSource("locations")) {
        (map.getSource("locations") as any).setData(geojson);
      } else {
        map.addSource("locations", { type: "geojson", data: geojson });
        map.addLayer({
          id: "locations-circle",
          type: "circle",
          source: "locations",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 6, 10, 10, 16],
            "circle-color": ["match", ["get", "status"], "available", "#22c55e", "listed", "#3b82f6", "owned", "#f59e0b", "#8b93a7"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0a0b0f",
            "circle-opacity": 0.9,
          },
        });
        map.on("click", "locations-circle", (e: any) => {
          const f = e.features?.[0];
          if (!f) return;
          const loc = locations.find((l) => l.id === f.properties.id);
          if (loc) setSelected(loc);
        });
        map.on("mouseenter", "locations-circle", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "locations-circle", () => { map.getCanvas().style.cursor = ""; });
      }
    })();
  }, [locations]);

  const filtered = query ? locations.filter((l) => l.name.toLowerCase().includes(query.toLowerCase())) : [];
  const flyTo = (loc: Location) => {
    if (loc.lat && loc.lng && mapRef.current) {
      mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 5, duration: 1500 });
      setSelected(loc);
    }
  };

  return (
    <div style={{ position: "relative", height: "calc(100vh - 57px)" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", top: 16, left: 16, width: 300, maxWidth: "calc(100% - 32px)", zIndex: 10 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search locations…"
          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "0.95rem", outline: "none" }} />
        {filtered.length > 0 && (
          <div className="card" style={{ marginTop: 8, maxHeight: 240, overflow: "auto", padding: 0 }}>
            {filtered.slice(0, 8).map((loc) => (
              <button key={loc.id} onClick={() => { flyTo(loc); setQuery(""); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                <strong>{loc.name}</strong>
                <span className="muted" style={{ marginLeft: 8, fontSize: "0.8rem" }}>{loc.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="card" style={{ position: "absolute", bottom: 24, left: 16, right: 16, maxWidth: 360, zIndex: 10, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className={`badge badge-${selected.status === "available" ? "available" : selected.status === "listed" ? "listed" : "owned"}`}>{selected.status}</span>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--muted)" }}>✕</button>
          </div>
          <h3 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{selected.name}</h3>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 12 }}>{selected.type}</p>
          <div className="price" style={{ fontSize: "1.25rem", marginBottom: 12 }}>{formatPrice(selected.current_price_cents)}</div>
          <Link href={`/location/${selected.slug}`} className="btn btn-primary" style={{ width: "100%" }}>View details</Link>
        </div>
      )}
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,11,15,0.6)", zIndex: 5 }}>Loading map…</div>
      )}
    </div>
  );
}
