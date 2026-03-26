import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendRenewalReminderEmail } from "@/lib/email";

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const today = new Date();
  const lookAhead = new Date(today);
  lookAhead.setDate(today.getDate() + 3);

  const startIso = today.toISOString();
  const endIso = lookAhead.toISOString();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, subscription_renewal_date, renewal_reminder_sent_for")
    .eq("subscription_status", "active")
    .not("subscription_renewal_date", "is", null)
    .gte("subscription_renewal_date", startIso)
    .lte("subscription_renewal_date", endIso);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  const failures: string[] = [];

  for (const profile of profiles || []) {
    if (!profile.subscription_renewal_date) continue;
    const renewalDay = dateOnly(profile.subscription_renewal_date);

    if (profile.renewal_reminder_sent_for === renewalDay) {
      continue;
    }

    try {
      await sendRenewalReminderEmail(profile.email, profile.subscription_renewal_date);
      await supabase
        .from("profiles")
        .update({ renewal_reminder_sent_for: renewalDay })
        .eq("id", profile.id);
      sent += 1;
    } catch (err) {
      failures.push(`Failed ${profile.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, failures });
}
