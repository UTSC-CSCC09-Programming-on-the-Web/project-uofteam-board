import { StripeLogEvent } from "#models/StripeLogEvent.js";
import AsyncLock from "async-lock";
import Stripe from "stripe";
import nodeCron from "node-cron";
import { Op } from "sequelize";

// If the server time is further than 10 minutes from our time
// then classify as a replay attack
const withinAcceptableTime = (unixEpochSeconds: number) => {
  const TIME_MS = 1000 * 60 * 10; // 10 minutes
  const difference = new Date().getTime() - unixEpochSeconds * 1000;
  return Math.abs(difference) < TIME_MS;
};

const confirmationLock = new AsyncLock();
export const confirmEvent = async (event: Stripe.Event, objectId: string): Promise<boolean> => {
  return confirmationLock.acquire(event.id, async () => {
    // Check for replay attack
    if (!withinAcceptableTime(event.created)) {
      console.error("Possible replay attack from stripe webhook", event);
      return false;
    }

    // Duplicate Id
    const sameId = await StripeLogEvent.findByPk(event.id);
    if (sameId) {
      return false;
    }

    // New event same object
    const duplicateEvent = await StripeLogEvent.findOne({
      where: {
        type: event.type,
        objectId,
      },
    });
    if (duplicateEvent) {
      return false;
    }

    // Proper event, add to records
    await StripeLogEvent.create({
      eventId: event.id,
      type: event.type,
      objectId,
      createdDate: new Date(event.created * 1000),
    });

    console.log("Added new stripe event to record: ", event.id);
    return true;
  });
};

// Periodically clear outdated events
export const stripeCleanupJobScheduler = async () => {
  nodeCron.schedule("0,30 * * * *", async () => {
    const thrityMinsAgo = new Date(new Date().getTime() - 1000 * 60 * 30);
    const numDeleted = await StripeLogEvent.destroy({
      where: {
        createdDate: {
          [Op.lt]: thrityMinsAgo,
        },
      },
    });
    console.log(`[STRIPE-PROCESSED-CRON-JOB] Job ran and cleared ${numDeleted} entries.`);
  });

  console.log("[STRIPE-PROCESSED-CRON-JOB] cleanup job will run every 30 minutes.");
};
