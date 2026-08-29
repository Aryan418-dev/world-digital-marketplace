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

  let locationId: string | undefined;
  try {
    const body = await req.json();
    locationId = body.locationId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!locationId) {
    return NextResponse.json({ error: "locationId required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("purchase_location", {
    p_location_id: locationId,
  });

  if (error) {
    const msg = error.message || "Purchase failed";
    const status =
      msg.includes("Insufficient") ? 402
      : msg.includes("Unauthorized") ? 401
      : msg.includes("unavailable") || msg.includes("taken") || msg.includes("not found") ? 409
      : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json(data ?? { ok: true });
}
