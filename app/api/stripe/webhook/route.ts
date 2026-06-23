import type { Stripe } from "stripe";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("Error handling Stripe event:", event.type, err);
    return new Response("Internal error processing webhook", { status: 500 });
  }

  return new Response(null, { status: 200 });
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const plan = resolvePlan(subscription.status);
      const status = mapStripeStatus(subscription.status);

      const firstItem = subscription.items.data[0];
      await prisma.providerProfile.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscriptionId,
          stripePriceId: firstItem?.price.id ?? null,
          subscriptionStatus: status,
          currentPeriodEnd: firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : null,
          ...(plan !== null ? { plan } : {})
        }
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const plan = resolvePlan(subscription.status);
      const status = mapStripeStatus(subscription.status);

      const firstItem = subscription.items.data[0];
      await prisma.providerProfile.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: firstItem?.price.id ?? null,
          subscriptionStatus: status,
          currentPeriodEnd: firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : null,
          ...(plan !== null ? { plan } : {})
        }
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await prisma.providerProfile.update({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: null,
          stripePriceId: null,
          subscriptionStatus: "CANCELED",
          currentPeriodEnd: null,
          plan: "FREE"
        }
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await prisma.providerProfile.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: "PAST_DUE" }
      });
      break;
    }

    default:
      break;
  }
}

function resolvePlan(stripeStatus: string): PlanTier | null {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "PRO";
  if (
    stripeStatus === "canceled" ||
    stripeStatus === "unpaid" ||
    stripeStatus === "incomplete_expired" ||
    stripeStatus === "paused"
  )
    return "FREE";
  return null;
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    unpaid: "UNPAID",
    paused: "PAUSED"
  };
  return map[stripeStatus] ?? "INCOMPLETE";
}
