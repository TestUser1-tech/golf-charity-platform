import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

const donationSchema = z.object({
  charity_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  currency: z.string().default("usd"),
  message: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const payload = await request.json();
  const parsed = donationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: charity, error: charityError } = await supabase
    .from("charities")
    .select("id, name")
    .eq("id", parsed.data.charity_id)
    .single();

  if (charityError || !charity) {
    return NextResponse.json({ error: charityError?.message || "Charity not found" }, { status: 404 });
  }

  const donationAmount = Number(parsed.data.amount.toFixed(2));

  const { data: donation, error: donationError } = await supabase
    .from("donations")
    .insert({
      user_id: auth.userId,
      charity_id: charity.id,
      donor_email: auth.profile.email,
      amount: donationAmount,
      currency: parsed.data.currency.toLowerCase(),
      message: parsed.data.message || null,
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (donationError || !donation) {
    return NextResponse.json({ error: donationError?.message || "Unable to create donation" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: parsed.data.currency.toLowerCase(),
          product_data: {
            name: `Independent donation - ${charity.name}`,
          },
          unit_amount: Math.round(donationAmount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard/charity?donation=success`,
    cancel_url: `${appUrl}/dashboard/charity?donation=cancelled`,
    metadata: {
      donation_id: donation.id,
      user_id: auth.userId,
      charity_id: charity.id,
    },
  });

  await supabase
    .from("donations")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", donation.id);

  return NextResponse.json({ url: session.url });
}
