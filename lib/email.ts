import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY missing. Email skipped.", payload.subject);
    return;
  }

  await resend.emails.send({
    from: "Golf Charity <no-reply@golfcharity.app>",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}

export async function sendSubscriptionSuccessEmail(to: string, plan: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Subscription activated",
    html: `<p>Your ${plan} subscription is active. Welcome to the Golf Charity Subscription Platform.</p>`,
  });
}

export async function sendDrawPublishedEmail(to: string, drawnNumbers: number[], matchResult: string, prizeAmount: number): Promise<void> {
  await sendEmail({
    to,
    subject: "Draw results are live",
    html: `<p>Drawn numbers: ${drawnNumbers.join(", ")}</p><p>Your match result: ${matchResult}</p><p>Prize amount: ${prizeAmount.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>`,
  });
}

export async function sendWinnerNotificationEmail(to: string, prizeAmount: number): Promise<void> {
  await sendEmail({
    to,
    subject: "You have won",
    html: `<p>You have won ${prizeAmount.toLocaleString("en-US", { style: "currency", currency: "USD" })}. Upload proof in your dashboard: <a href="${appUrl}/dashboard/winnings">Open dashboard</a></p>`,
  });
}

export async function sendProofApprovedEmail(to: string): Promise<void> {
  await sendEmail({ to, subject: "Proof approved", html: "<p>Your proof has been approved. Payment is now in processing.</p>" });
}

export async function sendProofRejectedEmail(to: string): Promise<void> {
  await sendEmail({ to, subject: "Proof rejected", html: `<p>Your submission was rejected. Please re-upload proof at <a href="${appUrl}/dashboard/winnings">your dashboard</a>.</p>` });
}

export async function sendPayoutCompletedEmail(to: string): Promise<void> {
  await sendEmail({ to, subject: "Payout completed", html: "<p>Your payout has been sent. Thank you for participating.</p>" });
}

export async function sendRenewalReminderEmail(to: string, renewalDate: string): Promise<void> {
  await sendEmail({ to, subject: "Renewal reminder", html: `<p>Your subscription renews on ${new Date(renewalDate).toLocaleDateString("en-GB")}.</p>` });
}

export async function sendSubscriptionLapsedEmail(to: string): Promise<void> {
  await sendEmail({ to, subject: "Subscription lapsed", html: `<p>Your payment failed and your subscription is inactive. Renew now: <a href="${appUrl}/subscribe">Renew</a>.</p>` });
}
