import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    subscription_status: auth.profile.subscription_status,
    subscription_plan: auth.profile.subscription_plan,
    subscription_renewal_date: auth.profile.subscription_renewal_date,
  });
}
