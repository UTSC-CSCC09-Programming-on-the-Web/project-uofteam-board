import { Router } from "express";
import Stripe from "stripe";
import express from 'express';
import { checkAuth } from "#middleware/checkAuth.js";
import { StripeCustomers } from "#models/StripeCustomers.js";
import AsyncLock from "async-lock"
import { UrlLink } from "#types/api.js";
const stripe = new Stripe(process.env.STRIPE_API_SECRET as string)


const SUBSCRIPTION_PRICE_ID = "price_1RovPKCuibBrJj0egxj3LP9J"

export const stripeRouter = Router();
export const stripeWebhook = Router();


const checkoutLock = new AsyncLock();
stripeRouter.post("/create-checkout-session", checkAuth(false), async (req, res) => {
  if (!req.session.user) throw new Error("Endpoint requiring authentication failed");

  const stripeCustomer = await StripeCustomers.findByPk(req.session.user?.id);
  if (stripeCustomer?.status === 'active') {
    res.status(422).json({ error: "User is already subscribed, cannot checkout again" });
    return;
  }

  // Prevent getting more than one checkout session per user
  const result = await checkoutLock.acquire((req.session.user.id.toString()),
    async () => {
      if (stripeCustomer?.checkoutId) {
        const existingSession = await stripe.checkout.sessions.retrieve(stripeCustomer.checkoutId);
        if (existingSession.status === 'open') {
          console.log(`User ${stripeCustomer.userId} already has an open Checkout Session ${existingSession.id}. Redirecting to existing session.`);
          return { url: existingSession.url };
        }
      }
    
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: SUBSCRIPTION_PRICE_ID,
            quantity: 1
          }
        ],
        mode: 'subscription',
        metadata: {
          userId: req.session.user?.id as number
        },
        ...(stripeCustomer !== null && {
          customer: stripeCustomer.customerId
        }),
        saved_payment_method_options: {
          payment_method_save: 'enabled', // Adds "Save card for future use" checkbox
        },
        success_url: `${process.env.CLIENT_URL}/dashboard`,             // TODO: change to match the intermediary page
        cancel_url: `${process.env.CLIENT_URL}/?error="stripe_cancel"`  // TODO: change to match the intermediary page
      });

      // Update status in db
      if (stripeCustomer) {
        stripeCustomer.checkoutId = session.id;
        await stripeCustomer.save();
      } else {
        await StripeCustomers.create({
          userId: req.session.user?.id,
          customerId: session.customer as string,   // Customer auto created by checkout session
          checkoutId: session.id,
          status: 'checkout'
        });
      }

      return session;
    }
  )
  
  if (!result?.url) throw new Error(`Failed to get a checkout session for user ${req.session.user}`);
  res.json({ url: result.url } satisfies UrlLink);
});


stripeRouter.post('/create-portal-session', checkAuth(), async (req, res) => {
  const returnUrl = `${process.env.CLIENT_URL}/account`;

  const stripeCustomer = await StripeCustomers.findByPk(req.session.user?.id);
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


stripeWebhook.post("/webhook", express.raw({type: 'application/json'}), async (req, res) => {
  let event: Stripe.Event;
  const signature = req.headers['stripe-signature'];
  if (!signature) return;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err);
    res.sendStatus(400);
    return;
  }
  res.sendStatus(200); // Acknowledge

  // Handle the event
  console.log(`Got event type ${event.type}.`);
  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object;
      if (checkoutSession.mode !== 'subscription') {
        console.log(`Skipping checkout.session.completed event: Not a subscription mode. Mode: ${checkoutSession.mode}`);
        return;
      }

      const stripeCustomerId = checkoutSession.customer;
      const stripeSubscriptionId = checkoutSession.subscription;
      const internalUserId = checkoutSession.metadata?.userId;  // Stored when creating checkout session

      // This should never happen, all checkout sessions are created by us
      if (!stripeCustomerId || !stripeSubscriptionId || !internalUserId) {
        console.error("Got unexpected sessions checkout event: " +
          `${stripeCustomerId}, ${stripeSubscriptionId}, ${internalUserId}`);
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);

      let stripeCustomer = await StripeCustomers.findByPk(internalUserId);
      if (!stripeCustomer) {
        stripeCustomer = await StripeCustomers.create({
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

      console.log(`User ${internalUserId} subscription status updated to: ${subscription.status}`);
      break;
    }

    // This event is fired when a subscription changes status (e.g., renewal, cancellation, payment failure)
    case 'customer.subscription.updated': {
      const updatedSubscription = event.data.object;
      const customerId = updatedSubscription.customer;
      const subscriptionId = updatedSubscription.id;
      const newStatus = updatedSubscription.status;

      console.log(`Subscription Updated for Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`);
      console.log(`New Status: ${newStatus}`);

      const stripeCustomer = await StripeCustomers.findOne({ where: { customerId } });
      if (!stripeCustomer) {
        console.error(`Received update for non-existing customer! ${customerId}`);
        return;
      }
      stripeCustomer.status = newStatus;
      await stripeCustomer.save();

      break;
    }

    // This event is fired when a subscription is explicitly deleted
    case 'customer.subscription.deleted': {
      const deletedSubscription = event.data.object;
      const deletedCustomerId = deletedSubscription.customer;
      const deletedSubscriptionId = deletedSubscription.id;

      const stripeCustomer = await StripeCustomers.findOne({ where: { customerId: deletedCustomerId }});
      if (!stripeCustomer) {
        console.error(`Received delete for non-existing customer! ${deletedCustomerId}`);
        return;
      }
      stripeCustomer.status = 'deleted';
      await stripeCustomer.save();
      console.log(`Subscription Deleted for Customer ID: ${deletedCustomerId}, Subscription ID: ${deletedSubscriptionId}`);

      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}.`);
  }
});