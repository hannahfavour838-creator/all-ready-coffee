import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirect } from "@/lib/security/request";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeRedirect(next, user.role === "customer" ? "/account" : "/admin"));
  return (
    <AuthShell
      title={<>Welcome back.</>}
      subtitle="Sign in to reorder favorites, track deliveries and check out faster."
      aside={
        !process.env.DATABASE_URL || process.env.SHOW_DEMO_ACCOUNTS === "1" ? (
          <div className="mt-10 rounded-2xl border border-cream/[0.08] bg-roast/40 p-5 text-[0.8rem] leading-relaxed text-cream/55">
            <p className="eyebrow mb-2">Demo accounts</p>
            <p>Customer — <span className="font-mono text-cream/80">demo@allreadycoffee.com</span> / <span className="font-mono text-cream/80">Espresso!Demo2026</span></p>
            <p>Owner — <span className="font-mono text-cream/80">owner@allreadycoffee.com</span> / <span className="font-mono text-cream/80">AllReady!Owner2026</span></p>
          </div>
        ) : null
      }
    >
      <SignInForm next={safeRedirect(next, "")} />
    </AuthShell>
  );
}
