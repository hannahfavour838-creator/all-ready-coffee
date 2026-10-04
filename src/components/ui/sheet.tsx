"use client";

import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap, useLockBody } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";

/** Accessible side sheet / dialog (focus trap, Escape, scroll lock, labelled). */
export function Sheet({ open, onClose, title, children, side = "right", className, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; side?: "right" | "left" | "bottom" | "center"; className?: string; footer?: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open, onClose);
  useLockBody(open);
  const from = side === "right" ? { x: "100%" } : side === "left" ? { x: "-100%" } : side === "bottom" ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 12 };
  const to = side === "center" ? { opacity: 1, scale: 1, y: 0 } : { x: 0, y: 0 };
  return (
    <AnimatePresence>
      {open && (
        <div className={cn("fixed inset-0 z-[80]", side === "center" && "flex items-center justify-center p-4")}>
          <motion.div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={from}
            animate={to}
            exit={from}
            transition={{ type: "spring", damping: 34, stiffness: 320, mass: 0.9 }}
            className={cn(
              "flex flex-col bg-espresso shadow-2xl outline-none", side !== "center" && "absolute",
              side === "right" && "inset-y-0 right-0 w-full max-w-[460px] border-l border-cream/10",
              side === "left" && "inset-y-0 left-0 w-full max-w-[420px] border-r border-cream/10",
              side === "bottom" && "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[1.75rem] border-t border-cream/10",
              side === "center" && "relative max-h-[90dvh] w-full max-w-lg rounded-[1.5rem] border border-cream/10",
              className,
            )}
          >
            <div className="flex items-center justify-between border-b border-cream/[0.08] px-6 py-5">
              <h2 className="font-display text-2xl text-cream">{title}</h2>
              <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-cream/70 transition hover:bg-cream/[0.06] hover:text-cream" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer && <div className="border-t border-cream/[0.08] p-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
