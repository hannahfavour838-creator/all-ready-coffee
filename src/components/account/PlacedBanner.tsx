"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function PlacedBanner({ number }: { number: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden rounded-[1.75rem] border border-caramel/30 bg-[radial-gradient(90%_140%_at_0%_0%,rgba(192,141,88,0.22),transparent_60%)] p-6 md:p-8" role="status">
      <div className="flex items-start gap-5">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 16 }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-caramel text-ink">
          <Check className="h-5 w-5" />
        </motion.span>
        <div>
          <p className="font-display text-3xl text-cream">Thank you — order {number} is in.</p>
          <p className="mt-2 max-w-xl text-[0.9rem] text-cream/60">We&apos;ve sent it to the bar. You&apos;ll see each step below the moment it happens. This was a demo payment — nothing was charged.</p>
        </div>
      </div>
    </motion.div>
  );
}
