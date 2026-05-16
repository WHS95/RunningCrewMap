"use client";

/**
 * /admin/events — promo banner CRUD.
 *
 * Each banner is a card with inline edit fields. Active/inactive toggles
 * via a Switch, reorder via up/down arrows, delete with confirmation,
 * and a "신규 추가" button appends a fresh banner row at the bottom.
 *
 * All mutations go through the server actions in @/app/actions/banner
 * which call revalidatePath("/home") so the public carousel reflects
 * changes immediately.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  createBanner,
  deleteBanner,
  reorderBanner,
  updateBanner,
  type PromoBannerRow,
} from "@/app/actions/banner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialBanners: PromoBannerRow[];
  /** True when the promo_banners table doesn't exist (migration unrun). */
  migrationMissing?: boolean;
  /** Raw Supabase error message if the initial fetch failed. */
  errorMessage?: string | null;
}

// Local row state — mirrors PromoBannerRow but tracks pending edits + a
// `dirty` flag so we only write to the server when something actually changed.
interface DraftRow extends PromoBannerRow {
  dirty: boolean;
  saving: boolean;
}

const VARIANT_OPTIONS = [
  { value: "", label: "이미지 (기본)" },
  { value: "cap", label: "Cap · lime 카드" },
  { value: "flag", label: "Flag · paper 카드" },
] as const;

export function EventsAdminClient({
  initialBanners,
  migrationMissing = false,
  errorMessage = null,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<DraftRow[]>(
    initialBanners.map((b) => ({ ...b, dirty: false, saving: false }))
  );
  const [, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const patch = (id: string, updates: Partial<PromoBannerRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, dirty: true } : r))
    );
  };

  const save = async (row: DraftRow) => {
    if (!row.dirty || row.saving) return;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, saving: true } : r))
    );
    const res = await updateBanner(row.id, {
      title: row.title,
      description: row.description,
      link: row.link,
      image_url: row.image_url,
      variant: row.variant,
      code: row.code,
      cta: row.cta,
      is_active: row.is_active,
      display_order: row.display_order,
    });
    if (res.success) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, dirty: false, saving: false } : r
        )
      );
      toast.success("저장되었습니다");
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, saving: false } : r))
      );
      toast.error(`저장 실패: ${res.error || "알 수 없음"}`);
    }
  };

  const toggleActive = async (row: DraftRow, next: boolean) => {
    patch(row.id, { is_active: next });
    const res = await updateBanner(row.id, { is_active: next });
    if (res.success) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, is_active: next, dirty: false }
            : r
        )
      );
      toast.success(next ? "노출되었습니다" : "숨김 처리되었습니다");
    } else {
      toast.error(`상태 변경 실패: ${res.error || "알 수 없음"}`);
    }
  };

  const move = async (id: string, direction: "up" | "down") => {
    const res = await reorderBanner(id, direction);
    if (res.success) {
      startTransition(() => router.refresh());
    } else {
      toast.error(`순서 변경 실패: ${res.error || "알 수 없음"}`);
    }
  };

  const remove = async (id: string) => {
    const res = await deleteBanner(id);
    if (res.success) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("삭제되었습니다");
    } else {
      toast.error(`삭제 실패: ${res.error || "알 수 없음"}`);
    }
    setPendingDelete(null);
  };

  const addNew = async () => {
    setIsCreating(true);
    const order =
      rows.length > 0
        ? Math.max(...rows.map((r) => r.display_order)) + 1
        : 0;
    const res = await createBanner({
      title: "새 이벤트",
      link: "/",
      variant: "cap",
      code: "",
      cta: "더보기 →",
      is_active: false,
      display_order: order,
    });
    setIsCreating(false);
    if (res.success) {
      startTransition(() => router.refresh());
      toast.success("새 배너가 추가되었습니다");
    } else {
      toast.error(`추가 실패: ${res.error || "알 수 없음"}`);
    }
  };

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <main className='min-h-screen bg-background pb-24'>
      {/* Top bar */}
      <div className='flex items-center justify-between px-[22px] pt-6'>
        <button
          type='button'
          onClick={() => router.push("/admin")}
          className='w-9 h-9 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center text-cart-ink active:scale-95 transition-transform'
          aria-label='관리자 대시보드로'
        >
          <ArrowLeft className='w-4 h-4' />
        </button>
        <KickerLabel tone='lime' className='tracking-[0.22em]'>
          LIVE · {activeCount.toString().padStart(2, "0")} /{" "}
          {rows.length.toString().padStart(2, "0")}
        </KickerLabel>
      </div>

      <CartographicHeader
        kicker={`ADMIN · EVENTS · /HOME CAROUSEL`}
        title='이벤트 관리'
      />

      {/* Migration / error banner — shows a clear next-step when the
          promo_banners table doesn't exist yet. Without this, the page
          looked silently empty and the dev only saw a `{}` in console. */}
      {(migrationMissing || errorMessage) && (
        <div className='mx-[22px] mb-4 rounded-[4px] border border-amber-400/50 bg-amber-500/10 p-4'>
          <KickerLabel tone='lime' className='tracking-[0.22em] mb-1.5'>
            ● {migrationMissing ? "MIGRATION REQUIRED" : "DB ERROR"}
          </KickerLabel>
          <h2 className='font-display text-[16px] font-bold text-cart-ink mb-1.5'>
            {migrationMissing
              ? "promo_banners 테이블이 아직 없습니다"
              : "DB 조회 실패"}
          </h2>
          {migrationMissing ? (
            <>
              <p className='text-[12px] text-cart-ink-60 leading-relaxed mb-2'>
                Supabase SQL editor에서 아래 마이그레이션 파일을 한 번 실행해주세요:
              </p>
              <code className='block px-2 py-1.5 rounded-[2px] bg-background border border-cart-rule font-mono text-[11px] text-[hsl(var(--lime))]'>
                migrations/2026-05-16-add-promo-banners.sql
              </code>
              <p className='text-[11px] text-cart-ink-60 leading-relaxed mt-2'>
                실행 후 이 페이지를 새로고침하면 시드된 두 배너가 보이고
                추가 · 수정 · 삭제가 가능해집니다.
              </p>
            </>
          ) : (
            <p className='text-[12px] text-cart-ink-60 leading-relaxed font-mono'>
              {errorMessage}
            </p>
          )}
        </div>
      )}

      <section className='px-[22px] space-y-4'>
        {rows.length === 0 ? (
          <div className='py-16 text-center'>
            <KickerLabel tone='muted' className='tracking-[0.22em]'>
              · NO BANNERS YET ·
            </KickerLabel>
            <p className='text-[12px] text-cart-ink-60 mt-2'>
              아래 버튼으로 신규 이벤트를 추가하세요.
            </p>
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row.id}
              className={cn(
                "rounded-[4px] border bg-cart-paper p-4 space-y-3",
                row.is_active ? "border-cart-rule" : "border-cart-rule opacity-70"
              )}
            >
              {/* Card header — order ord + status badge + active toggle */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-[11px] tracking-[0.05em] text-cart-ink-60 tabular-nums'>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <KickerLabel
                    tone={row.is_active ? "lime" : "muted"}
                    className='tracking-[0.2em]'
                  >
                    {row.is_active ? "● LIVE" : "○ HIDDEN"}
                  </KickerLabel>
                </div>
                <div className='flex items-center gap-1.5'>
                  <button
                    type='button'
                    onClick={() => move(row.id, "up")}
                    disabled={idx === 0}
                    className='w-7 h-7 rounded-[4px] border border-cart-rule bg-background flex items-center justify-center text-cart-ink-60 hover:text-cart-ink active:scale-95 transition-all disabled:opacity-30'
                    title='위로 이동'
                  >
                    <ChevronUp className='w-3.5 h-3.5' />
                  </button>
                  <button
                    type='button'
                    onClick={() => move(row.id, "down")}
                    disabled={idx === rows.length - 1}
                    className='w-7 h-7 rounded-[4px] border border-cart-rule bg-background flex items-center justify-center text-cart-ink-60 hover:text-cart-ink active:scale-95 transition-all disabled:opacity-30'
                    title='아래로 이동'
                  >
                    <ChevronDown className='w-3.5 h-3.5' />
                  </button>
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(v) => toggleActive(row, v)}
                  />
                </div>
              </div>

              {/* Title */}
              <Field label='제목' required>
                <input
                  type='text'
                  value={row.title}
                  onChange={(e) => patch(row.id, { title: e.target.value })}
                  className={INPUT_CLS}
                  placeholder='러닝 모자 제작 오픈'
                />
              </Field>

              {/* Variant */}
              <Field label='디자인 유형'>
                <select
                  value={row.variant ?? ""}
                  onChange={(e) =>
                    patch(row.id, {
                      variant:
                        e.target.value === ""
                          ? null
                          : (e.target.value as "cap" | "flag"),
                    })
                  }
                  className={INPUT_CLS + " appearance-none"}
                >
                  {VARIANT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Description */}
              <Field label='설명' helper='카드의 작은 문구 (선택)'>
                <input
                  type='text'
                  value={row.description ?? ""}
                  onChange={(e) =>
                    patch(row.id, { description: e.target.value || null })
                  }
                  className={INPUT_CLS}
                  placeholder='등록 크루 한정 특가'
                />
              </Field>

              {/* Link */}
              <Field label='링크 URL' required>
                <input
                  type='text'
                  value={row.link}
                  onChange={(e) => patch(row.id, { link: e.target.value })}
                  className={INPUT_CLS}
                  placeholder='/notice/event/3'
                />
              </Field>

              {/* Code (kicker) */}
              <div className='grid grid-cols-2 gap-2'>
                <Field label='키커 코드' helper='우측 상단 mono'>
                  <input
                    type='text'
                    value={row.code ?? ""}
                    onChange={(e) =>
                      patch(row.id, { code: e.target.value || null })
                    }
                    className={INPUT_CLS}
                    placeholder='0312'
                  />
                </Field>
                <Field label='CTA 라벨'>
                  <input
                    type='text'
                    value={row.cta ?? ""}
                    onChange={(e) =>
                      patch(row.id, { cta: e.target.value || null })
                    }
                    className={INPUT_CLS}
                    placeholder='RUNHOUSE →'
                  />
                </Field>
              </div>

              {/* Image URL — only for fallback variant */}
              {row.variant === null && (
                <Field
                  label='이미지 URL'
                  helper='디자인 유형이 "이미지"일 때만 사용'
                >
                  <input
                    type='text'
                    value={row.image_url ?? ""}
                    onChange={(e) =>
                      patch(row.id, { image_url: e.target.value || null })
                    }
                    className={INPUT_CLS}
                    placeholder='/runhousecapThumnail.png'
                  />
                </Field>
              )}

              {/* Footer actions */}
              <div className='flex items-center gap-2 pt-2 border-t border-cart-rule'>
                <button
                  type='button'
                  onClick={() => save(row)}
                  disabled={!row.dirty || row.saving}
                  className='flex-1 h-9 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-mono text-[11px] tracking-[0.18em] uppercase font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-30'
                >
                  {row.saving ? (
                    <>
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      SAVING…
                    </>
                  ) : (
                    <>
                      <Save className='w-3.5 h-3.5' />
                      {row.dirty ? "저장" : "저장됨"}
                    </>
                  )}
                </button>
                <button
                  type='button'
                  onClick={() =>
                    pendingDelete === row.id
                      ? remove(row.id)
                      : setPendingDelete(row.id)
                  }
                  className={cn(
                    "h-9 px-3 rounded-[4px] border bg-background flex items-center gap-1.5 active:scale-95 transition-all",
                    pendingDelete === row.id
                      ? "border-red-500 bg-red-500/10 text-red-300 font-mono text-[10px] tracking-[0.18em] uppercase font-semibold"
                      : "border-red-500/40 text-red-400 hover:bg-red-500/10"
                  )}
                  onBlur={() => setPendingDelete(null)}
                >
                  <Trash2 className='w-3.5 h-3.5' />
                  {pendingDelete === row.id && (
                    <span>확실 · CONFIRM</span>
                  )}
                </button>
              </div>
            </div>
          ))
        )}

        {/* Add new — disabled when the table doesn't exist, since the
            insert would just fail with the same 42P01 error. */}
        <button
          type='button'
          onClick={addNew}
          disabled={isCreating || migrationMissing}
          className='w-full py-3 rounded-[4px] border border-dashed border-cart-rule bg-transparent text-cart-ink-60 hover:text-[hsl(var(--lime))] hover:border-[hsl(var(--lime))]/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed'
          title={
            migrationMissing
              ? "promo_banners 테이블 마이그레이션을 먼저 실행해주세요"
              : undefined
          }
        >
          {isCreating ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <Plus className='w-4 h-4' />
          )}
          <span className='font-mono text-[11px] tracking-[0.18em] uppercase font-semibold'>
            신규 배너 추가 · NEW BANNER
          </span>
        </button>
      </section>
    </main>
  );
}

const INPUT_CLS =
  "w-full px-3 py-2 rounded-[4px] border border-cart-rule bg-background text-cart-ink text-[13px] placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50";

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-1'>
      <label className='text-[11px] font-semibold text-cart-ink tracking-[-0.005em] flex items-center justify-between'>
        <span>
          {label}
          {required && (
            <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
          )}
        </span>
        {helper && (
          <span className='text-[10px] font-normal text-cart-ink-40'>
            {helper}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
