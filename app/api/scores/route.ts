import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveSubscription, requireAuthenticatedUser } from "@/lib/api-auth";

const scoreSchema = z.object({
  score: z.number().int().min(1).max(45),
  score_date: z.string().min(1),
});

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const subscriptionError = requireActiveSubscription(auth);
  if (subscriptionError) return subscriptionError;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", auth.userId)
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const subscriptionError = requireActiveSubscription(auth);
  if (subscriptionError) return subscriptionError;

  const payload = await request.json();
  const parsed = scoreSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scores")
    .insert({
      user_id: auth.userId,
      score: parsed.data.score,
      score_date: parsed.data.score_date,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const subscriptionError = requireActiveSubscription(auth);
  if (subscriptionError) return subscriptionError;

  const payload = await request.json();
  const bodySchema = scoreSchema.extend({ id: z.string().uuid() });
  const parsed = bodySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scores")
    .update({
      score: parsed.data.score,
      score_date: parsed.data.score_date,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", auth.userId)
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

  const subscriptionError = requireActiveSubscription(auth);
  if (subscriptionError) return subscriptionError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("scores").delete().eq("id", id).eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
