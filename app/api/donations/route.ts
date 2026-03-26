import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const donationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const parsed = donationQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const limit = parsed.data.limit ?? 10;

  const { data, error } = await supabase
    .from("donations")
    .select("id, amount, currency, payment_status, created_at, completed_at, charities(name)")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
