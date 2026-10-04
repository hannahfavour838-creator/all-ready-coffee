import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartSync } from "@/components/cart/CartSync";
import { getCurrentUser } from "@/lib/auth/session";
import { MotionProvider } from "@/components/motion/Reveal";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <MotionProvider>
      <Header user={user ? { name: user.name, role: user.role } : null} />
      <main id="main" className="min-h-[70vh]">
        {children}
      </main>
      <Footer />
      <CartDrawer signedIn={!!user} />
      <CartSync userId={user?.id ?? null} />
    </MotionProvider>
  );
}
