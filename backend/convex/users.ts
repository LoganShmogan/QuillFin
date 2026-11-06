import { ConvexError, v } from "convex/values";
import type { UserIdentity } from "convex/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { SYNC_LIMITS } from "./plans";
import { syncedTableNames } from "./validators";

export async function requireIdentity(ctx: { auth: QueryCtx["auth"] }): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in to continue." });
  }
  return identity;
}

export async function findUser(ctx: QueryCtx, clerkId: string): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
}

// Users are created lazily by the first mutation they make, so there's no
// separate sign-up step to forget or to race.
export async function getOrCreateUser(
  ctx: MutationCtx,
  clerkId: string,
  profile: { email?: string; name?: string } = {},
): Promise<Doc<"users">> {
  const existing = await findUser(ctx, clerkId);
  if (existing !== null) return existing;
  const id = await ctx.db.insert("users", { clerkId, syncSeq: 0, rowCounts: {}, ...profile });
  return (await ctx.db.get(id))!;
}

function profileOf(identity: UserIdentity) {
  return {
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.name ? { name: identity.name } : {}),
  };
}

// Called by both apps right after sign-in: creates the user if needed and
// refreshes the email and name from Clerk.
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const profile = profileOf(identity);
    const user = await getOrCreateUser(ctx, identity.subject, profile);
    if (profile.email !== user.email || profile.name !== user.name) {
      await ctx.db.patch(user._id, profile);
    }
    return null;
  },
});

// The signed-in user's sync summary, for Settings > Sync. Null before the
// user's first mutation.
export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      clerkId: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      rowCounts: v.record(v.string(), v.number()),
      limits: v.object({ maxNoteBytes: v.number(), maxRowsPerTable: v.number() }),
    }),
  ),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const user = await findUser(ctx, identity.subject);
    if (user === null) return null;
    return {
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      rowCounts: user.rowCounts,
      limits: { maxNoteBytes: SYNC_LIMITS.maxNoteBytes, maxRowsPerTable: SYNC_LIMITS.maxRowsPerTable },
    };
  },
});

// What account:deleteAccount needs before it touches Stripe and Clerk.
export const forDeletion = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await findUser(ctx, clerkId);
    return user === null ? null : { userId: user._id, stripeCustomerId: user.stripeCustomerId ?? null };
  },
});

const PURGE_BATCH = 500;

// Deletes everything stored for a user, a batch at a time so a big account
// stays inside Convex's per-mutation limits: it reschedules itself until
// nothing is left, then deletes the user row last.
export const purge = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    let budget = PURGE_BATCH;
    for (const table of syncedTableNames) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user_seq", (q) => q.eq("userId", userId))
        .take(budget);
      for (const row of rows) await ctx.db.delete(row._id);
      budget -= rows.length;
      if (budget === 0) break;
    }
    if (budget > 0) {
      const rest = [
        ...(await ctx.db.query("usage").withIndex("by_user_period", (q) => q.eq("userId", userId)).take(budget)),
        ...(await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", userId)).take(budget)),
      ].slice(0, budget);
      for (const row of rest) await ctx.db.delete(row._id);
      budget -= rest.length;
    }
    if (budget === 0) {
      await ctx.scheduler.runAfter(0, internal.users.purge, { userId });
    } else if ((await ctx.db.get(userId)) !== null) {
      await ctx.db.delete(userId);
    }
  },
});
