import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export interface AuthContext {
  userId: string;
  profile: Profile;
}

export async function requireAuthenticatedUser(): Promise<AuthContext | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return {
    userId: user.id,
    profile: profile as Profile,
  };
}

export function requireAdmin(context: AuthContext): NextResponse | null {
  if (context.profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export function requireActiveSubscription(context: AuthContext): NextResponse | null {
  if (context.profile.subscription_status !== "active") {
    return NextResponse.json(
      {
        error: "Subscription required",
        subscription_status: context.profile.subscription_status,
      },
      { status: 402 },
    );
  }

  return null;
}
