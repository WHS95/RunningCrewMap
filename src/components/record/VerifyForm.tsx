"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { Upload } from "lucide-react";
import { submitRecordVerification } from "@/app/actions/record";
import { TIER_BY_ID, getTier, toSeconds } from "@/lib/record/tier";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full h-11 px-3.5 rounded-[4px] bg-cart-paper border border-cart-rule text-[14px] text-cart-ink placeholder:text-cart-ink-40 outline-none focus:border-[hsl(var(--lime))]/60 transition-colors duration-fast ease-apple";
const labelClass = "text-[12px] font-semibold text-cart-ink";

// Server Action 본문 한도(next.config bodySizeLimit 4mb) 안에 들어가도록 줄인다.
async function shrinkCertificate(file: File): Promise<File> {
  if (file.size <= 900 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }
  const out = await imageCompression(file, {
    maxSizeMB: 0.9,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  return new File([out], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

function todayKst(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

export function VerifyForm() {
  const router = useRouter();
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [s, setS] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "compressing" | "sending">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const seconds = useMemo(() => {
    if (h === "" || m === "" || s === "") return null;
    return toSeconds(Number(h), Number(m), Number(s));
  }, [h, m, s]);
  const tier = seconds !== null ? getTier(seconds) : null;
  const timeEntered = seconds !== null;

  const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("기록증 이미지를 첨부해 주세요.");
      return;
    }
    if (!tier) {
      setError("풀코스 4:59:59(SUB-5) 이내 기록부터 인증할 수 있어요.");
      return;
    }
    startTransition(async () => {
      try {
        setPhase("compressing");
        const small = await shrinkCertificate(file);
        fd.set("certificate", small);
      } catch {
        setPhase("idle");
        setError("이미지를 읽지 못했어요. JPG · PNG 로 다시 올려 주세요.");
        return;
      }
      setPhase("sending");
      const res = await submitRecordVerification(fd);
      if (!res.success) {
        setPhase("idle");
        setError(res.error);
        return;
      }
      router.push(`/record/r/${res.id}?token=${res.token}&new=1`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-5" noValidate>
      {/* 봇 방지 숨김 필드 */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="runnerName" className={labelClass}>이름 *</label>
          <input id="runnerName" name="runnerName" required maxLength={20} placeholder="실명" className={inputClass} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="crewName" className={labelClass}>소속 크루</label>
          <input id="crewName" name="crewName" maxLength={40} placeholder="선택" className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="runnerInstagram" className={labelClass}>인스타그램</label>
        <input id="runnerInstagram" name="runnerInstagram" maxLength={40} placeholder="@아이디 · 결과 안내 DM 용 (선택)" className={inputClass} autoCapitalize="none" autoCorrect="off" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="raceName" className={labelClass}>대회명 *</label>
        <input id="raceName" name="raceName" required maxLength={60} placeholder="예) 2026 서울마라톤" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="raceDate" className={labelClass}>대회일 *</label>
          <input id="raceDate" name="raceDate" type="date" required max={todayKst()} className={cn(inputClass, "font-mono [color-scheme:dark]")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bibNumber" className={labelClass}>배번 *</label>
          <input id="bibNumber" name="bibNumber" required maxLength={12} placeholder="비공개 보관" className={cn(inputClass, "font-mono")} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="flex w-full justify-between">
          <span className={labelClass}>풀코스 공식 기록 (넷 타임) *</span>
        </legend>
        <div className="grid grid-cols-[1fr_14px_1fr_14px_1fr] items-center gap-1.5 mt-2">
          <input name="h" aria-label="시간" inputMode="numeric" placeholder="H" value={h} onChange={(e) => setH(digits(e.target.value, 1))} className={cn(inputClass, "h-14 text-center font-mono text-[24px] font-bold px-0")} />
          <span className="text-center font-mono text-[22px] text-cart-ink-40">:</span>
          <input name="m" aria-label="분" inputMode="numeric" placeholder="MM" value={m} onChange={(e) => setM(digits(e.target.value, 2))} className={cn(inputClass, "h-14 text-center font-mono text-[24px] font-bold px-0")} />
          <span className="text-center font-mono text-[22px] text-cart-ink-40">:</span>
          <input name="s" aria-label="초" inputMode="numeric" placeholder="SS" value={s} onChange={(e) => setS(digits(e.target.value, 2))} className={cn(inputClass, "h-14 text-center font-mono text-[24px] font-bold px-0")} />
        </div>
      </fieldset>

      <div aria-live="polite">
        {timeEntered && tier && (
          <div className="flex items-center gap-3.5 rounded-[4px] border border-[hsl(var(--lime))]/40 bg-[hsl(var(--lime))]/[0.06] px-4 py-3.5">
            <span
              className={cn(
                "font-mono text-[12px] font-bold px-2 py-1.5 rounded-[2px]",
                tier === "sub3"
                  ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]"
                  : "border border-cart-ink-40 text-cart-ink"
              )}
            >
              {TIER_BY_ID[tier].label}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-bold text-cart-ink">예상 티어 · 구매 자격 충족</span>
              <span className="text-[11px] text-cart-ink-60">관리자 검수 후 확정됩니다</span>
            </span>
          </div>
        )}
        {timeEntered && !tier && (
          <div className="rounded-[4px] border border-cart-rule px-4 py-3.5 flex flex-col gap-1">
            <span className="text-[14px] font-bold text-cart-ink">아직 인증 기준 전이에요</span>
            <span className="text-[12px] leading-relaxed text-cart-ink-60">
              풀코스 4:59:59 이내(SUB-5)부터 인증할 수 있어요. 다음 대회에서 만나요.
            </span>
          </div>
        )}
        {h !== "" && m !== "" && s !== "" && seconds === null && (
          <p className="text-[12px] text-cart-ink-60">분·초는 0~59 사이로 입력해 주세요.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>기록증 이미지 *</span>
        <label
          htmlFor="certificate"
          className="h-16 flex items-center gap-3 px-4 rounded-[4px] border border-dashed border-cart-ink-40 cursor-pointer active:scale-[0.99] transition-transform duration-fast ease-apple"
        >
          <Upload className="w-5 h-5 text-[hsl(var(--lime))]" />
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13px] font-semibold text-cart-ink truncate">{fileName ?? "사진 선택"}</span>
            <span className="text-[11px] text-cart-ink-60">JPG · PNG · WebP · 관리자만 열람</span>
          </span>
        </label>
        <input
          ref={fileRef}
          id="certificate"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </div>

      <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-cart-ink-60 cursor-pointer">
        <input type="checkbox" name="hallPublic" defaultChecked className="mt-0.5 w-[18px] h-[18px] accent-[hsl(var(--lime))]" />
        <span>승인되면 역대 기록장에 공개합니다 (이름은 홍*동처럼 가려지고, 언제든 바꿀 수 있어요)</span>
      </label>

      <p className="text-[11px] leading-relaxed text-cart-ink-40">
        수집 항목: 이름 · 대회 정보 · 기록 · 배번 · 기록증 이미지 · (선택) 크루 · 인스타그램. 기록 인증과 기록장 등재에만 쓰며, 기록증과 배번은 공개하지 않습니다.
      </p>

      {error && (
        <p role="alert" className="text-[13px] text-[#FF9A6B]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (timeEntered && !tier)}
        className="h-14 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[15px] font-bold active:scale-[0.98] transition-transform duration-fast ease-apple disabled:bg-cart-paper disabled:text-cart-ink-40 disabled:border disabled:border-cart-rule"
      >
        {phase === "compressing" ? "이미지 준비 중…" : phase === "sending" ? "신청 보내는 중…" : timeEntered && !tier ? "인증 기준 미달" : "인증 신청하기"}
      </button>
    </form>
  );
}
