"use client";

/**
 * KeyringArt — 실제 제품 사진 기준의 아크릴 키링 2D 아트. Engrave3D 의 앞/뒷면과 홈 팝업이 함께 쓴다.
 *
 * 사진: 투명 아크릴 판(좌상·우하 모서리 사선 컷) 안에 검정 패널. 좌상단 투명 영역에 고리 구멍 + 금속 링.
 * 앞면: "SUB" 위에 "3" 을 쌓은 각진 디스플레이 서체(라임), 좌하단에 RECORD >>> / 기록 / 이름.
 * 뒷면: 지붕선 로고 + RUN / HOUSE 세로 배치, 우상단 구멍.
 */
import { Orbitron } from "next/font/google";
import { cn } from "@/lib/utils";

// 사진의 각진 영문 서체에 가장 가까운 Google 폰트. 숫자·대문자만 쓴다.
export const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "900"], display: "swap" });

export const KEYRING_W = 272;
export const KEYRING_H = 176;
/** 아크릴 판 외곽 — 좌상·우하 큰 사선, 우상·좌하 작은 사선 */
export const KEYRING_CLIP =
  "polygon(26px 0, calc(100% - 7px) 0, 100% 7px, 100% calc(100% - 26px), calc(100% - 26px) 100%, 7px 100%, 0 calc(100% - 7px), 0 26px)";
/** 검정 패널 — 좌상단은 구멍 자리를 남기려 더 크게 깎는다 */
const PANEL_CLIP_FRONT =
  "polygon(44px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 22px), calc(100% - 22px) 100%, 4px 100%, 0 calc(100% - 4px), 0 44px)";
/** 뒷면은 좌우 반전(구멍이 우상단) */
const PANEL_CLIP_BACK =
  "polygon(4px 0, calc(100% - 44px) 0, 100% 44px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 22px 100%, 0 calc(100% - 22px), 0 4px)";

export const LIME = "#C7FF00";

export interface KeyringArtProps {
  side: "front" | "back";
  /** SUB-3 · SINGLE · SUB-4 · SUB-5 (또는 TIER) */
  tier: string;
  time: string;
  name: string;
  /** 고리 구멍 배경(판 뒤가 비치는 색) */
  bg?: string;
  className?: string;
}

/** "SUB-3" → ["SUB","3"], "SINGLE" → ["SINGLE",""] */
function splitTier(label: string): [string, string] {
  const m = /^([A-Z]+)-?(\d+)?$/.exec(label.toUpperCase());
  return m ? [m[1], m[2] ?? ""] : [label, ""];
}

export function KeyringArt({ side, tier, time, name, bg = "#10110E", className }: KeyringArtProps) {
  const [word, num] = splitTier(tier);
  const front = side === "front";
  // 뒷면은 좌우가 뒤집혀 구멍이 우상단에 온다
  const holePos = front ? { left: 13, top: 13 } : { right: 13, top: 13 };

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ width: KEYRING_W, height: KEYRING_H, padding: 8, boxSizing: "border-box" }}
    >
      {/* 구멍 (투명 영역) */}
      <div
        className="absolute rounded-full"
        style={{ ...holePos, width: 11, height: 11, background: bg, boxShadow: "inset 0 1px 2px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.35)" }}
      />
      {/* 검정 패널 */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ background: "#060708", clipPath: front ? PANEL_CLIP_FRONT : PANEL_CLIP_BACK }}
      >
        {front ? (
          <>
            <div
              className={cn(orbitron.className, "absolute right-3 top-1 flex flex-col items-end leading-[0.78] tracking-[-0.02em]")}
              style={{ color: LIME, fontWeight: 900 }}
            >
              <span style={{ fontSize: num ? 54 : 34, marginTop: num ? 0 : 14 }}>{word}</span>
              {num && <span style={{ fontSize: 54, marginTop: 2 }}>{num}</span>}
            </div>
            <div className="absolute left-4 bottom-3 flex flex-col font-mono leading-tight" style={{ color: LIME }}>
              <span className="text-[7.5px] tracking-[0.22em]">RECORD &gt;&gt;&gt;</span>
              <span className={cn(orbitron.className, "text-[13px] tabular-nums")} style={{ fontWeight: 700 }}>{time}</span>
              <span className="text-[9px] tracking-[0.14em] uppercase mt-0.5">{name}</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px]" style={{ color: LIME }}>
            <svg width="40" height="16" viewBox="0 0 40 16" fill="none" stroke={LIME} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 14 20 3l9 6" />
              <path d="M29 9h8" />
            </svg>
            <span className={cn(orbitron.className, "text-[12px] leading-none tracking-[0.5em] pl-[0.5em]")} style={{ fontWeight: 700 }}>RUN</span>
            <span className={cn(orbitron.className, "text-[12px] leading-none tracking-[0.32em] pl-[0.32em]")} style={{ fontWeight: 700 }}>HOUSE</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 금속 링 — 좌상단(앞) / 우상단(뒤) 구멍에 걸린 모습. 판 밖으로 삐져나오므로 부모는 overflow visible 이어야 한다. */
export function KeyringRing({ side = "front", className }: { side?: "front" | "back"; className?: string }) {
  const pos = side === "front" ? { left: -14, top: -16 } : { right: -14, top: -16 };
  return (
    <div
      aria-hidden
      className={cn("absolute rounded-full pointer-events-none", className)}
      style={{
        ...pos,
        width: 44,
        height: 44,
        border: "5px solid",
        borderColor: "#D9DCD8 #8E928C #6C6F6A #C9CCC6",
        boxShadow: "0 1px 2px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.25)",
        transform: "rotate(-20deg)",
      }}
    />
  );
}
