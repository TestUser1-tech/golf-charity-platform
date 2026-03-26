import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendSubscriptionLapsedEmail, sendSubscriptionSuccessEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature or secret" }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: "Invalid webhook payload", details: String(error) }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const donationId = session.metadata?.donation_id;

    if (session.mode === "payment" && donationId) {
      await supabase
        .from("donations")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: String(session.payment_intent ?? ""),
          completed_at: new Date().toISOString(),
        })
        .eq("id", donationId);

      return NextResponse.json({ received: true });
    }

    if (userId) {
      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          stripe_customer_id: String(session.customer ?? ""),
          stripe_subscription_id: String(session.subscription ?? ""),
          subscription_plan: session.metadata?.plan ?? "monthly",
        })
        .eq("id", userId);

      const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
      if (profile?.email) {
        await sendSubscriptionSuccessEmail(profile.email, session.metadata?.plan ?? "monthly");
      }
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    const stripeCustomerId = String(invoice.customer ?? "");

    await supabase
      .from("profiles")
      .update({
        subscription_status: "active",
        subscription_renewal_date: invoice.lines?.data?.[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
          : null,
      })
      .eq("stripe_customer_id", stripeCustomerId);
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const stripeCustomerId = String(invoice.customer ?? "");

    const { data: profile } = await supabase
      .from("profiles")
      .update({ subscription_status: "lapsed" })
      .eq("stripe_customer_id", stripeCustomerId)
      .select("email")
      .single();

    if (profile?.email) {
      await sendSubscriptionLapsedEmail(profile.email);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const stripeSubscriptionId = String(subscription.id);

    await supabase
      .from("profiles")
      .update({ subscription_status: "cancelled" })
      .eq("stripe_subscription_id", stripeSubscriptionId);
  }

  return NextResponse.json({ received: true });
}
