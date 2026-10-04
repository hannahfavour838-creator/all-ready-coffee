import Image from "next/image";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";

export function AuthShell({ title, subtitle, children, aside }: { title: ReactNode; subtitle: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="container grid min-h-[100svh] items-center gap-16 pb-16 pt-[calc(var(--header-h)+2rem)] lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <LogoMark className="mb-8 h-11 w-11" />
        <h1 className="font-display text-display-md text-cream">{title}</h1>
        <p className="mb-10 mt-3 text-[0.98rem] text-cream/55">{subtitle}</p>
        {children}
        {aside}
      </div>
      <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[2.25rem] border border-cream/[0.07] bg-[radial-gradient(80%_60%_at_50%_70%,#432a1a_0%,#1d140f_58%,#110c0a_100%)] lg:block">
        <div className="grain absolute inset-0" />
        <Image src="/brand/hero-still.webp" alt="" fill sizes="45vw" className="object-contain p-10" priority />
        <p className="absolute inset-x-10 bottom-10 font-display text-4xl leading-tight text-cream">Always ready.<br /><em className="text-caramel-light">Never rushed.</em></p>
      </div>
    </div>
  );
}
