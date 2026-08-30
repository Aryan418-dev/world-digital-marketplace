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
  /** Reused DOM nodes so we never wipe the overlay every frame */
  const adElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

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

  /**
   * Project each territory polygon → screen space and clip the brand image
   * exactly to the border. Runs every render frame so zoom / pan / rotate stay locked.
   * DOM nodes are reused (no innerHTML wipe) to avoid flicker/lag.
   */
  const redrawShapes = useCallback(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;

    const ads = shapeAdsRef.current;
    const seen = new Set<string>();
    const cw = map.getContainer().clientWidth;
    const ch = map.getContainer().clientHeight;

    for (const ad of ads) {
      const id = ad.loc.id;
      seen.add(id);

      const rings = geomOuterRings(ad.geom);
      if (!rings.length) continue;

      // Project every outer-ring vertex to screen pixels
      let minSX = Infinity,
        minSY = Infinity,
        maxSX = -Infinity,
        maxSY = -Infinity;
      const projectedRings: { x: number; y: number }[][] = [];

      for (const ring of rings) {
        const pts: { x: number; y: number }[] = [];
        for (const [lng, lat] of ring) {
          const p = map.project([lng, lat]);
          pts.push({ x: p.x, y: p.y });
          if (p.x < minSX) minSX = p.x;
          if (p.y < minSY) minSY = p.y;
          if (p.x > maxSX) maxSX = p.x;
          if (p.y > maxSY) maxSY = p.y;
        }
        if (pts.length >= 3) projectedRings.push(pts);
      }
      if (!projectedRings.length) continue;

      const left = minSX;
      const top = minSY;
      const width = maxSX - minSX;
      const height = maxSY - minSY;
      if (width < 3 || height < 3) continue;

      // Off-screen cull
      if (left + width < -40 || top + height < -40 || left > cw + 40 || top > ch + 40) {
        const existing = adElsRef.current.get(id);
        if (existing) existing.style.display = "none";
        continue;
      }

      // clip-path in local coords of the bounding box (exact border shape)
      const clipParts: string[] = [];
      for (const pts of projectedRings) {
        const poly = pts
          .map((p) => `${(p.x - left).toFixed(1)}px ${(p.y - top).toFixed(1)}px`)
          .join(", ");
        clipParts.push(`polygon(${poly})`);
      }
      const clip = clipParts[0];

      let wrap = adElsRef.current.get(id);
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "territory-ad";
        wrap.dataset.locId = id;

        const img = document.createElement("img");
        img.src = ad.img;
        img.alt = ad.loc.name;
        img.draggable = false;
        img.decoding = "async";
        img.style.cssText =
          "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;user-select:none;";
        wrap.appendChild(img);

        wrap.addEventListener("click", (e) => {
          e.stopPropagation();
          const loc = locationsRef.current.find((l) => l.id === id);
          if (loc) setSelected(loc);
        });

        overlay.appendChild(wrap);
        adElsRef.current.set(id, wrap);
      }

      // Update position + exact border clip every frame
      wrap.style.cssText = [
        "position:absolute",
        "display:block",
        `left:${left.toFixed(1)}px`,
        `top:${top.toFixed(1)}px`,
        `width:${width.toFixed(1)}px`,
        `height:${height.toFixed(1)}px`,
        `clip-path:${clip}`,
        `-webkit-clip-path:${clip}`,
        "cursor:pointer",
        "overflow:hidden",
        "pointer-events:auto",
        "will-change:left,top,width,height,clip-path",
        "box-shadow:0 0 0 1.5px rgba(255,255,255,0.85)",
      ].join(";");

      const imgEl = wrap.querySelector("img");
      if (imgEl && imgEl.getAttribute("src") !== ad.img) {
        imgEl.setAttribute("src", ad.img);
      }
    }

    // Remove ads no longer present
    for (const [id, el] of adElsRef.current) {
      if (seen.has(id)) continue;
      el.remove();
      adElsRef.current.delete(id);
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
        maxPitch: 60,
        attributionControl: false,
        fadeDuration: 0,
        dragRotate: true,
        pitchWithRotate: true,
        touchPitch: true,
      });

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: true,
          visualizePitch: true,
        }),
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
      // Every frame during zoom/pan/rotate so clip tracks the map
      map.on("render", redrawShapes);
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
      adElsRef.current.clear();
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

      {/* Territory ads: brand image cropped exactly to city/state/country border */}
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
            <p
              style={{
                color: "var(--primary)",
                fontSize: "0.9rem",
                marginBottom: 4,
              }}
            >
              {selected.tagline}
            </p>
          )}
          <p className="muted">{selected.type}</p>
          <div className="price">
            {formatPrice(selected.current_price_cents)}
          </div>
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
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          0.6,
          6,
          1.4,
          10,
          2,
        ],
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
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          0.5,
          8,
          1.2,
          12,
          1.8,
        ],
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
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          0.6,
          12,
          1.2,
          16,
          1.8,
        ],
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
        1,
        4,
        6,
        10,
        10,
        16,
      ],
      "circle-color": [
        "match",
        ["get", "status"],
        "available",
        "#22c55e",
        "listed",
        "#3b82f6",
        "owned",
        "#f59e0b",
        "#8b93a7",
      ],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#0a0b0f",
      "circle-opacity": 0.95,
    },
  });
}
