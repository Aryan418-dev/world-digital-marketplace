export type LocationStatus =
  | "available"
  | "purchase_pending"
  | "owned"
  | "listed"
  | "sale_pending";

export type LocationType = "country" | "state" | "city";

export interface Location {
  id: string;
  slug: string;
  name: string;
  type: LocationType;
  parent_id: string | null;
  status: LocationStatus;
  base_price_cents: number;
  current_price_cents: number;
  lat: number | null;
  lng: number | null;
  country_code: string | null;
  population: number | null;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  brand_image_url: string | null;
  boundary_geojson?: GeoJSON.Geometry | null;
  website_url: string | null;
  tagline: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  contact_email: string | null;
  owner_id: string | null;
  owned_at: string | null;
  view_count?: number;
  click_count?: number;
  search_count?: number;
  heat_score?: number;
  last_activity_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  bio: string | null;
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  is_admin: boolean;
}

export interface Wallet {
  user_id: string;
  balance_cents: number;
  preview_credits_claimed: boolean;
}
