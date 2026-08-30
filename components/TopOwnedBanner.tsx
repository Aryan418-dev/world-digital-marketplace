import Link from "next/link";

export type TopOwnedItem = {
  id: string;
  slug: string;
  name: string;
  type: string;
  current_price_cents: number;
  logo_url: string | null;
  brand_image_url: string | null;
  website_url: string | null;
  tagline: string | null;
  owner_name: string | null;
  owner_logo: string | null;
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function TopOwnedBanner({ items }: { items: TopOwnedItem[] }) {
  if (!items.length) return null;

  return (
    <div className="top-owned-bar">
      <div className="top-owned-label">Top claimed</div>
      <div className="top-owned-list">
        {items.map((item, i) => {
          const avatar =
            item.logo_url || item.owner_logo || item.brand_image_url || null;
          return (
            <Link
              key={item.id}
              href={`/location/${item.slug}`}
              className="top-owned-card"
            >
              <span className="top-owned-rank">#{i + 1}</span>
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="top-owned-avatar" />
              ) : (
                <span className="top-owned-avatar top-owned-avatar-empty">
                  {item.name.slice(0, 1)}
                </span>
              )}
              <div className="top-owned-meta">
                <strong>{item.name}</strong>
                <span>
                  {item.owner_name ? `Owned by ${item.owner_name}` : "Owned"}
                  {item.tagline ? ` · ${item.tagline}` : ""}
                </span>
              </div>
              <div className="top-owned-price">
                {formatPrice(item.current_price_cents)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
