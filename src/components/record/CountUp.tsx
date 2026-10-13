"use client";

/**
 * CountUp — reactbits "Count Up" 을 framer-motion animate 로 구현.
 * 화면에 들어오면 한 번 0 → to 로 올라간다. 모션 감소 설정이면 최종 값을 바로 보여 준다.
 * format 은 직렬화 가능한 모드로만 받는다(서버 컴포넌트에서 함수 prop 을 넘길 수 없음).
 */

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { formatSeconds } from "@/lib/record/tier";

type CountFormat = "int" | "time";

function render(v: number, format: CountFormat) {
  return format === "time"
    ? formatSeconds(v)
    : Math.round(v).toLocaleString("en-US");
}

// --ease-out-apple 과 같은 곡선
const EASE_OUT_APPLE = [0.32, 0.72, 0, 1] as const;

export function CountUp({
  to,
  from = 0,
  duration = 1.6,
  format = "int",
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  format?: CountFormat;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce || to === from) {
      el.textContent = render(to, format);
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: EASE_OUT_APPLE,
      onUpdate: (v) => {
        el.textContent = render(v, format);
      },
    });
    return () => controls.stop();
  }, [inView, reduce, to, from, duration, format]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {render(from, format)}
    </span>
  );
}
