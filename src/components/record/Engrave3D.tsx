"use client";

/**
 * Engrave3D — 각인 액세서리 360° 턴테이블 (CSS 3D).
 *
 * 얇은 판을 여러 겹 쌓아 금속 두께(옆면)를 만들고, 앞/뒷면은 backface-visibility 로
 * 각도에 따라 보이게 한다. 회전 각도에 맞춰 반사광 위치·면 음영·바닥 그림자 폭이 바뀐다.
 * 드래그(관성) · 자동 회전 · 정면/측면/후면 스냅. 모션 감소 설정이면 자동 회전을 끈다.
 * 매 프레임 리렌더 대신 framer-motion MotionValue 로 스타일만 갱신한다.
 */

import { useRef, useState, type PointerEvent } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { TIER_BY_ID, type RecordSku, type RecordTier } from "@/lib/record/tier";

export type EngraveFinish = "black" | "gunmetal" | "steel" | "matte";

export interface EngraveText {
  runnerName: string;
  raceName: string;
  raceDate: string; // YYYY.MM.DD
  time: string;
  tier: RecordTier | null;
  certNo: string;
}

const DIMS: Record<RecordSku, { w: number; h: number; r: number; t: number }> = {
  tag: { w: 280, h: 166, r: 18, t: 7 },
  lace: { w: 96, h: 160, r: 48, t: 6 },
  plate: { w: 270, h: 170, r: 6, t: 12 },
};

const FINISH: Record<
  EngraveFinish,
  { face: string; edge: [string, string]; ink: string; accent: string; shadow: string }
> = {
  black: {
    face: "#1F211D",
    edge: ["#0C0D0B", "#2A2C27"],
    ink: "#D5D7CF",
    accent: "#C7FF00",
    shadow: "0 -1px 0 rgba(0,0,0,.7)",
  },
  gunmetal: {
    face: "#4A4D48",
    edge: ["#262825", "#3A3C38"],
    ink: "#D9DBD3",
    accent: "#F2F2EE",
    shadow: "0 -1px 0 rgba(0,0,0,.6)",
  },
  steel: {
    face: "#B4B7AF",
    edge: ["#6E716A", "#8A8D85"],
    ink: "rgba(28,30,26,.86)",
    accent: "rgba(28,30,26,.86)",
    shadow: "0 1px 0 rgba(255,255,255,.35)",
  },
  matte: {
    face: "#9A9D96",
    edge: ["#5E615B", "#787B74"],
    ink: "rgba(28,30,26,.82)",
    accent: "rgba(28,30,26,.82)",
    shadow: "0 1px 0 rgba(255,255,255,.2)",
  },
};

const BRUSH =
  "repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 1px, transparent 1px 7px)";
const SHEEN =
  "linear-gradient(105deg, transparent 35%, rgba(255,255,255,.28) 49%, rgba(255,255,255,.06) 55%, transparent 66%)";

const norm = (deg: number) => ((deg % 360) + 360) % 360;
const cosd = (deg: number) => Math.cos((deg * Math.PI) / 180);

export function Engrave3D({
  sku,
  finish,
  text,
  height = 300,
  scale = 1,
  bg = "#10110E",
  className,
}: {
  sku: RecordSku;
  finish: EngraveFinish;
  text: EngraveText;
  height?: number;
  /** 작은 제품(레이스 태그)을 쇼케이스에서 키워 보여줄 때 */
  scale?: number;
  bg?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const d = DIMS[sku];
  const f = FINISH[finish];

  const ry = useMotionValue(-28);
  const rx = useMotionValue(-12);
  const [auto, setAuto] = useState(true);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; ry: number; rx: number; lx: number; lt: number } | null>(null);
  const vel = useRef(0);
  const target = useRef<number | null>(null);
  const pauseUntil = useRef(0);

  useAnimationFrame((now, delta) => {
    const dt = Math.min(50, delta);
    if (drag.current) return;
    if (target.current !== null) {
      const diff = target.current - ry.get();
      ry.set(ry.get() + diff * Math.min(1, dt / 110));
      if (Math.abs(diff) < 0.2) {
        ry.set(target.current);
        target.current = null;
        pauseUntil.current = now + 2500;
      }
    } else if (Math.abs(vel.current) > 0.004) {
      ry.set(ry.get() + vel.current * dt);
      vel.current *= Math.pow(0.94, dt / 16);
      if (Math.abs(vel.current) <= 0.004) pauseUntil.current = now + 1500;
    } else if (auto && !reduce && now > pauseUntil.current) {
      ry.set(ry.get() + dt * 0.03);
    }
    // 드래그로 기울인 각도는 천천히 기본값으로 돌아온다.
    const rxNow = rx.get();
    if (Math.abs(rxNow + 12) > 0.01) rx.set(rxNow + (-12 - rxNow) * Math.min(1, dt / 900));
  });

  const transform = useTransform(
    [rx, ry],
    ([x, y]) => `scale(${scale}) rotateX(${(x as number).toFixed(2)}deg) rotateY(${(y as number).toFixed(2)}deg)`
  );
  const frontShade = useTransform(ry, (y) => {
    const c = cosd(norm(y));
    return c > 0 ? Math.round((1 - c) * 550) / 1000 : 0.55;
  });
  const backShade = useTransform(ry, (y) => {
    const c = cosd(norm(y));
    return c < 0 ? Math.round((1 + c) * 550) / 1000 : 0.55;
  });
  const sheenFront = useTransform(ry, (y) => `${(100 - (norm(y) / 360) * 200).toFixed(1)}% 0`);
  const sheenBack = useTransform(ry, (y) => `${(100 - (norm(y + 180) / 360) * 200).toFixed(1)}% 0`);
  // SSR/CSR 직렬화 차이(부동소수 자릿수)로 hydration 경고가 나지 않게 정수로 반올림한다.
  const shadowW = useTransform(ry, (y) => Math.round(d.w * scale * (0.45 + 0.55 * Math.abs(cosd(norm(y)))) + d.t * 2));
  const degLabel = useTransform(ry, (y) => `${Math.round(norm(y))}°`);

  const snap = (base: number) => {
    vel.current = 0;
    target.current = Math.round((ry.get() - base) / 360) * 360 + base;
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, ry: ry.get(), rx: rx.get(), lx: e.clientX, lt: performance.now() };
    vel.current = 0;
    target.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g) return;
    const now = performance.now();
    ry.set(g.ry + (e.clientX - g.x) * 0.55);
    rx.set(Math.max(-40, Math.min(40, g.rx - (e.clientY - g.y) * 0.25)));
    vel.current = ((e.clientX - g.lx) * 0.55) / Math.max(1, now - g.lt);
    g.lx = e.clientX;
    g.lt = now;
  };
  const onUp = () => {
    const g = drag.current;
    if (!g) return;
    if (performance.now() - g.lt > 80) vel.current = 0;
    drag.current = null;
    pauseUntil.current = performance.now() + 1500;
    setDragging(false);
  };

  const layerCount = Math.max(6, Math.round(d.t / 0.6));
  const layers = Array.from({ length: layerCount }, (_, i) => -d.t / 2 + (d.t * (i + 0.5)) / layerCount);
  const tierLabel = text.tier ? TIER_BY_ID[text.tier].label : "TIER";
  // 앞면은 폭이 좁아 접두어(RH-REC-)를 빼고 번호만 새긴다.
  const certShort = text.certNo.replace(/^RH-REC-/, "");
  const objTop = Math.round(height * 0.44);

  const faceBase = {
    position: "absolute" as const,
    inset: 0,
    borderRadius: d.r,
    backgroundColor: f.face,
    backgroundImage: BRUSH,
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
    overflow: "hidden",
    color: f.ink,
    textShadow: f.shadow,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12), inset 0 -2px 6px rgba(0,0,0,.25)",
  };
  const hole = { background: bg, boxShadow: "inset 0 2px 3px rgba(0,0,0,.7)" };

  return (
    <div
      className={cn("relative select-none overflow-hidden", dragging ? "cursor-grabbing" : "cursor-grab", className)}
      style={{ height, background: bg, perspective: 1000, perspectiveOrigin: "50% 42%", touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <p className="sr-only">
        {tierLabel} {text.time} 각인 미리보기. 드래그하거나 아래 버튼으로 앞면·옆면·뒷면을 볼 수 있어요.
      </p>
      <motion.div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: objTop + (d.h * scale) / 2 + 22,
          width: shadowW,
          height: 26,
          background: "radial-gradient(ellipse at center, rgba(0,0,0,.6), rgba(0,0,0,0) 70%)",
          filter: "blur(4px)",
        }}
      />

      <motion.div
        aria-hidden
        className="absolute left-1/2"
        style={{
          top: objTop,
          width: d.w,
          height: d.h,
          marginLeft: -d.w / 2,
          marginTop: -d.h / 2,
          transformStyle: "preserve-3d",
          transform,
        }}
      >
        {layers.map((z, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{ borderRadius: d.r, background: f.edge[i % 2], transform: `translateZ(${z.toFixed(2)}px)` }}
          />
        ))}

        {/* 앞면 */}
        <div style={{ ...faceBase, transform: `translateZ(${d.t / 2}px)` }}>
          {sku === "tag" && (
            <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "18px 22px 18px 46px" }}>
              <div className="absolute rounded-full" style={{ ...hole, left: 15, top: "50%", width: 14, height: 14, marginTop: -7 }} />
              <div className="flex justify-between font-mono text-[9px] tracking-[0.26em]">
                <span>RUNHOUSE</span>
                <span className="font-bold tracking-[0.14em]" style={{ color: f.accent }}>{tierLabel}</span>
              </div>
              <div className="font-mono text-[46px] font-bold leading-none tracking-[-0.03em] tabular-nums">{text.time}</div>
              <div className="font-mono text-[8.5px] tracking-[0.16em] opacity-80">HALL OF RECORDS · No. {certShort}</div>
            </div>
          )}
          {sku === "lace" && (
            <div className="absolute inset-0 flex flex-col items-center justify-between py-4">
              <div className="rounded-[5px]" style={{ ...hole, width: 38, height: 9 }} />
              <div className="font-mono text-[16px] font-bold tracking-[0.08em] [writing-mode:vertical-rl]" style={{ color: f.accent }}>{tierLabel}</div>
              <div className="font-mono text-[9.5px] font-bold tabular-nums">{text.time}</div>
              <div className="rounded-[5px]" style={{ ...hole, width: 38, height: 9 }} />
            </div>
          )}
          {sku === "plate" && (
            <div className="absolute inset-0 flex flex-col gap-2.5" style={{ padding: "18px 22px" }}>
              <div className="flex justify-between font-mono text-[8.5px]">
                <span className="tracking-[0.24em]">HALL OF RECORDS</span>
                <span>No. {certShort}</span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[36px] font-bold leading-none tracking-[-0.02em] tabular-nums">{text.time}</span>
                <span className="font-mono text-[9px] font-bold" style={{ color: f.accent }}>{tierLabel}</span>
              </div>
              <div className="h-px bg-current opacity-30" />
              <div className="text-[13px] font-bold">{text.runnerName}</div>
              <div className="font-mono text-[8.5px] tracking-[0.12em] opacity-85">{text.raceName} · {text.raceDate}</div>
            </div>
          )}
          <motion.div className="absolute inset-0 pointer-events-none mix-blend-screen" style={{ borderRadius: d.r, backgroundImage: SHEEN, backgroundSize: "300% 100%", backgroundPosition: sheenFront }} />
          <motion.div className="absolute inset-0 pointer-events-none bg-black" style={{ borderRadius: d.r, opacity: frontShade }} />
        </div>

        {/* 뒷면 */}
        <div style={{ ...faceBase, transform: `rotateY(180deg) translateZ(${d.t / 2}px)` }}>
          {sku === "tag" && (
            <div className="absolute inset-0 flex flex-col justify-center gap-[7px]" style={{ padding: "20px 46px 20px 24px" }}>
              <div className="absolute rounded-full" style={{ ...hole, right: 15, top: "50%", width: 14, height: 14, marginTop: -7 }} />
              <div className="text-[19px] font-bold truncate">{text.runnerName}</div>
              <div className="font-mono text-[9.5px] tracking-[0.1em] truncate">{text.raceName}</div>
              <div className="font-mono text-[9.5px] tracking-[0.1em]">{text.raceDate}</div>
              <div className="font-mono text-[8px] tracking-[0.14em] opacity-70 mt-1">{text.certNo}</div>
            </div>
          )}
          {sku === "lace" && (
            <div className="absolute inset-0 flex flex-col items-center justify-between py-4">
              <div className="rounded-[5px]" style={{ ...hole, width: 38, height: 9 }} />
              <div className="font-mono text-[8px] tracking-[0.3em] [writing-mode:vertical-rl]">RUNHOUSE</div>
              <div className="font-mono text-[8px]">{text.raceDate.slice(2)}</div>
              <div className="rounded-[5px]" style={{ ...hole, width: 38, height: 9 }} />
            </div>
          )}
          {sku === "plate" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="font-mono text-[11px] font-bold tracking-[0.34em]">RUNHOUSE CLUB</div>
              <div className="font-mono text-[8px] tracking-[0.18em] opacity-70">{text.certNo}</div>
            </div>
          )}
          <motion.div className="absolute inset-0 pointer-events-none mix-blend-screen" style={{ borderRadius: d.r, backgroundImage: SHEEN, backgroundSize: "300% 100%", backgroundPosition: sheenBack }} />
          <motion.div className="absolute inset-0 pointer-events-none bg-black" style={{ borderRadius: d.r, opacity: backShade }} />
        </div>
      </motion.div>

      <div className="absolute left-3 top-3 flex items-center gap-2 pointer-events-none font-mono text-[9px] tracking-[0.2em]">
        <span className="text-cart-ink-60">DRAG · 360°</span>
        <motion.span className="text-cart-ink-40">{degLabel}</motion.span>
      </div>

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {(
          [
            ["FRONT", 0],
            ["SIDE", 90],
            ["BACK", 180],
          ] as const
        ).map(([label, base]) => (
          <button
            key={label}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => snap(base)}
            className="h-10 min-w-11 px-2.5 rounded-[2px] border border-cart-rule bg-background/60 font-mono text-[10px] tracking-[0.14em] text-cart-ink-60 hover:text-cart-ink transition-colors duration-fast ease-apple"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            setAuto((a) => !a);
            pauseUntil.current = 0;
          }}
          aria-pressed={auto && !reduce}
          className={cn(
            "h-10 px-2.5 rounded-[2px] border border-cart-rule bg-background/60 font-mono text-[10px] tracking-[0.14em] transition-colors duration-fast ease-apple",
            auto && !reduce ? "text-[hsl(var(--lime))]" : "text-cart-ink-60"
          )}
        >
          AUTO · {auto && !reduce ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
