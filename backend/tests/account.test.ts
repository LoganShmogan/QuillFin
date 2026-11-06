import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { as, expectCode, newTest } from "./setup";

const stripe = vi.hoisted(() => ({ customersDel: vi.fn() }));
vi.mock("stripe", () => ({
  default: class {
    customers = { del: stripe.customersDel };
  },
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  process.env.CLERK_SECRET_KEY = "sk_clerk_1";
  process.env.STRIPE_SECRET_KEY = "sk_test_1";
  stripe.customersDel.mockReset().mockResolvedValue({ deleted: true });
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
});

// A user with `notes` synced notes, a usage row and a subscription.
async function seed(t: ReturnType<typeof newTest>, clerkId: string, notes: number, stripeCustomerId?: string) {
  return t.run(async (ctx) => {
    const userId: Id<"users"> = await ctx.db.insert("users", { clerkId, syncSeq: 0, rowCounts: {}, stripeCustomerId });
    for (let i = 0; i < notes; i++) {
      await ctx.db.insert("notes", { userId, uid: `n${i}`, updatedAt: 1, seq: i + 1, deletedAt: 1 });
    }
    await ctx.db.insert("folders", { userId, uid: "f1", updatedAt: 1, seq: 1, deletedAt: 1 });
    await ctx.db.insert("usage", { userId, period: "2026-11", aiNotes: 3 });
    await ctx.db.insert("subscriptions", {
      userId,
      stripeSubscriptionId: `sub_${clerkId}`,
      stripeCustomerId: "cus_1",
      status: "active",
      cancelAtPeriodEnd: false,
    });
    return userId;
  });
}

const countAll = (t: ReturnType<typeof newTest>) =>
  t.run(async (ctx) => ({
    users: (await ctx.db.query("users").collect()).length,
    notes: (await ctx.db.query("notes").collect()).length,
    folders: (await ctx.db.query("folders").collect()).length,
    usage: (await ctx.db.query("usage").collect()).length,
    subscriptions: (await ctx.db.query("subscriptions").collect()).length,
  }));

describe("deleteAccount", () => {
  test("cancels billing, deletes the Clerk user and every row, leaving other users alone", async () => {
    const t = newTest();
    await seed(t, "user_alice", 1200, "cus_alice");
    await seed(t, "user_bob", 2);

    await as(t, "user_alice").action(api.account.deleteAccount, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(stripe.customersDel).toHaveBeenCalledWith("cus_alice");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.clerk.com/v1/users/user_alice");
    expect(init).toMatchObject({ method: "DELETE", headers: { authorization: "Bearer sk_clerk_1" } });
    expect(await countAll(t)).toEqual({ users: 1, notes: 2, folders: 1, usage: 1, subscriptions: 1 });
  });

  test("works for a user with no Stripe customer, or none in Convex yet", async () => {
    const t = newTest();
    await seed(t, "user_bob", 1);
    await as(t, "user_bob").action(api.account.deleteAccount, {});
    await as(t, "user_new").action(api.account.deleteAccount, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(stripe.customersDel).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await countAll(t)).users).toBe(0);
  });

  test("treats an already-deleted Stripe customer or Clerk user as done", async () => {
    const t = newTest();
    await seed(t, "user_alice", 1, "cus_gone");
    stripe.customersDel.mockRejectedValue(Object.assign(new Error("No such customer"), { code: "resource_missing" }));
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await as(t, "user_alice").action(api.account.deleteAccount, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await countAll(t)).users).toBe(0);
  });

  test("keeps the data when Stripe or Clerk fails, so the user can retry", async () => {
    const t = newTest();
    await seed(t, "user_alice", 1, "cus_alice");
    stripe.customersDel.mockRejectedValueOnce(new Error("Stripe is down"));
    await expect(as(t, "user_alice").action(api.account.deleteAccount, {})).rejects.toThrow("Stripe is down");
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    await expectCode(as(t, "user_alice").action(api.account.deleteAccount, {}), "DELETION_FAILED");
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect((await countAll(t)).users).toBe(1);
  });

  test("needs a signed-in user and the Clerk secret", async () => {
    const t = newTest();
    await expectCode(t.action(api.account.deleteAccount, {}), "UNAUTHENTICATED");
    delete process.env.CLERK_SECRET_KEY;
    await expectCode(as(t, "user_alice").action(api.account.deleteAccount, {}), "DELETION_NOT_CONFIGURED");
  });
});
