"use client";

/**
 * ScrollVelocity — reactbits "Scroll Velocity" 텍스트 애니메이션을 framer-motion 으로 구현.
 * 기본 속도로 흐르다가 스크롤 속도만큼 빨라지고, 스크롤 방향에 따라 흐름 방향이 바뀐다.
 * prefers-reduced-motion 이면 멈춘다(PageTransition 의 MotionConfig 는
 * useAnimationFrame 루프를 멈추지 않으므로 여기서 직접 확인).
 */

import { useRef, type ReactNode } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { cn } from "@/lib/utils";

const COPIES = 4;

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

export function ScrollVelocityRow({
  children,
  baseVelocity = 2,
  className,
}: {
  children: ReactNode;
  /** 초당 이동 거리(트랙 한 벌 너비 대비 %) — 음수면 반대 방향 */
  baseVelocity?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });
  // 트랙에 COPIES 벌을 깔고 한 벌 너비(100/COPIES %)만큼 돌면 이음매가 없다.
  const x = useTransform(baseX, (v) => `${wrap(-100 / COPIES, 0, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let moveBy = direction.current * (baseVelocity / COPIES) * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) direction.current = -1;
    else if (vf > 0) direction.current = 1;
    moveBy += direction.current * moveBy * vf;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className={cn("overflow-hidden whitespace-nowrap", className)}>
      <motion.div className="flex w-max" style={{ x }}>
        {Array.from({ length: COPIES }, (_, i) => (
          <div key={i} className="flex shrink-0" aria-hidden={i > 0}>
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
