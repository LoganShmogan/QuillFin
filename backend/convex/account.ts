"use node";
// Account deletion, which both app stores require to be possible from
// inside the app. Order matters: billing stops first (so nobody is charged
// for a deleted account), then the Clerk sign-in goes, then the data.
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { stripeClient } from "./stripeActions";
import { requireIdentity } from "./users";

export const deleteAccount = action({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const clerkKey = process.env.CLERK_SECRET_KEY;
    if (!clerkKey) {
      throw new ConvexError({ code: "DELETION_NOT_CONFIGURED", message: "Account deletion isn't set up on this server yet." });
    }
    const user = await ctx.runQuery(internal.users.forDeletion, { clerkId: identity.subject });

    // Deleting the Stripe customer cancels its subscriptions immediately.
    if (user?.stripeCustomerId) {
      try {
        await stripeClient().customers.del(user.stripeCustomerId);
      } catch (e) {
        if ((e as { code?: string }).code !== "resource_missing") throw e;
      }
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${clerkKey}` },
    });
    if (!response.ok && response.status !== 404) {
      throw new ConvexError({ code: "DELETION_FAILED", message: "Couldn't delete your sign-in. Try again shortly." });
    }

    if (user !== null) await ctx.scheduler.runAfter(0, internal.users.purge, { userId: user.userId });
    return null;
  },
});
