// src/components/record/RecordShell.tsx
// /record/** 공통 페이지 틀 — 고정 헤더·하단 내비 높이만큼 여백을 둔다.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CSS_VARIABLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function RecordShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full", className)}
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
        paddingBottom: `calc(${CSS_VARIABLES.MOBILE_NAV_PADDING} + 1.5rem)`,
      }}
    >
      {children}
    </div>
  );
}

export function RecordSubHeader({
  title,
  backHref,
  meta,
}: {
  title: string;
  backHref: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 h-14 px-2 border-b border-cart-rule">
      <Link
        href={backHref}
        aria-label="뒤로"
        className="w-11 h-11 flex items-center justify-center text-cart-ink active:scale-95 transition-transform duration-fast ease-apple"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <span className="flex-1 text-[16px] font-semibold text-cart-ink">{title}</span>
      {meta && (
        <span className="pr-3 font-mono text-[9px] tracking-[0.2em] text-cart-ink-40 uppercase">
          {meta}
        </span>
      )}
    </div>
  );
}

/** 티어 배지 — 라임은 최상위 SUB-3 에만 쓴다. */
export function TierBadge({
  label,
  top,
  className,
}: {
  label: string;
  top?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] font-bold tracking-[0.1em] px-2 py-1 rounded-[2px]",
        top
          ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]"
          : "border border-cart-ink-40 text-cart-ink",
        className
      )}
    >
      {label}
    </span>
  );
}
