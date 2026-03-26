import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, requireAuthenticatedUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, subscription_status, subscription_plan, charity_id, scores(id, score, score_date, created_at)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const payload = await request.json();

  if (payload.action === "update-score") {
    const schema = z.object({
      id: z.string().uuid(),
      scoreId: z.string().uuid(),
      score: z.number().int().min(1).max(45),
      score_date: z.string(),
    });

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("scores")
      .update({ score: parsed.data.score, score_date: parsed.data.score_date })
      .eq("id", parsed.data.scoreId)
      .eq("user_id", parsed.data.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  const schema = z.object({
    id: z.string().uuid(),
    full_name: z.string().optional(),
    role: z.enum(["subscriber", "admin"]).optional(),
    subscription_status: z.enum(["active", "inactive", "lapsed", "cancelled"]).optional(),
    subscription_plan: z.enum(["monthly", "yearly"]).optional().nullable(),
  });

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...updateData } = parsed.data;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").update(updateData).eq("id", id).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
