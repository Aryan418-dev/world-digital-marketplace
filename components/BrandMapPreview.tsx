"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Location } from "@/lib/types";

type MapLibre = typeof import("maplibre-gl");

function approxPolygon(
  lng: number,
  lat: number,
  type: string,
): GeoJSON.Polygon {
  const scale =
    type === "country" ? 6 : type === "state" ? 2.2 : 0.55;
  const pts: [number, number][] = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rx = scale * (0.85 + 0.15 * Math.sin(a * 3));
    const ry = scale * 0.65 * (0.9 + 0.1 * Math.cos(a * 2));
    pts.push([lng + Math.cos(a) * rx, lat + Math.sin(a) * ry]);
  }
  pts.push(pts[0]);
  return { type: "Polygon", coordinates: [pts] };
}

function ringsFromGeom(geom: GeoJSON.Geometry): number[][][] {
  if (geom.type === "Polygon") return geom.coordinates as number[][][];
  if (geom.type === "MultiPolygon") {
    return (geom.coordinates as number[][][][]).flat();
  }
  return [];
}

export function BrandMapPreview({
  location,
  imageUrl,
}: {
  location: Location;
  imageUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const imageUrlRef = useRef(imageUrl);
  imageUrlRef.current = imageUrl;

  const redraw = useCallback(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !imageUrlRef.current) {
      if (overlayRef.current) {
        overlayRef.current.remove();
        overlayRef.current = null;
      }
      return;
    }

    let geom: GeoJSON.Geometry | null =
      (location.boundary_geojson as GeoJSON.Geometry | null) || null;
    if (!geom && location.lng != null && location.lat != null) {
      geom = approxPolygon(location.lng, location.lat, location.type);
    }
    if (!geom) return;

    const rings = ringsFromGeom(geom);
    const projectedRings: { x: number; y: number }[][] = [];
    for (const ring of rings) {
      const pts: { x: number; y: number }[] = [];
      for (const c of ring) {
        const lng = c[0];
        const lat = c[1];
        if (typeof lng !== "number" || typeof lat !== "number") continue;
        const p = map.project([lng, lat]);
        pts.push({ x: p.x, y: p.y });
      }
      if (pts.length >= 3) projectedRings.push(pts);
    }
    if (!projectedRings.length) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const pts of projectedRings) {
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const w = Math.max(4, maxX - minX);
    const h = Math.max(4, maxY - minY);

    const clipParts: string[] = [];
    for (const pts of projectedRings) {
      const poly = pts
        .map((p) => `${(p.x - minX).toFixed(1)}px ${(p.y - minY).toFixed(1)}px`)
        .join(",");
      clipParts.push(`polygon(${poly})`);
    }
    const clip = clipParts[0];

    let el = overlayRef.current;
    if (!el) {
      el = document.createElement("div");
      el.className = "brand-preview-overlay";
      const img = document.createElement("img");
      img.alt = "Map ad preview";
      img.draggable = false;
      el.appendChild(img);
      container.appendChild(el);
      overlayRef.current = el;
    }
    const img = el.querySelector("img") as HTMLImageElement;
    if (img.src !== imageUrlRef.current) {
      img.src = imageUrlRef.current;
    }
    el.style.cssText = [
      "position:absolute",
      `left:${minX}px`,
      `top:${minY}px`,
      `width:${w}px`,
      `height:${h}px`,
      `clip-path:${clip}`,
      `-webkit-clip-path:${clip}`,
      "overflow:hidden",
      "pointer-events:none",
      "z-index:2",
    ].join(";");
    img.style.cssText =
      "width:100%;height:100%;object-fit:cover;display:block;";
  }, [location]);

  useEffect(() => {
    let cancelled = false;
    let map: any = null;

    async function init() {
      if (!containerRef.current || location.lat == null || location.lng == null)
        return;
      const maplibregl = (await import("maplibre-gl")).default as MapLibre["default"];
      if (cancelled || !containerRef.current) return;

      const zoom =
        location.type === "country" ? 3.2 : location.type === "state" ? 5.2 : 8.5;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: [location.lng, location.lat],
        zoom,
        attributionControl: false,
        interactive: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        map.resize();
        redraw();
      });
      map.on("render", redraw);
      map.on("resize", redraw);
    }

    void init();

    return () => {
      cancelled = true;
      if (overlayRef.current) {
        overlayRef.current.remove();
        overlayRef.current = null;
      }
      if (map) {
        map.remove();
        map = null;
      }
      mapRef.current = null;
    };
  }, [location.id, location.lat, location.lng, location.type, redraw]);

  useEffect(() => {
    redraw();
  }, [imageUrl, redraw]);

  if (!imageUrl || location.lat == null || location.lng == null) {
    return (
      <div className="brand-map-preview empty">
        <p>Paste a map ad image URL to preview how it fills {location.name} on the map.</p>
      </div>
    );
  }

  return (
    <div className="brand-map-preview">
      <div className="brand-map-preview-label">
        Live map preview · {location.name}
        <span>Image is cropped to the territory border</span>
      </div>
      <div ref={containerRef} className="brand-map-preview-canvas" />
    </div>
  );
}
