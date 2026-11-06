"use client";
import { useClerk } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "@/lib/api";
import { messageOf } from "@/lib/errors";
import { Button, Card, ErrorText } from "./ui";

/// Deletes the QuillFin account through Convex (account:deleteAccount), which
/// cancels Pro, deletes the Clerk user and wipes every synced row. Clerk's
/// own delete button stays off in the Clerk dashboard: it would leave the
/// data and the subscription behind (Docs/setup_guide.md).
export function DeleteAccount() {
  const deleteAccount = useAction(api.account.deleteAccount);
  const { signOut } = useClerk();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    if (
      !window.confirm(
        "Permanently delete your QuillFin account and everything synced to it, on every device? A Pro plan is cancelled straight away. This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount({});
      await signOut({ redirectUrl: "/" });
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6 flex max-w-[640px] flex-col gap-3">
      <p className="font-display text-lg font-semibold">Delete account</p>
      <p className="text-sm text-ink-soft">
        Deletes your account, your notes, questions, problems and review history, and cancels Pro. Copies kept on a device
        without syncing stay there until you remove the app.
      </p>
      <Button variant="danger" className="self-start" disabled={busy} onClick={onDelete}>
        Delete my account
      </Button>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
