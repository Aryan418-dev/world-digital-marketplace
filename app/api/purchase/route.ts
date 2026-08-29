import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locationId } = await req.json();
  if (!locationId) return NextResponse.json({ error: "locationId required" }, { status: 400 });

  const { data: location } = await supabase.from("locations").select("*").eq("id", locationId).eq("status", "available").single();
  if (!location) return NextResponse.json({ error: "Location unavailable" }, { status: 409 });

  const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
  if (!wallet || wallet.balance_cents < location.current_price_cents) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
  }

  const { data: updated, error: locErr } = await supabase.from("locations").update({
    status: "owned",
    owner_id: user.id,
    owned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", locationId).eq("status", "available").select().single();

  if (locErr || !updated) {
    return NextResponse.json({ error: "Purchase race — location taken" }, { status: 409 });
  }

  await supabase.from("wallets").update({
    balance_cents: wallet.balance_cents - location.current_price_cents,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  await supabase.from("transactions").insert({
    location_id: locationId,
    buyer_id: user.id,
    amount_cents: location.current_price_cents,
    type: "primary_purchase",
    status: "completed",
  });

  await supabase.from("activity").insert({
    user_id: user.id,
    location_id: locationId,
    action: "purchased",
    meta: { price_cents: location.current_price_cents },
  });

  return NextResponse.json({ ok: true, location: updated });
}
