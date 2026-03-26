import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { requireAuthenticatedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const payload = await request.json();
  const plan = payload.plan === "yearly" ? "yearly" : "monthly";

  const priceId = plan === "yearly"
    ? process.env.STRIPE_YEARLY_PRICE_ID
    : process.env.STRIPE_MONTHLY_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: `Missing Stripe price id for ${plan}` }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/subscribe?checkout=success`,
    cancel_url: `${appUrl}/subscribe?checkout=cancelled`,
    metadata: {
      user_id: auth.userId,
      plan,
    },
  });

  return NextResponse.json({ url: session.url });
}
