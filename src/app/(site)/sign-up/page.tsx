import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirect } from "@/lib/security/request";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <AuthShell title={<>Your coffee,<br /><em className="text-caramel-light">remembered.</em></>} subtitle="Create an account to save favorites and addresses, and follow every order live. 15% off your first order with WELCOME15.">
      <SignUpForm next={safeRedirect(next, "")} />
    </AuthShell>
  );
}
