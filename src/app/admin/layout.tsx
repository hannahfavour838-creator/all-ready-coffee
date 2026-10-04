import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/AdminShell";
import { MotionProvider } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · All Ready Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("staff");
  return (
    <MotionProvider>
      <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>
    </MotionProvider>
  );
}
