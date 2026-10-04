import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-caramel/10 blur-3xl" />
      <LogoMark className="relative mb-10 h-14 w-14" />
      <p className="eyebrow relative mb-4">404 · Not on the menu</p>
      <h1 className="relative font-display text-display-lg text-cream">This cup is empty.</h1>
      <p className="relative mt-5 max-w-md text-cream/55">The page you&apos;re looking for has moved, sold out, or never existed. Let&apos;s get you something warm.</p>
      <div className="relative mt-10 flex gap-3">
        <Link href="/menu" className={buttonClass("primary", "lg")}>Browse the menu</Link>
        <Link href="/" className={buttonClass("outline", "lg")}>Home</Link>
      </div>
    </main>
  );
}
