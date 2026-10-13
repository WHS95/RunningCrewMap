// src/app/record/hall/page.tsx — 역대 기록장 목록 (티어 필터)
import Link from "next/link";
import { KickerLabel } from "@/components/design/cartographic";
import { RecordShell } from "@/components/record/RecordShell";
import { HallRow } from "@/components/record/HallRow";
import { getHallEntries } from "@/lib/server/records";
import { TIERS, isRecordTier } from "@/lib/record/tier";
import { cn } from "@/lib/utils";

export default async function RecordHallPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  const active = isRecordTier(tier) ? tier : null;
  const all = await getHallEntries();
  const rows = active ? all.filter((e) => e.tier === active) : all;

  const filters = [
    { id: null, label: "전체" },
    ...TIERS.map((t) => ({ id: t.id, label: t.label })),
  ];

  return (
    <RecordShell>
      <div className="px-[22px] pt-[22px]">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <KickerLabel tone="lime" className="text-[10px]">
              · RECORDS · {String(rows.length).padStart(3, "0")}
            </KickerLabel>
            <h1 className="text-[30px] font-black tracking-[-0.02em] text-cart-ink">역대 기록장</h1>
          </div>
          <Link
            href="/record/verify"
            className="h-9 inline-flex items-center px-3 rounded-[2px] border border-cart-rule text-[12px] text-cart-ink active:scale-95 transition-transform duration-fast ease-apple"
          >
            기록 인증
          </Link>
        </div>
        <nav aria-label="티어 필터" className="flex flex-wrap gap-1.5 mt-4">
          {filters.map((f) => {
            const on = f.id === active;
            return (
              <Link
                key={f.label}
                href={f.id ? `/record/hall?tier=${f.id}` : "/record/hall"}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "h-[34px] px-[11px] inline-flex items-center rounded-[2px] border font-mono text-[11px] tracking-[0.06em] transition-colors duration-fast ease-apple",
                  on
                    ? "bg-cart-ink text-background border-cart-ink"
                    : "border-cart-rule text-cart-ink-60 hover:text-cart-ink"
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex justify-between mt-5 pb-2.5 border-b border-cart-rule">
          <KickerLabel tone="muted">NO · RUNNER · RACE</KickerLabel>
          <KickerLabel tone="muted">NET TIME</KickerLabel>
        </div>

        {rows.length > 0 ? (
          rows.map((e, i) => <HallRow key={e.id} entry={e} rank={i + 1} />)
        ) : (
          <div className="py-10 text-center text-[13px] text-cart-ink-60 leading-relaxed">
            아직 이 티어에 새겨진 기록이 없어요.
            <br />
            <Link href="/record/verify" className="text-[hsl(var(--lime))]">
              내 기록 인증하기 →
            </Link>
          </div>
        )}

        <p className="mt-6 text-[11px] leading-relaxed text-cart-ink-40">
          공개에 동의한 인증 기록만 보여요. 이름은 기본으로 가려지고, ENGRAVED 는 각인 액세서리를 주문한 기록입니다.
        </p>
      </div>
    </RecordShell>
  );
}
