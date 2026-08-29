"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { Location } from "@/lib/types";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type Props = {
  locations: Location[];
  height?: string;
  showSearch?: boolean;
  className?: string;
  initialZoom?: number;
  initialCenter?: [number, number];
};

export function InteractiveMap({
  locations,
  height = "100%",
  showSearch = true,
  className = "",
  initialZoom = 1.6,
  initialCenter = [20, 18],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const maplibreglRef = useRef<any>(null);
  const [selected, setSelected] = useState<Location | null>(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  const flyTo = useCallback((loc: Location) => {
    if (!loc.lat || !loc.lng || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [loc.lng, loc.lat],
      zoom: 8.5,
      pitch: 0,
      bearing: 0,
      duration: 1400,
    });
    setSelected(loc);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      maplibreglRef.current = maplibregl;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: initialCenter,
        zoom: initialZoom,
        pitch: 0,
        bearing: 0,
        maxPitch: 0,
        attributionControl: false,
        fadeDuration: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right"
      );

      const onLoad = () => {
        if (cancelled) return;
        addAdminBorders(map);
        map.resize();
        setReady(true);
        syncSource(map, locationsRef.current);
        syncBrandMarkers(map, maplibregl, locationsRef.current, markersRef, setSelected);
      };

      map.once("load", onLoad);

      requestAnimationFrame(() => {
        if (!cancelled) map.resize();
      });
      setTimeout(() => {
        if (!cancelled) map.resize();
      }, 120);

      map.on("click", "locations-circle", (e: any) => {
        const f = e.features?.[0];
        if (!f) return;
        const loc = locationsRef.current.find((l) => l.id === f.properties.id);
        if (loc) {
          setSelected(loc);
          map.flyTo({
            center: [loc.lng!, loc.lat!],
            zoom: Math.max(map.getZoom(), 8),
            pitch: 0,
            duration: 900,
          });
        }
      });
      map.on("mouseenter", "locations-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "locations-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    syncSource(mapRef.current, locations);
    if (maplibreglRef.current) {
      syncBrandMarkers(
        mapRef.current,
        maplibreglRef.current,
        locations,
        markersRef,
        setSelected
      );
    }
  }, [locations, ready]);

  useEffect(() => {
    const onResize = () => mapRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const filtered =
    query.trim().length > 0
      ? locations
          .filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8)
      : [];

  return (
    <div
      className={`imap ${className}`}
      style={{
        height,
        width: "100%",
        position: "relative",
        minHeight: 320,
      }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {!ready && (
        <div className="imap-loading">
          <div className="imap-spinner" />
          <span>Loading map…</span>
        </div>
      )}

      {showSearch && (
        <div className="imap-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities, states…"
            aria-label="Search locations"
          />
          {filtered.length > 0 && (
            <div className="imap-search-results">
              {filtered.map((loc) => (
                <button key={loc.id} type="button" onClick={() => flyTo(loc)}>
                  <strong>{loc.name}</strong>
                  <span className="muted">{loc.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="imap-popup card">
          {(selected.brand_image_url || selected.logo_url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.brand_image_url || selected.logo_url || ""}
              alt=""
              className="imap-popup-img"
            />
          )}
          <div className="imap-popup-top">
            <span
              className={`badge badge-${
                selected.status === "available"
                  ? "available"
                  : selected.status === "listed"
                    ? "listed"
                    : "owned"
              }`}
            >
              {selected.status}
            </span>
            <button
              type="button"
              className="imap-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <h3>{selected.name}</h3>
          {selected.tagline && (
            <p style={{ color: "var(--primary)", fontSize: "0.9rem", marginBottom: 4 }}>
              {selected.tagline}
            </p>
          )}
          <p className="muted">{selected.type}</p>
          <div className="price">{formatPrice(selected.current_price_cents)}</div>
          <Link
            href={`/location/${selected.slug}`}
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            View details
          </Link>
        </div>
      )}

      <div className="imap-legend">
        <span>
          <i style={{ background: "var(--available)" }} /> Available
        </span>
        <span>
          <i style={{ background: "var(--owned)" }} /> Owned
        </span>
        <span>
          <i style={{ background: "var(--listed)" }} /> Listed
        </span>
      </div>
    </div>
  );
}

function syncBrandMarkers(
  map: any,
  maplibregl: any,
  locations: Location[],
  markersRef: { current: any[] },
  setSelected: (loc: Location) => void
) {
  markersRef.current.forEach((m) => m.remove());
  markersRef.current = [];

  const branded = locations.filter(
    (l) =>
      l.lat != null &&
      l.lng != null &&
      (l.status === "owned" || l.status === "listed") &&
      (l.brand_image_url || l.logo_url)
  );

  for (const loc of branded) {
    const imgUrl = loc.brand_image_url || loc.logo_url!;
    const el = document.createElement("div");
    el.className = "map-ad-marker";
    el.innerHTML = `<img src="${imgUrl.replace(/"/g, "")}" alt="${loc.name.replace(/"/g, "")}" />`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      setSelected(loc);
      map.flyTo({
        center: [loc.lng!, loc.lat!],
        zoom: Math.max(map.getZoom(), 7),
        duration: 800,
      });
    });

    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([loc.lng!, loc.lat!])
      .addTo(map);
    markersRef.current.push(marker);
  }
}

function addAdminBorders(map: any) {
  if (!map.getSource("openmaptiles")) return;

  if (!map.getLayer("world-boundary-country")) {
    map.addLayer({
      id: "world-boundary-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: [
        "all",
        ["==", ["get", "admin_level"], 2],
        ["!=", ["get", "maritime"], 1],
      ],
      paint: {
        "line-color": "#4b5568",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.6, 6, 1.4, 10, 2],
        "line-opacity": 0.85,
      },
    });
  }

  if (!map.getLayer("world-boundary-state")) {
    map.addLayer({
      id: "world-boundary-state",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      minzoom: 3,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 4],
        ["!=", ["get", "maritime"], 1],
      ],
      paint: {
        "line-color": "#6366f1",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 1.2, 12, 1.8],
        "line-opacity": 0.75,
        "line-dasharray": [2, 1.5],
      },
    });
  }

  if (!map.getLayer("world-boundary-county")) {
    map.addLayer({
      id: "world-boundary-county",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      minzoom: 6,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 6],
        ["!=", ["get", "maritime"], 1],
      ],
      paint: {
        "line-color": "#818cf8",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 10, 1, 14, 1.4],
        "line-opacity": 0.55,
      },
    });
  }

  if (!map.getLayer("world-boundary-city")) {
    map.addLayer({
      id: "world-boundary-city",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      minzoom: 8,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 8],
        ["!=", ["get", "maritime"], 1],
      ],
      paint: {
        "line-color": "#a5b4fc",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 12, 1.2, 16, 1.8],
        "line-opacity": 0.7,
      },
    });
  }
}

function syncSource(map: any, locations: Location[]) {
  const geojson = {
    type: "FeatureCollection" as const,
    features: locations
      .filter((l) => l.lat != null && l.lng != null)
      .map((loc) => ({
        type: "Feature" as const,
        properties: {
          id: loc.id,
          name: loc.name,
          status: loc.status,
          slug: loc.slug,
          price: loc.current_price_cents,
          type: loc.type,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [loc.lng!, loc.lat!],
        },
      })),
  };

  if (map.getSource("locations")) {
    (map.getSource("locations") as any).setData(geojson);
    return;
  }

  map.addSource("locations", {
    type: "geojson",
    data: geojson,
    maxzoom: 12,
  });

  map.addLayer({
    id: "locations-circle",
    type: "circle",
    source: "locations",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        1, 4,
        6, 10,
        10, 16,
      ],
      "circle-color": [
        "match",
        ["get", "status"],
        "available", "#22c55e",
        "listed", "#3b82f6",
        "owned", "#f59e0b",
        "#8b93a7",
      ],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#0a0b0f",
      "circle-opacity": 0.95,
    },
  });
}
