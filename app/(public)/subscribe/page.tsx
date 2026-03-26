"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";

const plans = [
  { id: "monthly", title: "Monthly", description: "Flexible month-to-month participation." },
  { id: "yearly", title: "Yearly", description: "Lower effective monthly cost with annual billing." },
];

function SubscribePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkoutStatus = useMemo(() => searchParams.get("checkout"), [searchParams]);

  useEffect(() => {
    if (checkoutStatus !== "success") {
      return;
    }

    let pollCount = 0;
    const maxPolls = 20;

    const interval = setInterval(async () => {
      pollCount += 1;
      const response = await fetch("/api/stripe/subscription-status", { cache: "no-store" });
      const payload = await response.json();

      if (response.ok && payload.subscription_status === "active") {
        clearInterval(interval);
        router.push("/dashboard");
        return;
      }

      if (pollCount >= maxPolls) {
        clearInterval(interval);
        setError("Payment succeeded. Subscription activation is taking longer than expected. Refresh in a few seconds.");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [checkoutStatus, router]);

  async function startCheckout(plan: string) {
    setLoading(plan);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const payload = await response.json();
      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to start checkout");
      }

      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main>
      <TopNav />
      <section className="page-container max-w-4xl py-14">
        <h1 className="page-title">Choose your subscription</h1>
        <p className="page-subtitle">Your dashboard stays fully active while your subscription is current.</p>
        {checkoutStatus === "success" ? (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            Payment received. Finalizing your subscription and redirecting to dashboard...
          </p>
        ) : null}
        {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.id} className="card flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-semibold">{plan.title}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{plan.description}</p>
              </div>
              <button
                type="button"
                onClick={() => startCheckout(plan.id)}
                className="mt-5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                disabled={loading === plan.id}
              >
                {loading === plan.id ? "Redirecting..." : `Continue with ${plan.title}`}
              </button>
            </article>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<main className="page-container max-w-4xl py-14"><p className="text-sm text-[var(--muted)]">Loading subscription plans...</p></main>}>
      <SubscribePageContent />
    </Suspense>
  );
}
