"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.2,
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        // Match Framer's first-paint inline styles so SSR HTML doesn't mismatch.
        // AnimatePresence initial={false} skips the enter animation on first mount,
        // so the resolved "in" state (opacity:1, y:0) is what the client renders.
        style={{ width: "100%", opacity: 1, transform: "none" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
