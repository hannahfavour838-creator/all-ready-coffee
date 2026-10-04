import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/Logo";
import { Reveal } from "@/components/motion/Reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="final-cta">
      <div className="container">
        <Reveal className="relative overflow-hidden rounded-[2.5rem] border border-cream/[0.08] bg-[radial-gradient(80%_120%_at_50%_120%,#5a3820_0%,#24170f_45%,#120c09_100%)] px-6 py-24 text-center md:py-36">
          <div className="grain absolute inset-0" />
          <LogoMark className="relative mx-auto mb-10 h-12 w-12" />
          <h2 id="final-cta" className="relative font-display text-display-xl text-cream">
            Ready for your<br /><em className="text-caramel-light">next cup?</em>
          </h2>
          <p className="relative mx-auto mt-6 max-w-md text-[1.02rem] text-cream/60">Order in under a minute. We&apos;ll take it from here.</p>
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/menu" size="lg">Order now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></ButtonLink>
            <ButtonLink href="/sign-up" size="lg" variant="outline">Create an account</ButtonLink>
          </div>
          <p className="relative mt-8 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-cream/35">New here? WELCOME15 takes 15% off your first order</p>
        </Reveal>
      </div>
    </section>
  );
}
