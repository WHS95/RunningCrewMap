"use client";

import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { usePathname } from "next/navigation";

// 모션 토큰 (globals.css / tailwind.config.ts와 같은 값)
const EASE_OUT_APPLE = [0.32, 0.72, 0, 1] as const; // 진입 · 감속
const EASE_IN_APPLE = [1, 0, 0.68, 0.28] as const; // 퇴장 · 위 곡선의 거울상

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  in: {
    opacity: 1,
    y: 0,
    // 새 화면은 부드럽게 감속하며 자리를 잡는다.
    transition: { duration: 0.2, ease: EASE_OUT_APPLE },
  },
  out: {
    opacity: 0,
    y: -8,
    // 나가는 화면은 짧게 — mode="wait"에서는 퇴장 시간이 곧 탭 반응 지연이다.
    transition: { duration: 0.12, ease: EASE_IN_APPLE },
  },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // reducedMotion="user": OS의 "동작 줄이기" 설정 시 transform 애니메이션은
    // 끄고 opacity만 남긴다(모션 제거가 아니라 전정기관 자극 없는 등가물).
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          // Match Framer's first-paint inline styles so SSR HTML doesn't mismatch.
          // AnimatePresence initial={false} skips the enter animation on first mount,
          // so the resolved "in" state (opacity:1, y:0) is what the client renders.
          style={{ width: "100%", opacity: 1, transform: "none" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
