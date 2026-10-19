"use client";

/**
 * LeagueIntro — /league 런하우스 리그 앱 소개. 스크롤 위치가 연출을 움직인다(스크럽).
 *
 * 흐름은 크루원 소개 영상(영상-크루원-세로, 2026-10)과 같다:
 * 히어로 → 러닝 기록 → 러닝이 끝나면 리그 점수 → 크루끼리 리그 순위 → 크루 활동 달력 → 받는 것 → 초대 코드로 시작.
 * 장면마다 키 큰 <section> 안에 sticky 무대를 두고, 폰 프레임 속 실제 앱 화면을 진행도에 따라 바꿔 끼운다.
 * 되돌려 스크롤하면 그대로 거꾸로 돈다. 모션 감소 설정이면 sticky 를 풀고 진행도를 1로 고정해
 * 장면마다 완성 상태를 세로로 보여 준다.
 *
 * 화면 이미지(public/league/screens): 위 영상의 「실제 앱 화면」 프레임에서 폰 화면만 잘라 냈다
 * (상태 표시줄 포함, 600×1307). 크루 이름은 앱의 샘플 데이터다.
 * 화면 위 강조(테두리) 위치는 화면 높이 · 폭에 대한 % 로 잰 값이다.
 *
 * 주의: PageTransition 의 motion.div 가 transform 을 걸기 때문에 이 안에서 position: fixed 를 쓰지 않는다.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Archivo } from "next/font/google";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowDown, Bell, Check, ChevronLeft } from "lucide-react";
import { KickerLabel } from "@/components/design/cartographic";
import { StoreButton } from "@/components/league/JoinActions";
import { LEAGUE_APP_STORE_URL, LEAGUE_PLAY_STORE_URL, leagueDeepLink } from "@/lib/league/invite";
import { cn } from "@/lib/utils";

// ── 치수 ────────────────────────────────────────────────────────
// 고정 헤더(56px + 노치) 아래에 단계 표시줄, 그 아래가 무대. 하단 내비(72px + 홈 인디케이터)만큼 뺀다.
const HEADER_TOP = "calc(3.5rem + env(safe-area-inset-top, 0px))";
const STEP_BAR_PX = 36;
const STAGE_TOP = `calc(3.5rem + env(safe-area-inset-top, 0px) + ${STEP_BAR_PX}px)`;
const STAGE_H = `calc(100svh - 3.5rem - env(safe-area-inset-top, 0px) - ${STEP_BAR_PX}px - 4.5rem - env(safe-area-inset-bottom, 0px))`;

// 폰 화면: 폭 218px, 화면 이미지 600×1307 비율. 작은 화면에서는 폰 아래가 잘려도 된다.
const SCREEN_W = 218;
const IMG_W = 600;
const IMG_H = 1307;
const SCREEN_H = Math.round((SCREEN_W * IMG_H) / IMG_W); // 475

// 순위 · 포인트 숫자용(디자인과 같은 Archivo 이탤릭 900, 폭 125%).
const archivo = Archivo({ subsets: ["latin"], style: "italic", axes: ["wdth"], variable: "--font-archivo", display: "swap" });

const LIME = "text-[hsl(var(--lime))]";
const EASE_OUT_APPLE = [0.32, 0.72, 0, 1] as const;

const SCREENS = {
  home: "/league/screens/home.webp",
  runFree: "/league/screens/run-free.webp",
  runLive: "/league/screens/run-live.webp",
  runSplits: "/league/screens/run-splits.webp",
  runWeek: "/league/screens/run-week.webp",
  runDone: "/league/screens/run-done.webp",
  crewRank: "/league/screens/league-crew.webp",
  calendar: "/league/screens/crew-calendar.webp",
  crewFind: "/league/screens/crew-find.webp",
} as const;

// ── 단계 표시줄 ─────────────────────────────────────────────────
type Step = "intro" | "record" | "score" | "rank" | "activity" | "ops" | "done";
const STEPS: { key: Step; label: string }[] = [
  { key: "record", label: "기록" },
  { key: "score", label: "점수" },
  { key: "rank", label: "순위" },
  { key: "activity", label: "활동" },
  { key: "ops", label: "운영" },
];
const STEP_ORDER: Step[] = ["intro", "record", "score", "rank", "activity", "ops", "done"];

const StepContext = createContext<(s: Step) => void>(() => {});

// 「동작 줄이기」 설정. framer-motion 의 useReducedMotion 이 이 페이지에서 설정을 못 읽어서
// (실측: matchMedia 는 true 인데 훅은 false) 미디어 쿼리를 직접 구독한다. 서버에서는 false.
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduce(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

export function LeagueIntro() {
  const [step, setStep] = useState<Step>("intro");

  return (
    <StepContext.Provider value={setStep}>
      <div className={cn("w-full", archivo.variable)} style={{ paddingTop: HEADER_TOP }}>
        <StepBar active={step} />

        <Scene id="hero" step="intro" screens={2}>
          {(p) => <HeroStage p={p} />}
        </Scene>
        <Scene id="record" step="record" screens={3.4}>
          {(p) => <RecordStage p={p} />}
        </Scene>
        <Scene id="score" step="score" screens={2.4}>
          {(p) => <ScoreStage p={p} />}
        </Scene>
        <Scene id="rank" step="rank" screens={2.8}>
          {(p) => <RankStage p={p} />}
        </Scene>
        <Scene id="activity" step="activity" screens={2.4}>
          {(p) => <ActivityStage p={p} />}
        </Scene>

        <Scene id="ops" step="ops" screens={3.2}>
          {(p) => <OpsStage p={p} />}
        </Scene>

        <Rewards />
        <CallToAction />
      </div>
    </StepContext.Provider>
  );
}

function StepBar({ active }: { active: Step }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, (v) => v);
  const activeIdx = STEP_ORDER.indexOf(active);

  return (
    <div
      className="sticky z-30 border-b border-cart-rule bg-background/90 backdrop-blur-md"
      style={{ top: HEADER_TOP, height: STEP_BAR_PX }}
    >
      <ol className="flex h-full items-center justify-center gap-2 px-[22px]" aria-label="리그 흐름">
        {STEPS.map((s, i) => {
          const idx = STEP_ORDER.indexOf(s.key);
          const state = idx === activeIdx ? "now" : idx < activeIdx ? "past" : "next";
          return (
            <li key={s.key} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-[10px] text-cart-ink-40" aria-hidden>
                  →
                </span>
              )}
              <span
                aria-current={state === "now" ? "step" : undefined}
                className={cn(
                  "font-mono text-[10px] font-semibold tracking-[0.18em] transition-colors duration-base ease-apple",
                  state === "now" ? LIME : state === "past" ? "text-cart-ink" : "text-cart-ink-40",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <motion.div
        aria-hidden
        className="absolute bottom-[-1px] left-0 h-px w-full origin-left bg-[hsl(var(--lime))]"
        style={{ scaleX }}
      />
    </div>
  );
}

// ── 장면 틀 ─────────────────────────────────────────────────────
function Scene({
  id,
  step,
  screens,
  children,
}: {
  id: string;
  step: Step;
  /** 장면이 차지하는 스크롤 길이(화면 높이 배수). 길수록 연출이 천천히 흐른다. */
  screens: number;
  children: (p: MotionValue<number>) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const setStep = useContext(StepContext);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // 함수 변환으로 한 번 감싼다. 그대로 넘기면 framer-motion 이 opacity 만 쓰는 연결을 네이티브
  // ScrollTimeline 으로 가속하면서 target 구간 대신 문서 전체 진행도로 돌린다(transform 은 정상).
  const progress = useTransform(scrollYProgress, (v) => v);
  const settled = useMotionValue(1);

  // 화면 가운데 줄이 이 장면 안에 있으면 현재 단계로 본다(빠르게 건너뛰어도 놓치지 않게).
  const centered = useInView(ref, { margin: "-50% 0px -50% 0px" });
  useEffect(() => {
    if (centered) setStep(step);
  }, [centered, setStep, step]);

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative"
      style={reduce ? undefined : { height: `${screens * 100}svh` }}
    >
      <div
        className={cn("flex flex-col overflow-hidden", !reduce && "sticky")}
        style={reduce ? { paddingBlock: 40 } : { top: STAGE_TOP, height: STAGE_H }}
      >
        {children(reduce ? settled : progress)}
      </div>
    </section>
  );
}

function SceneHead({
  id,
  kicker,
  title,
  sub,
  children,
}: {
  id: string;
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative z-10 px-[22px] pt-6">
      <KickerLabel tone="lime" className="text-[10px]">
        {kicker}
      </KickerLabel>
      <h2
        id={`${id}-title`}
        className="mt-2.5 text-[25px] leading-[1.28] font-extrabold tracking-[-0.025em] text-cart-ink break-keep"
      >
        {title}
      </h2>
      {sub && <p className="mt-2.5 text-[13px] leading-[1.65] text-cart-ink-60 break-keep">{sub}</p>}
      {children}
    </header>
  );
}

// ── 폰 프레임 ───────────────────────────────────────────────────
function Phone({
  children,
  caption = "실제 앱 화면 · 크루 이름은 샘플이에요",
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="relative mx-auto" style={{ width: SCREEN_W + 14 }}>
      {/* 라임 빛 번짐 — 화면 뒤에서만 은은하게 */}
      <div
        aria-hidden
        className="absolute -inset-x-16 top-10 h-[70%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(var(--lime) / 0.16), transparent)" }}
      />
      <div className="relative rounded-[40px] bg-[#1b1c1e] p-[7px] ring-1 ring-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
        <div
          className="relative overflow-hidden rounded-[33px] bg-[#0f1012]"
          style={{ width: SCREEN_W, height: SCREEN_H }}
        >
          {children}
          {/* 다이내믹 아일랜드 — 화면 이미지의 상태 표시줄 가운데 빈자리에 얹는다 */}
          <span
            aria-hidden
            className="absolute left-1/2 top-[7px] z-20 h-[15px] w-[58px] -translate-x-1/2 rounded-full bg-black"
          />
        </div>
      </div>
      <p className="mt-2.5 text-center font-mono text-[9px] tracking-[0.14em] text-cart-ink-40">
        {caption}
      </p>
    </div>
  );
}

/** 앱 화면 한 장(폰 화면을 꽉 채운다). */
function Screen({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={IMG_W}
      height={IMG_H}
      sizes={`${SCREEN_W}px`}
      priority={priority}
      className="absolute inset-0 h-full w-full"
    />
  );
}

/** 진행도 from 에서 서서히 나타나는 화면(다음 화면으로 바꿔 끼울 때). */
function SwapScreen({
  p,
  from,
  src,
  alt,
}: {
  p: MotionValue<number>;
  from: number;
  src: string;
  alt: string;
}) {
  const opacity = useTransform(p, [from, from + 0.07], [0, 1]);
  const scale = useTransform(p, [from, from + 0.07], [1.04, 1]);
  return (
    <motion.div className="absolute inset-0" style={{ opacity, scale }}>
      <Screen src={src} alt={alt} />
    </motion.div>
  );
}

/** 화면 위 강조 테두리. 위치는 화면에 대한 % (top/left/width/height). */
function Highlight({
  p,
  at,
  box,
  radius = 12,
  until,
}: {
  p: MotionValue<number>;
  at: number;
  box: { top: number; left: number; width: number; height: number };
  radius?: number;
  /** 이 진행도에서 다시 사라진다(없으면 끝까지 남는다). */
  until?: number;
}) {
  const opacity = useTransform(
    p,
    until ? [at, at + 0.05, until - 0.04, until] : [at, at + 0.05],
    until ? [0, 1, 1, 0] : [0, 1],
  );
  const scale = useTransform(p, [at, at + 0.08], [1.08, 1]);
  return (
    <motion.span
      aria-hidden
      className="absolute z-10 border-2 border-[hsl(var(--lime))] shadow-[0_0_22px_hsl(var(--lime)/0.45)]"
      style={{
        top: `${box.top}%`,
        left: `${box.left}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
        borderRadius: radius,
        opacity,
        scale,
      }}
    />
  );
}

/** 폰 옆에 떠오르는 작은 칩. 진행도 구간에서 튀어나온다. */
function FloatChip({
  p,
  at,
  className,
  children,
}: {
  p: MotionValue<number>;
  at: number;
  className?: string;
  children: ReactNode;
}) {
  const opacity = useTransform(p, [at, at + 0.06], [0, 1]);
  const y = useTransform(p, [at, at + 0.08], [10, 0]);
  const scale = useTransform(p, [at, at + 0.08], [0.9, 1]);
  return (
    <motion.div
      className={cn(
        "absolute z-30 rounded-[10px] border border-cart-rule bg-[#17181a]/95 px-3 py-2 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur",
        className,
      )}
      style={{ opacity, y, scale }}
    >
      {children}
    </motion.div>
  );
}

function StageBody({ children }: { children: ReactNode }) {
  return <div className="relative mt-6 flex-1 min-h-0 px-[22px]">{children}</div>;
}

// ── 0. 히어로 — 폰이 일어서며 홈 화면 ───────────────────────────
function HeroStage({ p }: { p: MotionValue<number> }) {
  const rotateX = useTransform(p, [0, 0.4], [22, 0]);
  const y = useTransform(p, [0, 0.4], [70, 0]);
  const scale = useTransform(p, [0, 0.4], [0.9, 1]);
  const hint = useTransform(p, [0, 0.12], [1, 0]);

  return (
    <>
      <header className="px-[22px] pt-7">
        <KickerLabel tone="lime" className="text-[10px]">
          ● RUNHOUSE LEAGUE
        </KickerLabel>
        <h1
          id="hero-title"
          className="mt-3 text-[32px] leading-[1.22] font-black tracking-[-0.03em] text-cart-ink break-keep"
        >
          혼자 달린 기록이
          <br />
          크루의 <span className={LIME}>점수</span>가 돼요
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-cart-ink-60 break-keep">
          러닝 기록은 기본, 달린 만큼 우리 크루 리그 점수가 쌓이고 크루끼리 순위를 겨뤄요.
        </p>
        <motion.div
          className="mt-4 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-cart-ink-40"
          style={{ opacity: hint }}
          aria-hidden
        >
          SCROLL <ArrowDown className="h-3 w-3" />
        </motion.div>
      </header>

      <StageBody>
        <div style={{ perspective: 900 }}>
          <motion.div style={{ rotateX, y, scale, transformOrigin: "50% 100%" }}>
            <Phone>
              <Screen src={SCREENS.home} alt="홈 화면 — 이번 달 누적 거리와 JUST RUN" priority />
            </Phone>
          </motion.div>
        </div>
        <FloatChip p={p} at={0.45} className="right-[10px] top-[60px]">
          <div className="font-mono text-[9px] tracking-[0.14em] text-cart-ink-40">이번 달 내 기여</div>
          <div className={cn("font-mono text-[15px] font-bold tabular-nums", LIME)}>119 P</div>
        </FloatChip>
        <FloatChip p={p} at={0.58} className="left-[10px] top-[240px]">
          <div className="font-mono text-[9px] tracking-[0.14em] text-cart-ink-40">크루 내 순위</div>
          <div className="text-[13px] font-bold text-cart-ink">1위</div>
        </FloatChip>
      </StageBody>
    </>
  );
}

// ── 1. 기록 — 러닝 기록은 기본 ──────────────────────────────────
const RECORD_STEPS = [
  { at: 0, label: "자유 · 거리 · 시간 러닝" },
  { at: 0.24, label: "실시간 기록" },
  { at: 0.46, label: "구간 페이스" },
  { at: 0.68, label: "주간 · 월간 기록" },
];

function currentRecordStep(v: number) {
  let i = 0;
  RECORD_STEPS.forEach((s, k) => {
    if (v >= s.at + 0.03) i = k;
  });
  return i;
}

function RecordStage({ p }: { p: MotionValue<number> }) {
  const [idx, setIdx] = useState(() => currentRecordStep(p.get()));
  useMotionValueEvent(p, "change", (v) => setIdx(currentRecordStep(v)));

  return (
    <>
      <SceneHead
        id="record"
        kicker="● 러닝 기록"
        title={
          <>
            러닝 기록은
            <br />
            <span className={LIME}>기본</span>이에요
          </>
        }
      >
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="러닝 기록 기능">
          {RECORD_STEPS.map((s, i) => (
            <li
              key={s.label}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-base ease-apple",
                i <= idx
                  ? "border-[hsl(var(--lime))]/70 text-[hsl(var(--lime))]"
                  : "border-cart-rule text-cart-ink-40",
              )}
            >
              {s.label}
            </li>
          ))}
        </ul>
      </SceneHead>
      <StageBody>
        <Phone>
          <Screen src={SCREENS.runFree} alt="러닝 시작 화면 — 자유 · 거리 · 시간" />
          <SwapScreen p={p} from={RECORD_STEPS[1].at} src={SCREENS.runLive} alt="러닝 중 실시간 기록 화면" />
          <SwapScreen p={p} from={RECORD_STEPS[2].at} src={SCREENS.runSplits} alt="구간 페이스 화면" />
          <SwapScreen p={p} from={RECORD_STEPS[3].at} src={SCREENS.runWeek} alt="주간 러닝 기록 화면" />
        </Phone>
      </StageBody>
    </>
  );
}

// ── 2. 점수 — 러닝이 끝나면 우리 크루 리그 점수에 ────────────────
function ScoreStage({ p }: { p: MotionValue<number> }) {
  const sheetY = useTransform(p, [0.05, 0.3], ["30%", "0%"]);
  return (
    <>
      <SceneHead
        id="score"
        kicker="● 01 · 러닝이 끝나면"
        title={
          <>
            우리 크루 <span className={LIME}>리그 점수</span>에
            <br />
            바로 더해져요
          </>
        }
        sub="앱으로 달린 기록은 그대로 소속 크루의 리그 점수가 돼요."
      />
      <StageBody>
        <Phone>
          <motion.div className="absolute inset-0" style={{ y: sheetY }}>
            <Screen src={SCREENS.runDone} alt="러닝 완료 — 크루에 반영된 리그 점수 +200 P" />
          </motion.div>
          <Highlight p={p} at={0.38} box={{ top: 48.5, left: 20, width: 60, height: 8 }} />
        </Phone>
      </StageBody>
    </>
  );
}

// ── 3. 순위 — 크루끼리 리그 순위 ───────────────────────────────
function RankStage({ p }: { p: MotionValue<number> }) {
  return (
    <>
      <SceneHead
        id="rank"
        kicker="● 02 · 크루끼리"
        title={
          <>
            <span className={LIME}>리그 순위</span>를
            <br />
            겨뤄요
          </>
        }
        sub="시즌 동안 크루끼리 포인트로 순위를 다퉈요. 크루에 들어가면 그 크루와 함께 순위에 올라가요."
      />
      <StageBody>
        <Phone caption="디자인 시안 · 포인트와 2위 아래 크루는 예시예요">
          <DesignScreen>
            <LeagueBoard p={p} />
          </DesignScreen>
        </Phone>
      </StageBody>
    </>
  );
}

// 리그 전체 순위 — 런하우스클럽-앱-관리자 디자인(League-Runner)을 390px 원본 치수로 옮긴 것.
// 디자인의 크루 · 포인트는 시안용 값이다. 1위만 실제 크루(뜨거운냄새) 로고를 쓰고(2026-10-20 우혁 결정),
// 2위 아래는 샘플 크루(글자 뱃지)로 둔다. 포인트 · 순위는 예시라 캡션에 밝힌다.
type BoardCrew = { rank: number; name: string; region: string; active: number; trend: string; pts: string };
// logo: public/league/crews 의 크루 로고(정사각 크롭). 없으면 이름 끝 글자로 그린다.
const PODIUM: (BoardCrew & { rim: string; edge: string; coin: number; block: number; at: number; logo?: string })[] = [
  { rank: 2, name: "크루 B", region: "군포", active: 15, trend: "▲1", pts: "3.2k", rim: "#d6d8dc", edge: "#7c7f86", coin: 80, block: 92, at: 0.2 },
  { rank: 1, name: "뜨거운냄새", region: "하남", active: 12, trend: "–", pts: "3.4k", rim: "#cfef68", edge: "#7f9f1e", coin: 96, block: 128, at: 0.14, logo: "/league/crews/hot-smell.webp" },
  { rank: 3, name: "크루 C", region: "용인", active: 10, trend: "▼1", pts: "3.0k", rim: "#d99a5b", edge: "#7f4f24", coin: 80, block: 72, at: 0.26 },
];
const BOARD_ROWS: BoardCrew[] = [
  { rank: 4, name: "크루 D", region: "성남", active: 9, trend: "▲1", pts: "2.7k" },
  { rank: 5, name: "크루 E", region: "하남", active: 6, trend: "▼1", pts: "2.5k" },
  { rank: 6, name: "크루 F", region: "서울", active: 11, trend: "–", pts: "2.4k" },
  { rank: 7, name: "크루 G", region: "창원", active: 7, trend: "▲3", pts: "2.2k" },
  { rank: 8, name: "크루 H", region: "부산", active: 5, trend: "▼2", pts: "1.9k" },
];
const CONFETTI = [
  { x: "9%", y: "8%", w: 10, h: 4, bg: "#d6d8dc", r: 20 },
  { x: "30%", y: "14%", w: 4, h: 8, bg: "#cfef68", r: -30 },
  { x: "36%", y: "30%", w: 4, h: 7, bg: "#d6d8dc", r: 10 },
  { x: "62%", y: "48%", w: 4, h: 8, bg: "#cfef68", r: 40 },
  { x: "72%", y: "30%", w: 4, h: 7, bg: "#cfef68", r: -20 },
  { x: "12%", y: "52%", w: 10, h: 4, bg: "#d6d8dc", r: 15 },
  { x: "88%", y: "18%", w: 6, h: 6, bg: "#cfef68", r: 30 },
];
const ARCHIVO: React.CSSProperties = {
  fontFamily: "var(--font-archivo), 'Outfit', sans-serif",
  fontStyle: "italic",
  fontWeight: 900,
  fontStretch: "125%",
};

function LeagueBoard({ p }: { p: MotionValue<number> }) {
  return (
    <div className="absolute inset-0 bg-[#0f0f10] text-[#f7f7f8] tabular-nums">
      <StatusLine />
      <div className="flex h-[52px] items-center justify-between px-[16px]">
        <span className="text-[22px] font-bold">리그</span>
        <span className="text-[14px] font-bold" style={{ color: OPS_LIME }}>
          시즌 공지
        </span>
      </div>
      <div className="mx-[16px] grid grid-cols-2 gap-[6px] rounded-[14px] bg-[#212225] p-[4px] text-[14px] font-bold">
        <span className="flex h-[38px] items-center justify-center text-[#aeb0b6]">우리 크루</span>
        <span className="flex h-[38px] items-center justify-center rounded-[10px] bg-[#3a3b40]">전체 순위</span>
      </div>
      <div
        className="mx-[16px] mt-[14px] flex items-center gap-[10px] rounded-[14px] bg-[#1b1c1e] px-[14px] py-[12px]"
        style={{ boxShadow: "inset 0 0 0 1px rgba(207,239,104,0.3)" }}
      >
        <span className="flex-grow text-[13px] font-semibold leading-[19px]">크루에 들어가면 여기 순위에 함께 올라가요</span>
        <span className="text-[13px] font-extrabold" style={{ color: OPS_LIME }}>
          크루 찾기
        </span>
      </div>

      <div
        className="relative overflow-hidden pt-[16px]"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 30%, rgba(207,239,104,0.12) 0%, rgba(207,239,104,0) 70%), #0f0f10",
        }}
      >
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="pointer-events-none absolute rounded-[2px]"
            style={{ left: c.x, top: c.y, width: c.w, height: c.h, background: c.bg, transform: `rotate(${c.r}deg)` }}
          />
        ))}
        <div style={{ perspective: 900, perspectiveOrigin: "50% 0%" }}>
          <div
            className="flex items-end justify-center"
            style={{ transformStyle: "preserve-3d", transform: "rotateX(-12deg)" }}
          >
            {PODIUM.map((c) => (
              <PodiumColumn key={c.rank} p={p} crew={c} />
            ))}
          </div>
        </div>
        <div className="pb-[4px] pt-[10px] text-center text-[12px] leading-[16px] text-[#aeb0b6]/60">
          뱃지를 누르면 상세 · 밀면 회전
        </div>
      </div>

      <div className="flex flex-col gap-[8px] px-[16px] pt-[16px]">
        <div className="flex justify-between px-[4px] text-[12px] leading-[16px] text-[#aeb0b6]/60">
          <span>순위 · 크루</span>
          <span>크루 포인트</span>
        </div>
        {BOARD_ROWS.map((r, i) => (
          <BoardRow key={r.rank} p={p} crew={r} at={0.5 + i * 0.05} />
        ))}
      </div>
    </div>
  );
}

function PodiumColumn({ p, crew }: { p: MotionValue<number>; crew: (typeof PODIUM)[number] }) {
  const blockScale = useTransform(p, [crew.at - 0.1, crew.at + 0.08], [0, 1]);
  const coinY = useTransform(p, [crew.at, crew.at + 0.16], [-70, 0]);
  const coinOpacity = useTransform(p, [crew.at, crew.at + 0.06], [0, 1]);
  // 떨어지며 한 바퀴 반 돌고 앞면에서 멈춘다.
  const coinSpin = useTransform(p, [crew.at, crew.at + 0.24], [540, 0]);
  const shine = useTransform(coinSpin, (a) => `${(((a % 360) + 360) % 360) / 3.6}% 0`);
  const labelOpacity = useTransform(p, [crew.at + 0.16, crew.at + 0.24], [0, 1]);
  const wrap = crew.coin + 16;

  return (
    <div className="flex flex-col items-center" style={{ transformStyle: "preserve-3d" }}>
      <motion.div
        className="flex shrink-0 items-center justify-center"
        style={{ width: wrap, height: wrap, perspective: 700, y: coinY, opacity: coinOpacity }}
        role="img"
        aria-label={`${crew.name} ${crew.rank}위 뱃지`}
      >
        <motion.div
          className="relative"
          style={{ width: crew.coin, height: crew.coin, transformStyle: "preserve-3d", rotateX: 8, rotateY: coinSpin }}
        >
          {Array.from({ length: 11 }, (_, k) => (
            <div
              key={k}
              className="absolute inset-0 rounded-full"
              style={{ transform: `translateZ(${k - 5}px)`, background: crew.edge }}
            />
          ))}
          <CoinFace crew={crew} shine={shine} />
          <CoinFace crew={crew} shine={shine} back />
        </motion.div>
      </motion.div>
      <motion.div className="flex flex-col items-center" style={{ opacity: labelOpacity }}>
        <span className="flex min-h-[32px] max-w-[112px] items-center truncate px-[4px] text-[13px] font-bold leading-[18px]">
          {crew.name}
        </span>
        <span
          className="mb-[12px] h-[26px] rounded-[9px] px-[10px] text-[12px] font-extrabold leading-[26px]"
          style={{
            background: "rgba(255,255,255,0.06)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
            color: crew.rim,
          }}
        >
          {crew.pts} P
        </span>
      </motion.div>
      <motion.div style={{ scaleY: blockScale, transformOrigin: "50% 100%" }}>
        <PodiumBlock rank={crew.rank} height={crew.block} />
      </motion.div>
    </div>
  );
}

function CoinFace({
  crew,
  shine,
  back = false,
}: {
  crew: (typeof PODIUM)[number];
  shine: MotionValue<string>;
  back?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-full bg-white"
      style={{
        transform: back ? "rotateY(180deg) translateZ(6px)" : "translateZ(6px)",
        backfaceVisibility: "hidden",
        boxShadow: `inset 0 0 0 4px ${crew.rim}`,
      }}
    >
      {crew.logo ? (
        <Image
          src={crew.logo}
          alt=""
          width={240}
          height={240}
          sizes={`${crew.coin}px`}
          className="absolute inset-[4px] h-[calc(100%-8px)] w-[calc(100%-8px)] rounded-full object-cover"
        />
      ) : (
        <span
          className="absolute inset-[4px] flex items-center justify-center rounded-full bg-[#16181b]"
          style={{ ...ARCHIVO, fontSize: crew.coin * 0.4, color: crew.rim }}
        >
          {crew.name.slice(-1)}
        </span>
      )}
      <span
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `inset 0 0 0 4px ${crew.rim}, inset 0 2px 6px rgba(255,255,255,0.5)` }}
      />
      <motion.span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 65%)",
          backgroundSize: "300% 100%",
          backgroundPosition: shine,
        }}
      />
    </div>
  );
}

/** 시상대 블록(앞면 · 윗면 · 옆면). 원본 디자인의 112px 폭 · 64px 깊이. */
function PodiumBlock({ rank, height }: { rank: number; height: number }) {
  return (
    <div className="relative" style={{ width: 112, height, transformStyle: "preserve-3d" }}>
      <div className="absolute left-0 top-0" style={{ width: 64, height, transform: "rotateY(90deg) translateZ(-32px)", background: "#111214" }} />
      <div className="absolute top-0" style={{ left: 48, width: 64, height, transform: "rotateY(90deg) translateZ(32px)", background: "#0c0d0e" }} />
      <div
        className="absolute left-0 top-0"
        style={{ width: 112, height: 64, transform: "rotateX(90deg) translateZ(32px)", background: "linear-gradient(180deg, #505259 0%, #36383d 100%)" }}
      />
      <div
        className="absolute inset-0 flex justify-center pt-[12px]"
        style={{
          transform: "translateZ(32px)",
          background: "linear-gradient(180deg, #2d2f34 0%, #1a1b1e 70%, #141517 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
        }}
      >
        <span
          className="bg-clip-text text-transparent"
          style={{
            ...ARCHIVO,
            fontSize: 44,
            lineHeight: 1,
            backgroundImage:
              rank === 1
                ? "linear-gradient(180deg, #f7f7f8 0%, #cfef68 100%)"
                : rank === 3
                  ? "linear-gradient(180deg, #f7f7f8 0%, #d99a5b 100%)"
                  : "linear-gradient(180deg, #f7f7f8 0%, #8a8d94 100%)",
          }}
        >
          {rank}
        </span>
      </div>
    </div>
  );
}

function BoardRow({ p, crew, at }: { p: MotionValue<number>; crew: BoardCrew; at: number }) {
  const opacity = useTransform(p, [at, at + 0.06], [0, 1]);
  const y = useTransform(p, [at, at + 0.08], [16, 0]);
  return (
    <motion.div
      className="flex h-[64px] items-center gap-[12px] rounded-[16px] bg-[#1b1c1e] pl-[8px] pr-[12px]"
      style={{ opacity, y }}
    >
      <span className="w-[36px] shrink-0 text-center text-[17px] text-[#aeb0b6]/80" style={ARCHIVO}>
        {crew.rank}
      </span>
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#2e2f33] text-[14px] font-bold">
        {crew.name.slice(-1)}
      </span>
      <span className="flex min-w-0 flex-grow flex-col">
        <span className="truncate text-[15px] font-semibold leading-[22px]">{crew.name}</span>
        <span className="text-[12px] leading-[16px] text-[#aeb0b6]/60">
          {crew.region} · 활성 {crew.active}명 · {crew.trend}
        </span>
      </span>
      <span className="shrink-0 text-[17px]" style={ARCHIVO}>
        {crew.pts}
        <span className="text-[12px] font-bold not-italic text-[#aeb0b6]/60" style={{ fontFamily: "inherit" }}>
          {" "}
          P
        </span>
      </span>
    </motion.div>
  );
}

// ── 4. 활동 — 모임 출석과 러닝 기록이 달력에 ─────────────────────
function ActivityStage({ p }: { p: MotionValue<number> }) {
  return (
    <>
      <SceneHead
        id="activity"
        kicker="● 03 · 크루 활동"
        title={
          <>
            모임 출석과 러닝 기록이
            <br />
            <span className={LIME}>달력</span>에 쌓여요
          </>
        }
        sub="이번 달 몇 번 나왔는지, 크루 안에서 내 기여가 얼마인지 한눈에 보여요."
      />
      <StageBody>
        <Phone>
          <Screen src={SCREENS.calendar} alt="크루 활동 — 10월 참여 달력, 모임 출석 4/5번, 크루 내 기여 119 P" />
          <Highlight p={p} at={0.12} box={{ top: 12, left: 3, width: 94, height: 34 }} radius={14} until={0.42} />
          <Highlight p={p} at={0.45} box={{ top: 48, left: 3, width: 46, height: 18 }} radius={12} />
          <Highlight p={p} at={0.6} box={{ top: 48, left: 51, width: 46, height: 18 }} radius={12} />
        </Phone>
      </StageBody>
    </>
  );
}

// ── 5. 운영 — 크루 러닝 기여 알림 → 기여 기록으로 출석 처리 ───────
// 런하우스클럽-앱-관리자 디자인(Push-Crew-Run · Ops-Crew-Runs, 10.17)을 390px 원본 치수 그대로
// HTML 로 옮기고 폰 화면 폭에 맞춰 줄인다. 아직 앱에 나오기 전이라 「디자인 시안」으로 표시한다.
const DESIGN_W = 390;
const DESIGN_H = Math.round((DESIGN_W * IMG_H) / IMG_W);
const OPS_LIME = "#cfef68";

/** 진행도 → 단계: 0 잠금 화면 알림 · 1 목록 · 2~4 한 줄씩 선택 · 5 출석 처리 끝 */
const OPS_AT = [0.36, 0.48, 0.56, 0.64, 0.82];
const opsStage = (v: number) => OPS_AT.filter((t) => v >= t).length;

type CrewRun = { id: string; name: string; start: string; end: string; km: string; pace: string; isNew?: boolean; attended?: string };
const CREW_RUNS: { day: string; rows: CrewRun[] }[] = [
  {
    day: "2026.10.17 (토)",
    rows: [
      { id: "c", name: "[크루원 C]", start: "07:11", end: "07:41", km: "5.03km", pace: `5'58"`, isNew: true },
      { id: "b", name: "[크루원 B]", start: "07:05", end: "07:49", km: "7.90km", pace: `5'34"`, isNew: true },
      { id: "a", name: "[크루원 A]", start: "07:02", end: "07:44", km: "8.12km", pace: `5'10"`, isNew: true },
      { id: "d", name: "[크루원 D]", start: "06:40", end: "07:36", km: "10.21km", pace: `5'29"` },
    ],
  },
  {
    day: "2026.10.16 (금)",
    rows: [
      { id: "e", name: "[크루원 E]", start: "20:10", end: "20:42", km: "5.40km", pace: `5'56"` },
      { id: "a2", name: "[크루원 A]", start: "19:55", end: "20:31", km: "6.00km", pace: `6'00"` },
    ],
  },
  {
    day: "2026.10.14 (화)",
    rows: [
      { id: "f", name: "[크루원 F]", start: "19:04", end: "19:38", km: "5.52km", pace: `6'09"`, attended: "10.14 번개 출석" },
      { id: "c2", name: "[크루원 C]", start: "19:02", end: "19:40", km: "6.10km", pace: `6'14"`, attended: "10.14 번개 출석" },
    ],
  },
];
// 알림으로 들어온 세 기록을 차례로 고른다(위에서부터 C → B → A).
const PICK_ORDER = ["c", "b", "a"];

function OpsStage({ p }: { p: MotionValue<number> }) {
  const [stage, setStage] = useState(() => opsStage(p.get()));
  useMotionValueEvent(p, "change", (v) => setStage(opsStage(v)));
  const listOpacity = useTransform(p, [OPS_AT[0] - 0.06, OPS_AT[0]], [0, 1]);

  return (
    <>
      <SceneHead
        id="ops"
        kicker="● 04 · 크루장 · 운영진"
        title={
          <>
            기여된 러닝으로
            <br />
            <span className={LIME}>출석 처리</span>까지
          </>
        }
        sub="크루원이 러닝을 크루에 기여하면 바로 알림이 와요. 함께 달린 기록을 골라 한 번에 출석을 넣어요."
      />
      <StageBody>
        <Phone caption="디자인 시안 · 곧 나와요">
          <DesignScreen>
            <LockScreen p={p} />
            <motion.div className="absolute inset-0" style={{ opacity: listOpacity }}>
              <CrewRunsScreen stage={stage} />
            </motion.div>
          </DesignScreen>
        </Phone>
      </StageBody>
    </>
  );
}

/** 390px 원본 치수로 그린 화면을 폰 화면 폭(218px)에 맞춰 줄인다. */
function DesignScreen({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute left-0 top-0 origin-top-left overflow-hidden"
      style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${SCREEN_W / DESIGN_W})` }}
    >
      {children}
    </div>
  );
}

function StatusLine() {
  return (
    <div className="flex h-[50px] items-end justify-between px-[30px] pb-[8px] text-[15px] font-semibold text-[#f7f7f8]">
      <span className="tabular-nums">8:05</span>
      <span className="flex items-center gap-[5px]">
        <span className="flex items-end gap-[2px]">
          {[5, 7, 9, 11].map((h) => (
            <span key={h} className="w-[3px] rounded-[1px] bg-[#f7f7f8]" style={{ height: h }} />
          ))}
        </span>
        <span className="ml-[3px] h-[12px] w-[24px] rounded-[4px] border border-[#f7f7f8]/60 p-[2px]">
          <span className="block h-full w-[70%] rounded-[2px] bg-[#f7f7f8]" />
        </span>
      </span>
    </div>
  );
}

const RunnerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M13 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0M5 21l4-6 3 2 2-5 4 3M9 9l4-2 3 3" />
  </svg>
);

const PUSHES = [
  {
    at: 0.06,
    when: "지금",
    body: "[크루원 A]님 외 2명이 오늘 러닝을 크루에 기여했어요.",
    meta: "07:02 시작 8.12km 외 2개 · 눌러서 출석을 처리해 보세요",
    bg: "rgba(40,42,44,0.82)",
  },
  {
    at: 0.16,
    when: "어제 20:43",
    body: "[크루원 E]님이 러닝을 크루에 기여했어요.",
    meta: "20:10 시작 · 5.40km",
    bg: "rgba(40,42,44,0.6)",
  },
];

function LockScreen({ p }: { p: MotionValue<number> }) {
  return (
    <div
      className="absolute inset-0 text-[#f7f7f8]"
      style={{
        backgroundColor: "#16201a",
        backgroundImage: "radial-gradient(120% 60% at 50% 0%, #2b3a22 0%, rgba(43,58,34,0) 70%)",
      }}
    >
      <StatusLine />
      <div className="flex flex-col items-center gap-[4px] pt-[46px]">
        <div className="text-[18px] font-semibold text-[#f7f7f8]/80">10월 17일 토요일</div>
        <div className="text-[76px] font-bold leading-[84px] tabular-nums">08:05</div>
      </div>
      <div className="flex flex-col gap-[8px] px-[12px] pt-[40px]">
        {PUSHES.map((n) => (
          <PushCard key={n.when} p={p} {...n} />
        ))}
      </div>
    </div>
  );
}

function PushCard({
  p,
  at,
  when,
  body,
  meta,
  bg,
}: {
  p: MotionValue<number>;
  at: number;
  when: string;
  body: string;
  meta: string;
  bg: string;
}) {
  const opacity = useTransform(p, [at, at + 0.06], [0, 1]);
  const y = useTransform(p, [at, at + 0.08], [-24, 0]);
  return (
    <motion.div className="flex items-start gap-[12px] rounded-[22px] px-[14px] py-[12px]" style={{ background: bg, opacity, y }}>
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[#171719]" style={{ background: OPS_LIME }}>
        <RunnerIcon />
      </span>
      <span className="flex min-w-0 flex-grow flex-col gap-[2px]">
        <span className="flex justify-between gap-[8px]">
          <span className="text-[14px] font-bold">신림 크루 · 크루 러닝</span>
          <span className="text-[12px] text-[#f7f7f8]/60">{when}</span>
        </span>
        <span className="text-[14px] leading-[20px]">{body}</span>
        <span className="text-[13px] leading-[18px] text-[#f7f7f8]/70">{meta}</span>
      </span>
    </motion.div>
  );
}

function CrewRunsScreen({ stage }: { stage: number }) {
  const picked = PICK_ORDER.slice(0, Math.max(0, Math.min(3, stage - 1)));
  const done = stage >= 5;
  const count = CREW_RUNS.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="absolute inset-0 bg-[#0f0f10] text-[#f7f7f8] tabular-nums">
      <StatusLine />
      <div className="flex h-[56px] items-center gap-[4px] px-[16px]">
        <ChevronLeft className="-ml-[6px] h-[24px] w-[24px]" strokeWidth={1.8} />
        <span className="flex-grow text-[20px] font-bold leading-[28px]">크루 러닝</span>
        <span className="text-[14px] font-bold" style={{ color: OPS_LIME }}>
          출석부
        </span>
      </div>

      <div
        className="mx-[16px] mt-[4px] flex items-start gap-[10px] rounded-[14px] px-[14px] py-[12px] text-[14px] leading-[20px] text-[#e4f5a8]"
        style={{ background: "rgba(207,239,104,0.12)" }}
      >
        <Bell className="mt-[1px] h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
        <span>알림을 받은 러닝 3개를 위에 표시했어요. 함께 달린 기록을 골라 출석을 처리해 보세요.</span>
      </div>

      <div className="mt-[14px] flex gap-[8px] px-[16px]">
        {["오늘", "어제", "최근 7일", "직접 선택"].map((c) => (
          <span
            key={c}
            className="flex h-[40px] items-center rounded-full px-[14px] text-[14px] font-bold"
            style={c === "최근 7일" ? { background: OPS_LIME, color: "#171719" } : { background: "#212225" }}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-[14px] flex justify-between px-[16px] text-[13px] text-[#aeb0b6]/60">
        <span>기여된 러닝 {count}개</span>
        <span>최근순 · 러닝 시작 시각 기준</span>
      </div>

      <div className="mt-[14px] flex flex-col gap-[16px] px-[16px]">
        {CREW_RUNS.map((g) => (
          <div key={g.day} className="flex flex-col gap-[6px]">
            <div className="text-[14px] font-bold text-[#c2c4c8]/90">{g.day}</div>
            <div className="rounded-[16px] bg-[#1b1c1e] px-[14px] py-[2px]">
              {g.rows.map((r, i) => {
                const on = picked.includes(r.id) && !done;
                const attended = r.attended ?? (done && PICK_ORDER.includes(r.id) ? "10.17 정기런 출석" : undefined);
                return (
                  <div
                    key={r.id}
                    className="flex min-h-[60px] items-center gap-[12px] py-[8px] transition-opacity duration-slow ease-apple"
                    style={{
                      boxShadow: i === 0 ? "none" : "inset 0 1px 0 rgba(112,115,124,0.22)",
                      opacity: attended ? 0.5 : 1,
                    }}
                  >
                    <span
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[#171719] transition-colors duration-base ease-apple"
                      style={{
                        background: on ? OPS_LIME : "transparent",
                        boxShadow: `inset 0 0 0 2px ${on ? OPS_LIME : attended ? "rgba(112,115,124,0.3)" : "rgba(112,115,124,0.6)"}`,
                      }}
                    >
                      {on && <Check className="h-[14px] w-[14px]" strokeWidth={3} />}
                    </span>
                    <span className="flex min-w-0 flex-grow flex-col gap-[2px]">
                      <span className="flex items-center gap-[6px]">
                        <span className="text-[15px] font-bold">{r.name}</span>
                        {r.isNew && !attended && (
                          <span
                            className="h-[18px] rounded-[6px] px-[6px] text-[11px] font-bold leading-[18px] text-[#171719]"
                            style={{ background: OPS_LIME }}
                          >
                            새 기록
                          </span>
                        )}
                      </span>
                      <span className="text-[12px] text-[#aeb0b6]/60">
                        {attended ?? `${r.start}–${r.end} · 평균 페이스 ${r.pace}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-[2px]">
                      <span className="text-[16px] font-bold">{r.start}</span>
                      <span className="text-[13px] text-[#c2c4c8]/90">{r.km}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 고른 기록이 있으면 아래에서 출석 처리 버튼이 올라온다 */}
      <div
        className="absolute inset-x-0 bottom-0 flex gap-[8px] bg-[#0f0f10] px-[16px] pb-[34px] pt-[12px] transition-transform duration-slow ease-apple"
        style={{
          boxShadow: "0 -1px 0 rgba(112,115,124,0.22)",
          transform: picked.length > 0 && !done ? "translateY(0)" : "translateY(110%)",
        }}
      >
        <span className="flex h-[52px] items-center rounded-[14px] bg-[#212225] px-[16px] text-[15px] font-bold">선택 해제</span>
        <span
          className="flex h-[52px] flex-grow items-center justify-center rounded-[14px] text-[16px] font-bold text-[#171719]"
          style={{ background: OPS_LIME }}
        >
          {picked.length}개 출석 처리하기
        </span>
      </div>

      <div
        role="status"
        className="absolute inset-x-[20px] bottom-[40px] flex min-h-[52px] items-center gap-[10px] rounded-[14px] bg-[#f7f7f8] px-[16px] py-[12px] text-[14px] font-bold text-[#171719] shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-[opacity,transform] duration-slow ease-apple"
        style={{ opacity: done ? 1 : 0, transform: done ? "translateY(0)" : "translateY(12px)" }}
      >
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#00bf40] text-white">
          <Check className="h-[14px] w-[14px]" strokeWidth={3} />
        </span>
        3명 출석을 처리했어요
      </div>
    </div>
  );
}

// ── 5. 받는 것 ──────────────────────────────────────────────────
const REWARDS = [
  { title: "우리 크루 리그 점수", body: "달린 만큼 크루 순위가 올라가요." },
  { title: "크루 내 기여 포인트", body: "크루 안에서 내 몫이 쌓여요." },
  { title: "시즌 혜택(상품)", body: "혜택은 시즌마다 공개돼요." },
];

function Rewards() {
  const reduce = usePrefersReducedMotion();
  return (
    <section aria-labelledby="rewards-title" className="px-[22px] pt-16">
      <KickerLabel tone="lime" className="text-[10px]">
        ● 런하우스로 뛰면
      </KickerLabel>
      <h2
        id="rewards-title"
        className="mt-2.5 text-[25px] leading-[1.28] font-extrabold tracking-[-0.025em] text-cart-ink break-keep"
      >
        이렇게 받아요
      </h2>
      <ul className="mt-5 flex flex-col gap-2.5">
        {REWARDS.map((r, i) => (
          <motion.li
            key={r.title}
            className="flex items-center gap-3 rounded-[4px] border border-cart-rule bg-cart-paper px-4 py-3.5"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.5, ease: EASE_OUT_APPLE, delay: reduce ? 0 : i * 0.08 }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--lime))]">
              <Check className="h-3.5 w-3.5 text-[hsl(var(--lime-foreground))]" strokeWidth={3} />
            </span>
            <div>
              <div className="text-[14px] font-bold text-cart-ink">{r.title}</div>
              <div className="mt-0.5 text-[12px] text-cart-ink-60">{r.body}</div>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

// ── 6. 설치 — 크루 초대 코드로 시작 ──────────────────────────────
const FAN = [
  { src: SCREENS.runLive, rotate: -9, x: -80 },
  { src: SCREENS.crewFind, rotate: 0, x: 0 },
  { src: SCREENS.crewRank, rotate: 9, x: 80 },
];

function CallToAction() {
  const reduce = usePrefersReducedMotion();
  return (
    <section
      aria-labelledby="cta-title"
      className="px-[22px] pt-16"
      style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 32px)" }}
    >
      <div className="relative mx-auto h-[236px] w-full" aria-hidden>
        {FAN.map((f, i) => (
          <motion.div
            key={f.src}
            className="absolute left-1/2 top-0 -ml-[54px] w-[108px] overflow-hidden rounded-[18px] border-[4px] border-[#1b1c1e] bg-[#0f1012] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)]"
            style={{ zIndex: i === 1 ? 2 : 1 }}
            initial={reduce ? false : { x: 0, rotate: 0, y: 20, opacity: 0 }}
            whileInView={{ x: f.x, rotate: f.rotate, y: i === 1 ? 0 : 10, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: EASE_OUT_APPLE, delay: reduce ? 0 : 0.05 * i }}
          >
            <Image src={f.src} alt="" width={IMG_W} height={IMG_H} sizes="108px" className="w-full" />
          </motion.div>
        ))}
      </div>

      <KickerLabel tone="lime" className="mt-8 text-[10px]">
        ● 크루 찾기 → 초대 코드 입력
      </KickerLabel>
      <h2
        id="cta-title"
        className="mt-3 text-[28px] leading-[1.28] font-black tracking-[-0.03em] text-cart-ink break-keep"
      >
        크루 초대 코드로
        <br />
        <span className={LIME}>시작하기</span>
      </h2>
      <p className="mt-3 text-[14px] leading-[1.7] text-cart-ink-60 break-keep">
        앱을 설치하고 크루 찾기에서 초대 코드를 넣으면 바로 크루원이 돼요. 크루를 직접 만들 수도 있어요.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2.5">
        <StoreButton href={LEAGUE_APP_STORE_URL} platform="아이폰" store="App Store" />
        <StoreButton href={LEAGUE_PLAY_STORE_URL} platform="안드로이드" store="Google Play" />
      </div>
      <a
        href={leagueDeepLink(null)}
        className="mt-2.5 block rounded-[4px] border border-cart-rule py-4 text-center text-[15px] font-semibold text-cart-ink transition-transform duration-fast ease-apple active:scale-[0.98]"
      >
        이미 앱이 있어요 · 앱에서 열기
      </a>

      <div className="mt-8 flex items-center justify-between">
        <Link href="/" className="font-mono text-[10px] tracking-[0.18em] text-cart-ink-60 hover:text-cart-ink">
          ← 런하우스 홈
        </Link>
        <span className="font-mono text-[10px] tracking-[0.18em] text-cart-ink-40">RUNHOUSE LEAGUE</span>
      </div>
    </section>
  );
}
