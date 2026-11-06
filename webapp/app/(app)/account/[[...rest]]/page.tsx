import { UserProfile } from "@clerk/nextjs";
import { DeleteAccount } from "@/components/DeleteAccount";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Account" };

const LEGAL = "https://savepoint.co.nz/legal/quillfin";

/// Clerk's account page (name, email, password, connected accounts,
/// sessions), plus deleting the account through QuillFin's backend.
export default function AccountPage() {
  return (
    <>
      <PageHeader title="Account" />
      <p className="mb-4 max-w-[640px] text-ink-soft">
        The same account signs you in to the QuillFin app on your phone and computer, where your notes sync and work offline.
      </p>
      <UserProfile path="/account" routing="path" />
      <DeleteAccount />
      <p className="mt-6 flex gap-4 text-sm">
        <a className="text-fin underline" href={`${LEGAL}#terms`}>Terms of Service</a>
        <a className="text-fin underline" href={`${LEGAL}#privacy`}>Privacy Policy</a>
      </p>
    </>
  );
}
