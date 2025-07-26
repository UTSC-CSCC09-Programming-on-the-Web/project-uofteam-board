import { Router } from "express";
import Stripe from "stripe";
import express from 'express';
import { checkAuth } from "#middleware/checkAuth.js";
import { StripeCustomers } from "#models/StripeCustomers.js";
const stripe = new Stripe(process.env.STRIPE_API_SECRET as string)

export const stripeRouter = Router();

stripeRouter.post("/create-checkout-session", checkAuth, async (req, res) => {
  try {
    const result = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: 'price_1RovPKCuibBrJj0egxj3LP9J',
          quantity: 1
        }
      ],
      mode: 'subscription',
      metadata: {
        userId: req.session.user?.id as number
      },
      success_url: `${process.env.CLIENT_URL}/dashboard`,
      cancel_url: `${process.env.CLIENT_URL}/?error="stripe_cancel"`
    });
    
    res.json({ url: result.url })

  } catch (error) {
    console.log(error);
  }
});

stripeRouter.post("/webhook", express.raw({type: 'application/json'}), async (req, res) => {
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
      const internalUserId = checkoutSession.metadata?.userId; // Retrieve internal user ID from metadata

      // console.log(`Checkout Session Completed for User ID: ${internalUserId}`);
      // console.log(`Stripe Customer ID: ${stripeCustomerId}`);
      // console.log(`Stripe Subscription ID: ${stripeSubscriptionId}`);

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
          customerId: stripeCustomerId,
          status: subscription.status,
        });
      } else {
        stripeCustomer.customerId = stripeCustomerId as string;
        stripeCustomer.status = subscription.status;
        stripeCustomer.save();
      }
      console.log(stripeCustomer);

      console.log(
        internalUserId,
        stripeCustomerId,
        stripeSubscriptionId,
        subscription.status,
        subscription.items.data[0].price.id,
      );

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
      stripeCustomer.destroy();
      console.log(`Subscription Deleted for Customer ID: ${deletedCustomerId}, Subscription ID: ${deletedSubscriptionId}`);

      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}.`);
  }
});

stripeRouter.post('/create-portal-session', checkAuth, async (req, res) => {
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

  res.json({ url: portalSession.url });
});