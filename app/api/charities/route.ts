import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeContributionPercent } from "@/lib/charity";
import { requireActiveSubscription, requireAdmin, requireAuthenticatedUser } from "@/lib/api-auth";

const charitySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
  is_featured: z.boolean().optional(),
  upcoming_events: z.array(z.object({ title: z.string(), date: z.string() })).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const search = new URL(request.url).searchParams.get("search");

  let query = supabase.from("charities").select("*").order("created_at", { ascending: false });
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const payload = await request.json();
  const parsed = charitySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("charities").insert(parsed.data).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const payload = await request.json();

  if (payload.action === "update-profile-charity") {
    const subscriptionError = requireActiveSubscription(auth);
    if (subscriptionError) return subscriptionError;

    const supabase = createServerSupabaseClient();
    const contribution = normalizeContributionPercent(Number(payload.charity_contribution_pct ?? 10));

    const { data, error } = await supabase
      .from("profiles")
      .update({
        charity_id: payload.charity_id,
        charity_contribution_pct: contribution,
      })
      .eq("id", auth.userId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const parsed = charitySchema.partial().extend({ id: z.string().uuid() }).safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("charities")
    .update(parsed.data)
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("charities").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
