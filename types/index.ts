export type UserRole = "subscriber" | "admin";
export type SubscriptionStatus = "active" | "inactive" | "lapsed" | "cancelled";
export type SubscriptionPlan = "monthly" | "yearly";
export type DrawType = "random" | "algorithmic";
export type DrawStatus = "pending" | "simulation" | "published";
export type MatchType = "none" | "3-match" | "4-match" | "5-match";
export type DonationPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan | null;
  subscription_renewal_date: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  country_code: string | null;
  organization_id: string | null;
  renewal_reminder_sent_for: string | null;
  charity_id: string | null;
  charity_contribution_pct: number;
  created_at: string;
  updated_at: string;
}

export interface Score {
  id: string;
  user_id: string;
  score: number;
  score_date: string;
  created_at: string;
}

export interface Charity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_featured: boolean;
  upcoming_events: Array<{ title: string; date: string }> | null;
  created_at: string;
}

export interface Draw {
  id: string;
  draw_month: string;
  draw_type: DrawType;
  drawn_numbers: number[] | null;
  status: DrawStatus;
  jackpot_carried_over: boolean;
  campaign_id: string | null;
  total_prize_pool: number | null;
  created_at: string;
  published_at: string | null;
}

export interface Donation {
  id: string;
  user_id: string | null;
  charity_id: string;
  donor_email: string;
  amount: number;
  currency: string;
  message: string | null;
  payment_status: DonationPaymentStatus;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  country_code: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  country_code: string | null;
  created_at: string;
}
