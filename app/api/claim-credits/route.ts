import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PREVIEW_CREDITS = 1_000_000;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
  if (wallet?.preview_credits_claimed) {
    return NextResponse.json({ error: "Credits already claimed" }, { status: 400 });
  }

  const { error } = await supabase.from("wallets").update({
    balance_cents: (wallet?.balance_cents ?? 0) + PREVIEW_CREDITS,
    preview_credits_claimed: true,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("transactions").insert({
    buyer_id: user.id,
    amount_cents: PREVIEW_CREDITS,
    type: "credit_grant",
    status: "completed",
  });

  return NextResponse.json({ ok: true, credited: PREVIEW_CREDITS });
}
