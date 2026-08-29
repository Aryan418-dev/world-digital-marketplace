import Link from "next/link";
import type { Location } from "@/lib/types";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function LocationCard({ location }: { location: Location }) {
  const statusClass =
    location.status === "available"
      ? "badge-available"
      : location.status === "listed"
        ? "badge-listed"
        : "badge-owned";

  return (
    <Link href={`/location/${location.slug}`} className="card" style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span className={`badge ${statusClass}`}>{location.status}</span>
        <span className="muted" style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>
          {location.type}
        </span>
      </div>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>{location.name}</h3>
      <div className="price" style={{ color: "var(--primary)" }}>
        {formatPrice(location.current_price_cents)}
      </div>
    </Link>
  );
}
