import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, requireAuthenticatedUser } from "@/lib/api-auth";

const listQuerySchema = z.object({
  status: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const parsed = listQuerySchema.safeParse({
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("donations")
    .select("id, donor_email, amount, currency, message, payment_status, created_at, completed_at, charities(name), profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit ?? 100);

  if (parsed.data.status) {
    query = query.eq("payment_status", parsed.data.status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

const updateSchema = z.object({
  donationId: z.string().uuid(),
  payment_status: z.enum(["pending", "paid", "failed", "refunded"]),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const updateData: Record<string, unknown> = {
    payment_status: parsed.data.payment_status,
  };

  if (parsed.data.payment_status === "paid") {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("donations")
    .update(updateData)
    .eq("id", parsed.data.donationId)
    .select("id, payment_status, completed_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
