import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, string | undefined>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locationId = body.locationId;
  if (!locationId) {
    return NextResponse.json({ error: "locationId required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("update_location_branding", {
    p_location_id: locationId,
    p_logo_url: body.logoUrl ?? null,
    p_website_url: body.websiteUrl ?? null,
    p_tagline: body.tagline ?? null,
    p_description: body.description ?? null,
    p_twitter_url: body.twitterUrl ?? null,
    p_instagram_url: body.instagramUrl ?? null,
    p_facebook_url: body.facebookUrl ?? null,
    p_linkedin_url: body.linkedinUrl ?? null,
    p_youtube_url: body.youtubeUrl ?? null,
    p_contact_email: body.contactEmail ?? null,
    p_brand_image_url: body.brandImageUrl ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? { ok: true });
}
