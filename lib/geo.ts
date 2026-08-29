/** Approximate polygon when OSM boundary is unavailable */
export function approximatePolygon(
  lat: number,
  lng: number,
  type: string,
  points = 48
): GeoJSON.Polygon {
  // rough degrees of extent by type
  const extent =
    type === "country" ? 6 : type === "state" ? 2.2 : 0.35;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    // slight oval for visual interest
    const dx = Math.cos(a) * extent * (type === "city" ? 1.15 : 1);
    const dy = Math.sin(a) * extent * 0.75;
    coords.push([lng + dx, lat + dy]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

export function featureCollectionFromBoundary(
  id: string,
  geom: GeoJSON.Geometry
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id },
        geometry: geom,
      },
    ],
  };
}

export function ringBBox(ring: number[][]): [number, number, number, number] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

export function geomOuterRings(geom: GeoJSON.Geometry): number[][][] {
  if (geom.type === "Polygon") return [geom.coordinates[0]];
  if (geom.type === "MultiPolygon") return geom.coordinates.map((p) => p[0]);
  return [];
}

/** Client-side Nominatim lookup (rate-limited; cache in memory) */
const boundaryCache = new Map<string, GeoJSON.Geometry>();

export async function fetchBoundaryGeoJSON(
  name: string,
  type: string
): Promise<GeoJSON.Geometry | null> {
  const key = `${type}:${name}`;
  if (boundaryCache.has(key)) return boundaryCache.get(key)!;

  const q =
    type === "city"
      ? `${name}`
      : type === "state"
        ? `${name}`
        : name;

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q,
        format: "json",
        polygon_geojson: "1",
        limit: "1",
      }).toString();

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]?.geojson) return null;
    const geom = simplifyGeometry(data[0].geojson);
    boundaryCache.set(key, geom);
    return geom;
  } catch {
    return null;
  }
}

function simplifyRing(ring: number[][], maxPts = 64): number[][] {
  if (ring.length <= maxPts) return ring;
  const step = Math.max(1, Math.floor(ring.length / maxPts));
  const out: number[][] = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  if (out[out.length - 1] !== ring[ring.length - 1]) out.push(ring[ring.length - 1]);
  return out;
}

export function simplifyGeometry(geom: any): GeoJSON.Geometry {
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geom.coordinates
        .slice(0, 2)
        .map((ring: number[][], i: number) => simplifyRing(ring, i === 0 ? 72 : 28)),
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geom.coordinates.slice(0, 3).map((poly: number[][][]) =>
        poly.slice(0, 2).map((ring: number[][], i: number) => simplifyRing(ring, i === 0 ? 64 : 24))
      ),
    };
  }
  return geom;
}
