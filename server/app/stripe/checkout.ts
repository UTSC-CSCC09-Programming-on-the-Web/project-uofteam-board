import Stripe from "stripe";
import { StripeCustomers } from "#models/StripeCustomers.js";
import AsyncLock from "async-lock";
import { UrlLink, User } from "#types/api.js";
const stripe = new Stripe(process.env.STRIPE_API_SECRET as string);

const SUBSCRIPTION_PRICE_ID = "price_1RovPKCuibBrJj0egxj3LP9J";

const checkoutLock = new AsyncLock();
export const create_checkout_session = async (user: User): Promise<UrlLink | null> => {
  const stripeCustomer = await StripeCustomers.findByPk(user.id);
  if (stripeCustomer?.status === "active") {
    return null;
  }

  // Prevent getting more than one checkout session per user
  const result = await checkoutLock.acquire(user.id.toString(), async () => {
    if (stripeCustomer?.checkoutId) {
      const existingSession = await stripe.checkout.sessions.retrieve(stripeCustomer.checkoutId);
      if (existingSession.status === "open") {
        console.log(
          `User ${stripeCustomer.userId} already has an open Checkout Session ` +
            `${existingSession.id}. Redirecting to existing session.`,
        );
        return { url: existingSession.url };
      }
    }

    // Create customer
    let customerId: string;
    if (stripeCustomer) {
      customerId = stripeCustomer.customerId;
    } else {
      const customer = await stripe.customers.create();
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer: customerId,
      metadata: {
        userId: user.id as number,
      },
      saved_payment_method_options: {
        payment_method_save: "enabled", // Adds "Save card for future use" checkbox
      },
      success_url: `${process.env.CLIENT_URL}/checkout`,
      cancel_url: `${process.env.CLIENT_URL}/account`,
    });

    // Update status in db
    if (stripeCustomer) {
      stripeCustomer.checkoutId = session.id;
      await stripeCustomer.save();
    } else {
      await StripeCustomers.create({
        userId: user.id,
        customerId: customerId,
        checkoutId: session.id,
        status: "checkout",
      });
    }

    return session;
  });

  if (!result?.url) throw new Error(`Failed to get a checkout session for user ${user}`);
  return { url: result.url } satisfies UrlLink;
};
