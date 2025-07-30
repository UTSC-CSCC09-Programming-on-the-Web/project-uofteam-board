import { Router } from "express";
import Stripe from "stripe";
import express from "express";
import { checkAuth } from "#middleware/checkAuth.js";
import { StripeCustomer } from "#models/StripeCustomers.js";
import { UrlLink } from "#types/api.js";
import { create_checkout_session } from "#services/stripecheckout.js";
import { disconnectUserSocket } from "#ws/canvas.js";
import { confirmEvent } from "#services/stripeprocessed.js";
const stripe = new Stripe(process.env.STRIPE_API_SECRET as string);

export const stripeRouter = Router();
export const stripeWebhook = Router();

stripeRouter.post("/create-checkout-session", checkAuth(false), async (req, res) => {
  if (!req.session.user) throw new Error("Endpoint requiring authentication failed");
  const result = await create_checkout_session(req.session.user);

  if (result === null) {
    res.status(422).json({ error: "User is already subscribed, cannot checkout again" });
    return;
  }
  res.json({ url: result.url } satisfies UrlLink);
});

stripeRouter.post("/create-portal-session", checkAuth(), async (req, res) => {
  const returnUrl = `${process.env.CLIENT_URL}/account`;

  const stripeCustomer = await StripeCustomer.findByPk(req.session.user?.id);
  if (!stripeCustomer) {
    res.status(403).json({ error: "Cannot open portal without going through checkout" });
    return;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomer.customerId,
    return_url: returnUrl,
  });

  res.json({ url: portalSession.url } satisfies UrlLink);
});

stripeWebhook.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event: Stripe.Event;
  const signature = req.headers["stripe-signature"];
  if (!signature) return;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err);
    res.sendStatus(400);
    return;
  }
  res.sendStatus(200); // Acknowledge

  // Not an event we handle
  if (
    event.type !== "customer.subscription.deleted" &&
    event.type !== "customer.subscription.updated" &&
    event.type !== "checkout.session.completed"
  )
    return;

  // Confirm validity and add to record
  console.log("[STRIPE WEBHOOK] Got event", event.id);
  if (!confirmEvent(event, event.data.object.id)) return;

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object;
      if (checkoutSession.mode !== "subscription") {
        console.log(
          `Skipping checkout.session.completed event: Not a subscription mode. Mode: ${checkoutSession.mode}`,
        );
        return;
      }

      const stripeCustomerId = checkoutSession.customer;
      const stripeSubscriptionId = checkoutSession.subscription;
      const internalUserId = checkoutSession.metadata?.userId; // Stored when creating checkout session

      // This should never happen, all checkout sessions are created by us
      if (!stripeCustomerId || !stripeSubscriptionId || !internalUserId) {
        console.error(
          "Got unexpected sessions checkout event: " +
            `${stripeCustomerId}, ${stripeSubscriptionId}, ${internalUserId}`,
        );
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);

      let stripeCustomer = await StripeCustomer.findByPk(internalUserId);
      if (!stripeCustomer) {
        stripeCustomer = await StripeCustomer.create({
          userId: internalUserId,
          subscriptionId: stripeSubscriptionId,
          customerId: stripeCustomerId,
          status: subscription.status,
        });
      } else {
        stripeCustomer.customerId = stripeCustomerId as string;
        stripeCustomer.subscriptionId = stripeSubscriptionId as string;
        stripeCustomer.status = subscription.status;
        stripeCustomer.save();
      }
      if (subscription.status !== "active") disconnectUserSocket(Number(internalUserId));

      console.log(`User ${internalUserId} subscription status updated to: ${subscription.status}`);
      break;
    }

    // This event is fired when a subscription changes status (e.g., renewal, cancellation, payment failure)
    case "customer.subscription.updated": {
      const updatedSubscription = event.data.object;
      const customerId = updatedSubscription.customer;
      const subscriptionId = updatedSubscription.id;
      const newStatus = updatedSubscription.status;

      console.log(
        `Subscription Updated for Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`,
      );
      console.log(`New Status: ${newStatus}`);

      const stripeCustomer = await StripeCustomer.findOne({ where: { customerId } });
      if (!stripeCustomer) {
        console.error(`Received update for non-existing customer! ${customerId}`);
        return;
      }
      stripeCustomer.status = newStatus;
      await stripeCustomer.save();
      if (newStatus !== "active") disconnectUserSocket(stripeCustomer.userId);

      break;
    }

    // This event is fired when a subscription is explicitly deleted
    case "customer.subscription.deleted": {
      const deletedSubscription = event.data.object;
      const deletedCustomerId = deletedSubscription.customer;
      const deletedSubscriptionId = deletedSubscription.id;

      const stripeCustomer = await StripeCustomer.findOne({
        where: { customerId: deletedCustomerId },
      });
      if (!stripeCustomer) {
        console.error(`Received delete for non-existing customer! ${deletedCustomerId}`);
        return;
      }
      stripeCustomer.status = "deleted";
      await stripeCustomer.save();
      disconnectUserSocket(stripeCustomer.userId);
      console.log(
        `Subscription Deleted for Customer ID: ${deletedCustomerId}, Subscription ID: ${deletedSubscriptionId}`,
      );

      break;
    }
  }
});
