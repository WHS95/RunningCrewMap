/**
 * Cartographic Dark — shared design primitives.
 *
 * See DESIGN.md (repo root) for the full system rules. Quick recipe:
 *   <CartographicHeader kicker="DISCOVER · 297 CREWS" title="크루 둘러보기" />
 *   <HairlineRow><span>...</span><MonoMetric value="0.42" unit="km" /></HairlineRow>
 *   <KickerLabel tone="lime">● LIVE</KickerLabel>
 *   <CoordPair lat="37.5547" lng="127.0399" />
 */

import { cn } from "@/lib/utils";
import * as React from "react";

// ── Kicker ──────────────────────────────────────────────────────
// Tiny uppercase mono label, used above display titles or as a section eyebrow.
export function KickerLabel({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "lime" | "muted";
  className?: string;
}) {
  const toneClass =
    tone === "lime"
      ? "text-[hsl(var(--lime))]"
      : tone === "muted"
      ? "text-cart-ink-40"
      : "text-cart-ink-60";
  return (
    <div
      className={cn(
        "font-mono text-[9px] uppercase font-semibold tracking-[0.22em]",
        toneClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Display heading ─────────────────────────────────────────────
export function DisplayHeading({
  children,
  size = "md",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClass =
    size === "xl"
      ? "text-[44px] leading-[0.95]"
      : size === "lg"
      ? "text-[34px] leading-[1.05]"
      : size === "sm"
      ? "text-[20px] leading-[1.1]"
      : "text-[26px] leading-[1]";
  return (
    <h1
      className={cn(
        "font-display font-bold tracking-[-0.025em] text-cart-ink",
        sizeClass,
        className,
      )}
    >
      {children}
    </h1>
  );
}

// ── Cartographic header (kicker + title + optional right action) ─
export function CartographicHeader({
  kicker,
  title,
  size = "md",
  action,
  className,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between px-[22px] pt-[14px] pb-3",
        className,
      )}
    >
      <div>
        {kicker && (
          <KickerLabel tone="lime" className="mb-1.5">
            · {kicker}
          </KickerLabel>
        )}
        <DisplayHeading size={size}>{title}</DisplayHeading>
      </div>
      {action}
    </div>
  );
}

// ── Coordinate pair ─────────────────────────────────────────────
export function CoordPair({
  lat = "37.5547",
  lng = "127.0399",
  className,
}: {
  lat?: string;
  lng?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 font-mono text-[9px] tracking-[0.08em] text-cart-ink-60",
        className,
      )}
    >
      <span>LAT {lat}</span>
      <span>LNG {lng}</span>
    </div>
  );
}

// ── Hairline row ────────────────────────────────────────────────
// Use inside a <div> stack — adds a 1px top border (no border on first child via :first-child reset if needed).
export function HairlineRow({
  children,
  className,
  first = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  first?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 py-3",
        !first && "border-t border-cart-rule",
        onClick && "cursor-pointer active:bg-white/[0.02]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Tag pill ────────────────────────────────────────────────────
// Mono uppercase label with a lime outline (default) or solid lime fill.
export function TagPill({
  children,
  variant = "outline",
  className,
}: {
  children: React.ReactNode;
  variant?: "outline" | "solid" | "ghost";
  className?: string;
}) {
  const variantClass =
    variant === "solid"
      ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
      : variant === "ghost"
      ? "text-cart-ink-60 border-cart-rule"
      : "text-[hsl(var(--lime))] border-[hsl(var(--lime))]/40";
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[8px] font-bold tracking-[0.15em] px-1.5 py-0.5 border rounded-[2px]",
        variantClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Mono metric (right-aligned number + sub-unit) ────────────────
export function MonoMetric({
  value,
  unit,
  tone = "default",
  className,
}: {
  value: React.ReactNode;
  unit?: React.ReactNode;
  tone?: "default" | "lime";
  className?: string;
}) {
  const toneClass =
    tone === "lime" ? "text-[hsl(var(--lime))] font-semibold" : "text-cart-ink";
  return (
    <span
      className={cn(
        "font-mono text-[12px] inline-flex items-baseline gap-0.5",
        toneClass,
        className,
      )}
    >
      <span>{value}</span>
      {unit && (
        <span className="text-cart-ink-60 text-[9px]">{unit}</span>
      )}
    </span>
  );
}

// ── Stat grid (2-3 columns with vertical hairline dividers) ──────
export function StatGrid({
  items,
  className,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid border-y border-cart-rule",
        items.length === 2 && "grid-cols-2",
        items.length === 3 && "grid-cols-3",
        items.length === 4 && "grid-cols-4",
        className,
      )}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "py-3",
            i < items.length - 1 && "border-r border-cart-rule",
            i > 0 && "pl-3",
          )}
        >
          <KickerLabel tone="muted" className="tracking-[0.18em]">
            {item.label}
          </KickerLabel>
          <div className="font-display text-[20px] font-semibold tracking-[-0.02em] text-cart-ink mt-1">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lime CTA button ─────────────────────────────────────────────
export function LimeCTA({
  children,
  hint,
  onClick,
  className,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-5 py-4 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] transition-transform",
        className,
      )}
    >
      <span className="font-display text-[15px] font-bold">{children}</span>
      {hint && (
        <span className="font-mono text-[10px] font-semibold tracking-[0.12em]">
          {hint}
        </span>
      )}
    </button>
  );
}

// ── Ghost icon button (top-bar style: hairline border on near-black) ─
export function GhostIconButton({
  children,
  onClick,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "w-[38px] h-[38px] rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center text-cart-ink active:scale-95 transition-transform",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ── Section title (kicker over a smaller display title, used inside cards) ─
export function SectionTitle({
  kicker,
  title,
  meta,
  className,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between mb-3", className)}>
      <div>
        {kicker && (
          <KickerLabel tone="lime" className="mb-1">
            · {kicker}
          </KickerLabel>
        )}
        <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-cart-ink">
          {title}
        </h2>
      </div>
      {meta && (
        <span className="font-mono text-[9px] tracking-[0.2em] text-cart-ink-40">
          {meta}
        </span>
      )}
    </div>
  );
}

// ── Run House wordmark + CLUB pill ──────────────────────────────
export function RunHouseWordmark({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="font-display text-[18px] font-bold tracking-[0.18em] text-cart-ink">
        RUN&nbsp;HOUSE
      </span>
      <span className="bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] px-2 py-[2px] rounded-[4px] font-display text-[9px] font-extrabold tracking-[0.15em]">
        CLUB
      </span>
    </div>
  );
}
