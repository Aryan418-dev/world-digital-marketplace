import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const locationId = body?.locationId as string | undefined;
    const eventType = (body?.eventType as string) || "view";
    const sessionId = (body?.sessionId as string) || null;

    if (!locationId || !["view", "click", "search", "wishlist"].includes(eventType)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc("record_location_event", {
      p_location_id: locationId,
      p_event_type: eventType,
      p_user_id: user?.id ?? null,
      p_session_id: sessionId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data ?? { ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
