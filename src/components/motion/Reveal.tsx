"use client";

import { motion, MotionConfig, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades content up as it enters the viewport (once). */
export function Reveal({ children, delay = 0, className, y = 24, as = "div" }: { children: ReactNode; delay?: number; className?: string; y?: number; as?: "div" | "li" | "section" }) {
  const M = as === "li" ? motion.li : as === "section" ? motion.section : motion.div;
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -12% 0px" }} transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </M>
  );
}

/** Editorial statement whose words brighten as it scrolls into view. */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <motion.span key={i} className="inline-block" initial={{ opacity: 0.14 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: i * 0.035, ease: "easeOut" }}>
          {w}&nbsp;
        </motion.span>
      ))}
    </p>
  );
}
