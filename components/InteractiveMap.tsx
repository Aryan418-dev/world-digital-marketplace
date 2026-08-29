"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { Location } from "@/lib/types";
import {
  approximatePolygon,
  fetchBoundaryGeoJSON,
  geomOuterRings,
  ringBBox,
} from "@/lib/geo";

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

type ShapeAd = {
  loc: Location;
  geom: GeoJSON.Geometry;
  img: string;
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [selected, setSelected] = useState<Location | null>(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [shapeAds, setShapeAds] = useState<ShapeAd[]>([]);
  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  const shapeAdsRef = useRef(shapeAds);
  shapeAdsRef.current = shapeAds;

  const flyTo = useCallback((loc: Location) => {
    if (!loc.lat || !loc.lng || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [loc.lng, loc.lat],
      zoom: loc.type === "country" ? 4 : loc.type === "state" ? 6 : 9,
      pitch: 0,
      bearing: 0,
      duration: 1400,
    });
    setSelected(loc);
    setQuery("");
  }, []);

  // Resolve real OSM boundaries (or approximate) for branded territories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const targets = locations.filter(
        (l) =>
          l.lat != null &&
          l.lng != null &&
          (l.status === "owned" || l.status === "listed") &&
          (l.brand_image_url || l.logo_url)
      );
      const ads: ShapeAd[] = [];
      for (const loc of targets) {
        let geom: GeoJSON.Geometry | null = null;
        if (loc.boundary_geojson) {
          geom = loc.boundary_geojson as GeoJSON.Geometry;
        } else {
          geom = await fetchBoundaryGeoJSON(loc.name, loc.type);
        }
        if (!geom && loc.lat != null && loc.lng != null) {
          geom = approximatePolygon(loc.lat, loc.lng, loc.type);
        }
        if (!geom) continue;
        ads.push({
          loc,
          geom,
          img: (loc.brand_image_url || loc.logo_url) as string,
        });
      }
      if (!cancelled) setShapeAds(ads);
    })();
    return () => {
      cancelled = true;
    };
  }, [locations]);

  /** Project polygons → HTML elements with clip-path = territory border */
  const redrawShapes = useCallback(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;

    overlay.innerHTML = "";

    for (const ad of shapeAdsRef.current) {
      const rings = geomOuterRings(ad.geom);
      if (!rings.length) continue;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      const projected: { x: number; y: number }[][] = [];
      for (const ring of rings) {
        const [bx0, by0, bx1, by1] = ringBBox(ring);
        minX = Math.min(minX, bx0);
        minY = Math.min(minY, by0);
        maxX = Math.max(maxX, bx1);
        maxY = Math.max(maxY, by1);
        projected.push(
          ring.map(([lng, lat]) => {
            const p = map.project([lng, lat]);
            return { x: p.x, y: p.y };
          })
        );
      }

      const tl = map.project([minX, maxY]);
      const br = map.project([maxX, minY]);
      const left = Math.min(tl.x, br.x);
      const top = Math.min(tl.y, br.y);
      const width = Math.abs(br.x - tl.x);
      const height = Math.abs(br.y - tl.y);
      if (width < 4 || height < 4) continue;

      // Off-screen cull
      const cw = map.getContainer().clientWidth;
      const ch = map.getContainer().clientHeight;
      if (left + width < -20 || top + height < -20 || left > cw + 20 || top > ch + 20)
        continue;

      // clip-path polygon in local coords of the box
      const clipParts: string[] = [];
      for (const pts of projected) {
        if (pts.length < 3) continue;
        const poly = pts
          .map((p) => `${(p.x - left).toFixed(1)}px ${(p.y - top).toFixed(1)}px`)
          .join(", ");
        clipParts.push(`polygon(${poly})`);
      }
      if (!clipParts.length) continue;

      const wrap = document.createElement("div");
      wrap.className = "territory-ad";
      wrap.style.cssText = [
        "position:absolute",
        `left:${left.toFixed(1)}px`,
        `top:${top.toFixed(1)}px`,
        `width:${width.toFixed(1)}px`,
        `height:${height.toFixed(1)}px`,
        `clip-path:${clipParts[0]}`,
        clipParts.length > 1 ? `-webkit-clip-path:${clipParts[0]}` : "",
        "cursor:pointer",
        "overflow:hidden",
        "pointer-events:auto",
        "box-shadow:0 0 0 1.5px rgba(255,255,255,0.85)",
      ]
        .filter(Boolean)
        .join(";");

      const img = document.createElement("img");
      img.src = ad.img;
      img.alt = ad.loc.name;
      img.draggable = false;
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;";
      wrap.appendChild(img);

      wrap.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(ad.loc);
      });

      overlay.appendChild(wrap);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
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
        redrawShapes();
      };

      map.once("load", onLoad);
      map.on("move", redrawShapes);
      map.on("zoom", redrawShapes);
      map.on("resize", redrawShapes);

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
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    syncSource(mapRef.current, locations);
  }, [locations, ready]);

  useEffect(() => {
    if (!ready) return;
    redrawShapes();
  }, [shapeAds, ready, redrawShapes]);

  useEffect(() => {
    const onResize = () => {
      mapRef.current?.resize();
      redrawShapes();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redrawShapes]);

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

      {/* Territory ads: image cropped exactly to city/state/country border */}
      <div
        ref={overlayRef}
        className="map-territory-ads"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 2,
        }}
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
