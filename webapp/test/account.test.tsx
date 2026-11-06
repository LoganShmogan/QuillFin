import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexError } from "convex/values";
import { beforeEach, expect, test, vi } from "vitest";
import { backend, calls, handle } from "./mocks";
import { DeleteAccount } from "@/components/DeleteAccount";

const signOut = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut }) }));

beforeEach(() => {
  backend.reset();
  signOut.mockReset();
});

test("asks first, then deletes the account and signs out", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<DeleteAccount />);
  const button = screen.getByRole("button", { name: "Delete my account" });

  await userEvent.click(button);
  expect(calls("account:deleteAccount")).toHaveLength(0);

  await userEvent.click(button);
  await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" }));
  expect(calls("account:deleteAccount")).toHaveLength(1);
  expect(confirm).toHaveBeenCalledTimes(2);
});

test("a failed deletion stays signed in and says why", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  handle("account:deleteAccount", () => {
    throw new ConvexError({ code: "DELETION_FAILED", message: "Couldn't delete your sign-in. Try again shortly." });
  });
  render(<DeleteAccount />);
  await userEvent.click(screen.getByRole("button", { name: "Delete my account" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete your sign-in");
  expect(signOut).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Delete my account" })).toBeEnabled();
});
