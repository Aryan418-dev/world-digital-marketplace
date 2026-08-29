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

  const { data, error } = await supabase.rpc("update_profile_branding", {
    p_display_name: body.displayName ?? null,
    p_bio: body.bio ?? null,
    p_logo_url: body.logoUrl ?? null,
    p_website_url: body.websiteUrl ?? null,
    p_twitter_url: body.twitterUrl ?? null,
    p_instagram_url: body.instagramUrl ?? null,
    p_facebook_url: body.facebookUrl ?? null,
    p_linkedin_url: body.linkedinUrl ?? null,
    p_youtube_url: body.youtubeUrl ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? { ok: true });
}
