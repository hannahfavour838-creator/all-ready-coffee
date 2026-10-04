import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { AccountNav } from "@/components/account/AccountNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Your account", template: "%s · Your account" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="container pt-[calc(var(--header-h)+2.5rem)]">
      <div className="grid gap-10 lg:grid-cols-[230px_1fr] lg:gap-14">
        <AccountNav name={user.name} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
