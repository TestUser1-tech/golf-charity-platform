import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin, requireAuthenticatedUser } from "@/lib/api-auth";
import {
  sendPayoutCompletedEmail,
  sendProofApprovedEmail,
  sendProofRejectedEmail,
  sendWinnerNotificationEmail,
} from "@/lib/email";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabaseClient();
  const isAdmin = auth.profile.role === "admin";

  const query = supabase
    .from("winners")
    .select("*, draws(draw_month), profiles!winners_user_id_fkey(email)")
    .order("created_at", { ascending: false });

  const { data, error } = isAdmin ? await query : await query.eq("user_id", auth.userId);

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

  const schema = z.object({
    user_id: z.string().uuid(),
    draw_id: z.string().uuid(),
    match_type: z.enum(["3-match", "4-match", "5-match"]),
    prize_amount: z.number().nonnegative(),
  });

  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("winners").insert(parsed.data).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: userProfile } = await supabase.from("profiles").select("email").eq("id", parsed.data.user_id).single();
  if (userProfile?.email) {
    await sendWinnerNotificationEmail(userProfile.email, parsed.data.prize_amount);
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const payload = await request.json();
  const supabase = createServerSupabaseClient();

  if (payload.action === "upload-proof") {
    const schema = z.object({ winnerId: z.string().uuid(), proof_image_url: z.string().url() });
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("winners")
      .update({ proof_image_url: parsed.data.proof_image_url, verification_status: "pending" })
      .eq("id", parsed.data.winnerId)
      .eq("user_id", auth.userId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const schema = z.object({
    winnerId: z.string().uuid(),
    verification_status: z.enum(["pending", "approved", "rejected"]).optional(),
    payment_status: z.enum(["pending", "paid"]).optional(),
  });

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.verification_status) updatePayload.verification_status = parsed.data.verification_status;
  if (parsed.data.payment_status) updatePayload.payment_status = parsed.data.payment_status;
  if (parsed.data.payment_status === "paid") updatePayload.paid_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("winners")
    .update(updatePayload)
    .eq("id", parsed.data.winnerId)
    .select("*, profiles!winners_user_id_fkey(email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const email = data?.profiles?.email;
  if (email && parsed.data.verification_status === "approved") {
    await sendProofApprovedEmail(email);
  }

  if (email && parsed.data.verification_status === "rejected") {
    await sendProofRejectedEmail(email);
  }

  if (email && parsed.data.payment_status === "paid") {
    await sendPayoutCompletedEmail(email);
  }

  return NextResponse.json({ data });
}
