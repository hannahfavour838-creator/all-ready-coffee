"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/Logo";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <LogoMark className="mb-10 h-14 w-14" />
      <p className="eyebrow mb-4">Something spilled</p>
      <h1 className="font-display text-display-lg text-cream">We hit a snag.</h1>
      <p className="mt-5 max-w-md text-cream/55">Nothing you did — something on our side didn&apos;t pour right. Please try again in a moment.{error.digest ? ` (ref ${error.digest.slice(0, 8)})` : ""}</p>
      <div className="mt-10 flex gap-3">
        <Button size="lg" onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClass("outline", "lg")}>Go home</Link>
      </div>
    </main>
  );
}
