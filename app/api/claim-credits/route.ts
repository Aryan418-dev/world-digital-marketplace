import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("claim_preview_credits");

  if (error) {
    const msg = error.message || "Failed";
    const status = msg.includes("already") ? 400 : msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json(data ?? { ok: true, credited: 1_000_000 });
}
