"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X, ChevronLeft, Search, Loader2, Upload } from "lucide-react";
import {
  STORE_CATEGORIES,
  STORE_CATEGORY_LABELS,
  type StoreCategory,
} from "@/lib/types/store";
import { storeService } from "@/lib/services/store.service";
import { notifyStoreRegistration } from "@/app/actions/store";
import { StorePhotosUpload, type StorePhotoSlot } from "./StorePhotosUpload";
import CrewLocationPickerMap from "@/components/map/CrewLocationPickerMap";
import { LogoCropDialog } from "@/components/dialog/LogoCropDialog";
import { KickerLabel } from "@/components/design/cartographic";

const Schema = z
  .object({
    name: z.string().min(1, "이름을 입력해 주세요").max(100, "100자 이내"),
    category: z.enum(STORE_CATEGORIES),
    main_address: z
      .string()
      .min(2, "주소를 정확히 입력해 주세요")
      .max(200, "200자 이내"),
    detail_address: z.string().max(200).optional(),
    description: z
      .string()
      .min(1, "매장 소개를 입력해 주세요")
      .max(500, "500자 이내"),
    verification_method: z.string().min(1, "인증 방식을 입력해 주세요"),
    reward_description: z.string().min(1, "혜택을 입력해 주세요"),
    owner_message: z.string().optional(),
    business_hours: z.string().optional(),
    contact: z.string().optional(),
    instagram: z.string().optional(),
    naver_map_url: z.string().url("올바른 URL을 입력해 주세요").optional().or(z.literal("")),
    event_post_url: z.string().url("올바른 URL을 입력해 주세요").optional().or(z.literal("")),
    pin: z.string().regex(/^\d{4}$/, "숫자 4자리"),
  })
  .refine((v) => !!v.contact || !!v.instagram, {
    message: "연락처 또는 인스타그램 중 하나는 필수입니다.",
    path: ["contact"],
  });

type FormValues = z.infer<typeof Schema>;
type FormField = keyof FormValues;

interface StepDef {
  title: string;
  hint?: string;
  fields: FormField[];
  validateExtra?: (s: { mainImage: File | null }) => string | null;
}

const STEPS: StepDef[] = [
  {
    title: "매장 기본 정보",
    hint: "매장명과 분류부터 시작해요.",
    fields: ["name", "category"],
  },
  {
    title: "매장 주소",
    hint: "지도 검색이 가능한 도로명/지번 주소를 입력해 주세요. 좌표는 자동으로 변환됩니다.",
    fields: ["main_address", "detail_address"],
  },
  {
    title: "대표 사진",
    hint: "리스트와 지도 핀에 표시되는 사진입니다.",
    fields: [],
    validateExtra: (s) =>
      s.mainImage ? null : "대표 사진을 한 장 선택해 주세요.",
  },
  {
    title: "매장 소개",
    hint: "러너에게 어떤 매장인지 알려 주세요.",
    fields: ["description", "owner_message"],
  },
  {
    title: "러닝 인증 · 혜택",
    hint: "인증 방식과 받을 수 있는 혜택을 적어 주세요.",
    fields: ["verification_method", "reward_description"],
  },
  {
    title: "운영 · 연락처",
    hint: "연락처와 인스타그램 중 하나는 꼭 입력해 주세요.",
    fields: ["business_hours", "contact", "instagram"],
  },
  {
    title: "외부 링크 · 추가 사진",
    hint: "선택 사항이에요. 비워 두고 넘어가도 됩니다.",
    fields: ["naver_map_url", "event_post_url"],
  },
  {
    title: "수정용 PIN",
    hint: "추후 매장 정보 수정 시 사용해요. 잊지 않게 적어 두세요.",
    fields: ["pin"],
  },
];

const TOTAL = STEPS.length;

export function StoreRegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [photos, setPhotos] = useState<StorePhotoSlot[]>([]);
  // 로고 (선택) — 크롭 후 1:1 정사각 JPEG File을 state에 보관 + object-URL 미리보기.
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // 사용자가 방금 고른 raw 파일. 크롭 다이얼로그가 열려 있는 동안 대기.
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [extraErr, setExtraErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [topErr, setTopErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: "onChange",
    defaultValues: { category: "cafe" },
  });

  // Coordinates locked in from the map picker. main_address is the source
  // of truth in form state; coords are committed when the user moves the pin
  // (drag/tap) or jumps via the search box.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  useEffect(() => {
    if (!mainImage) {
      setMainImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(mainImage);
    setMainImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mainImage]);

  // 로고 미리보기 object-URL — mainImage 패턴과 동일. logo가 바뀌면 재생성.
  useEffect(() => {
    if (!logo) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  // 파일 변경 핸들러 — 선택 즉시 저장하지 않고 크롭 다이얼로그로 넘김.
  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 onChange가 재발생하도록 input 값 초기화.
    if (e.target) e.target.value = "";
    if (file) setPendingLogoFile(file);
  }

  // 크롭 확정 — 잘린 1:1 정사각 JPEG File을 logo state로 교체.
  function handleLogoCropConfirm(cropped: File) {
    setLogo(cropped);
    setPendingLogoFile(null);
  }

  function handleClearLogo() {
    setLogo(null);
  }

  const current = STEPS[step];

  async function onNext() {
    setExtraErr(null);
    const extra = current.validateExtra?.({ mainImage });
    if (extra) {
      setExtraErr(extra);
      return;
    }
    if (current.fields.length > 0) {
      const ok = await trigger(current.fields);
      if (!ok) return;
    }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  }

  function onBack() {
    setExtraErr(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(address)}`, {
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = await res.json();
      const first = data?.addresses?.[0];
      if (!first) return null;
      const lat = parseFloat(first.y);
      const lng = parseFloat(first.x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch {
      return null;
    }
  }

  async function onSubmit(values: FormValues) {
    setTopErr(null);
    if (!mainImage) {
      setTopErr("대표 사진은 필수입니다.");
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      // Prefer coords committed by the map picker. If the user typed the
      // address without ever moving the pin, try the geocode API as a fallback.
      let lat = coords?.lat ?? 0;
      let lng = coords?.lng ?? 0;
      if (!coords) {
        const fallback = await geocode(values.main_address);
        if (fallback) {
          lat = fallback.lat;
          lng = fallback.lng;
        }
      }
      if (!lat || !lng) {
        setTopErr("매장 위치를 지도에서 지정해 주세요.");
        setStep(1);
        setSubmitting(false);
        return;
      }
      const { id } = await storeService.createStore({
        name: values.name,
        category: values.category as StoreCategory,
        description: values.description,
        verification_method: values.verification_method,
        reward_description: values.reward_description,
        owner_message: values.owner_message,
        business_hours: values.business_hours,
        contact: values.contact,
        instagram: values.instagram,
        naver_map_url: values.naver_map_url || undefined,
        event_post_url: values.event_post_url || undefined,
        location: {
          main_address: values.main_address,
          detail_address: values.detail_address,
          latitude: lat,
          longitude: lng,
        },
        main_image: mainImage,
        logo: logo ?? undefined, // 선택 — 없으면 지도 마커는 카테고리 색 글자 원으로 fallback
        photos: photos.filter((p) => p.file).map((p) => p.file as File),
        pin: values.pin,
      });
      await notifyStoreRegistration(
        {
          id,
          name: values.name,
          category: values.category,
          mainAddress: values.main_address,
          lat,
          lng,
          description: values.description,
          instagram: values.instagram,
        },
        { pin: values.pin }
      );
      router.push(`/store/${id}?registered=1`);
    } catch (e) {
      setTopErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = step === TOTAL - 1;
  const progressPct = useMemo(() => ((step + 1) / TOTAL) * 100, [step]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] tracking-[0.18em] text-cart-ink-60">
          <span>
            STEP {step + 1} / {TOTAL}
          </span>
          <span>{current.title}</span>
        </div>
        <div className="h-[3px] w-full rounded-full bg-cart-rule/40 overflow-hidden">
          <div
            className="h-full bg-[hsl(var(--lime))] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* step body */}
      <div className="space-y-4 min-h-[280px]">
        {current.hint && (
          <p className="text-[12px] text-cart-ink-60">{current.hint}</p>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <ValidatedField
              name="name"
              label="매장 이름"
              control={control}
              errors={errors}
              required
            >
              <input
                type="text"
                {...register("name")}
                placeholder="예: 바틀링커피"
                autoFocus
                className={inputCls}
              />
            </ValidatedField>
            <ValidatedField
              name="category"
              label="분류"
              control={control}
              errors={errors}
              required
            >
              <select {...register("category")} className={inputCls}>
                {STORE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {STORE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </ValidatedField>
          </div>
        )}

        {step === 1 && (
          <AddressStep
            control={control}
            register={register}
            errors={errors}
            initialCoords={coords}
            onCommit={(loc) => {
              setCoords({ lat: loc.lat, lng: loc.lng });
              setValue("main_address", loc.main_address, {
                shouldValidate: true,
                shouldDirty: true,
              });
              if (loc.detail_address !== undefined) {
                setValue("detail_address", loc.detail_address, {
                  shouldDirty: true,
                });
              }
            }}
          />
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
                  대표 사진 *
                </label>
                {mainImage && (
                  <Check
                    className="w-3.5 h-3.5 text-[hsl(var(--lime))]"
                    strokeWidth={2}
                  />
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setExtraErr(null);
                  setMainImage(e.target.files?.[0] ?? null);
                }}
                className="text-sm"
              />
              {extraErr && (
                <p className="text-[11px] text-red-500">{extraErr}</p>
              )}
            </div>
            {mainImagePreview && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-cart-rule">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImagePreview}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <ValidatedField
              name="description"
              label="매장 소개 (≤500자)"
              control={control}
              errors={errors}
              required
            >
              <textarea
                {...register("description")}
                rows={5}
                placeholder="러너들이 어떤 분위기를 만나게 될까요?"
                autoFocus
                className={inputCls}
              />
            </ValidatedField>
            <ValidatedField
              name="owner_message"
              label="사장님 한 말씀 (선택)"
              control={control}
              errors={errors}
            >
              <textarea
                {...register("owner_message")}
                rows={3}
                placeholder="러너에게 하고 싶은 인사말이 있다면…"
                className={inputCls}
              />
            </ValidatedField>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <ValidatedField
              name="verification_method"
              label="러닝 인증 방식"
              control={control}
              errors={errors}
              required
            >
              <textarea
                {...register("verification_method")}
                rows={3}
                placeholder="예: 가민/애플워치 기록 보여주기, 러닝 복장 착용 등"
                autoFocus
                className={inputCls}
              />
            </ValidatedField>
            <ValidatedField
              name="reward_description"
              label="제공 혜택"
              control={control}
              errors={errors}
              required
            >
              <textarea
                {...register("reward_description")}
                rows={3}
                placeholder="예: 아메리카노 10% 할인, 사이드 메뉴 무료 제공"
                className={inputCls}
              />
            </ValidatedField>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <BusinessHoursField
              onChange={(composed) =>
                setValue("business_hours", composed, { shouldDirty: true })
              }
            />
            <ValidatedField
              name="contact"
              label="연락처"
              control={control}
              errors={errors}
              hint="연락처 또는 인스타그램 중 하나는 필수"
            >
              <input
                type="tel"
                {...register("contact")}
                placeholder="예: 02-1234-5678"
                className={inputCls}
              />
            </ValidatedField>
            <ValidatedField
              name="instagram"
              label="인스타그램"
              control={control}
              errors={errors}
            >
              <input
                type="text"
                {...register("instagram")}
                placeholder="@username"
                className={inputCls}
              />
            </ValidatedField>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <ValidatedField
              name="naver_map_url"
              label="네이버 지도 URL (선택)"
              control={control}
              errors={errors}
            >
              <input
                type="url"
                {...register("naver_map_url")}
                placeholder="https://map.naver.com/..."
                className={inputCls}
              />
            </ValidatedField>
            <ValidatedField
              name="event_post_url"
              label="이벤트 글 URL (선택)"
              control={control}
              errors={errors}
            >
              <input
                type="url"
                {...register("event_post_url")}
                placeholder="https://instagram.com/p/..."
                className={inputCls}
              />
            </ValidatedField>
            {/* 로고 (선택) — 업로드 후 1:1 라운드 크롭 + 지도 핀 미리보기 */}
            <div className="space-y-1.5">
              <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
                로고 (선택)
              </label>
              <KickerLabel tone="muted" className="tracking-[0.18em]">
                · 지도 핀의 원형 영역과 동일하게 잘립니다 · 1:1 SQUARE
              </KickerLabel>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-4 pt-1">
                {/* 원형 미리보기 — 지도 핀의 로고 영역과 동일하게 보여줌 */}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full border border-cart-rule bg-cart-paper flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
                  aria-label="로고 업로드"
                >
                  {logoPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={logoPreview}
                      alt="지도 핀 미리보기"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload className="w-5 h-5 text-[hsl(var(--lime))]" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <KickerLabel tone="muted" className="tracking-[0.18em]">
                    지도 핀 미리보기
                  </KickerLabel>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform"
                    >
                      {logo ? "다시 선택" : "파일 선택"}
                    </button>
                    {logo && (
                      <button
                        type="button"
                        onClick={handleClearLogo}
                        className="px-3 py-1.5 rounded-[4px] border border-cart-rule text-cart-ink-60 font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform"
                      >
                        제거
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-cart-ink-60 mt-1.5">
                    로고가 없으면 지도 핀에 카테고리 색 글자 원이 표시돼요.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
                추가 사진 (선택, 최대 6장)
              </label>
              <StorePhotosUpload onChange={setPhotos} />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <ValidatedField
              name="pin"
              label="PIN 4자리"
              control={control}
              errors={errors}
              required
              hint="추후 매장 정보를 수정할 때 사용해요."
            >
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                {...register("pin")}
                placeholder="••••"
                autoFocus
                className={`${inputCls} tracking-[0.4em] text-center text-lg`}
              />
            </ValidatedField>
          </div>
        )}
      </div>

      {/* 로고 크롭 다이얼로그 — 파일 선택 시 열리고, 확정하면 logo state로 반영 */}
      <LogoCropDialog
        file={pendingLogoFile}
        onCancel={() => setPendingLogoFile(null)}
        onConfirm={handleLogoCropConfirm}
      />

      {topErr && (
        <p className="text-[12px] text-red-500 border border-red-500/30 rounded-md p-2">
          {topErr}
        </p>
      )}

      {/* nav */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0 || submitting}
          className="flex items-center gap-1 px-3 py-2 text-[12px] tracking-[0.18em] text-cart-ink-60 border border-cart-rule rounded-md disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          BACK
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-md bg-[hsl(var(--lime))] py-2.5 text-[13px] font-semibold text-[hsl(var(--lime-foreground))] disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "매장 등록 신청"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={submitting}
            className="flex-1 rounded-md bg-[hsl(var(--lime))] py-2.5 text-[13px] font-semibold text-[hsl(var(--lime-foreground))] disabled:opacity-50"
          >
            다음
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-cart-rule bg-transparent px-3 py-2 text-sm text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-cart-ink";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface AddressStepProps {
  control: Control<FormValues>;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  errors: FieldErrors<FormValues>;
  initialCoords: { lat: number; lng: number } | null;
  onCommit: (loc: {
    lat: number;
    lng: number;
    main_address: string;
    detail_address?: string;
  }) => void;
}

function AddressStep({
  control,
  register,
  errors,
  initialCoords,
  onCommit,
}: AddressStepProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [pin, setPin] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(
    initialCoords
      ? { lat: initialCoords.lat, lng: initialCoords.lng }
      : null
  );

  async function onSearch() {
    if (!query.trim()) return;
    setSearchErr(null);
    setSearching(true);
    try {
      const res = await fetch(
        `/api/geocode?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        setSearchErr(
          "정확한 주소가 아니면 검색이 안 돼요. 지도를 이동해 핀을 직접 찍어주세요."
        );
        return;
      }
      const data = await res.json();
      const first = data?.addresses?.[0];
      if (!first) {
        setSearchErr(
          "검색 결과가 없어요. 지도에서 직접 핀을 찍어 위치를 지정해주세요."
        );
        return;
      }
      const lat = parseFloat(first.y);
      const lng = parseFloat(first.x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSearchErr("좌표를 가져오지 못했어요. 지도에서 직접 지정해주세요.");
        return;
      }
      const addr = first.roadAddress || first.jibunAddress || query;
      setPin({ lat, lng, address: addr });
      onCommit({ lat, lng, main_address: addr });
    } catch {
      setSearchErr("네트워크 오류로 검색에 실패했어요.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
          주소 / 키워드로 검색
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
              }
            }}
            placeholder="예: 강남구 테헤란로 123"
            className={inputCls}
            autoFocus
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={searching || !query.trim()}
            className="px-3 rounded-md border border-cart-rule text-[12px] tracking-[0.18em] text-cart-ink-60 disabled:opacity-40 flex items-center gap-1.5"
          >
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            검색
          </button>
        </div>
        <p className="text-[11px] text-cart-ink-40">
          도로명/지번이 정확하면 자동으로 핀이 이동해요. 검색이 안되면 아래
          지도에서 직접 핀을 찍거나 드래그해 위치를 지정할 수 있어요.
        </p>
        {searchErr && <p className="text-[11px] text-red-500">{searchErr}</p>}
      </div>

      <CrewLocationPickerMap
        value={pin}
        height={300}
        onChange={(next) => {
          setPin({ lat: next.lat, lng: next.lng, address: next.address });
          if (next.address) {
            onCommit({
              lat: next.lat,
              lng: next.lng,
              main_address: next.address,
            });
          } else {
            // Address not resolved — still commit coords; user can type
            // the address manually in the field below.
            onCommit({
              lat: next.lat,
              lng: next.lng,
              main_address: "",
            });
          }
        }}
      />

      <ValidatedField
        name="main_address"
        label="주소 (자동 입력 · 수정 가능)"
        control={control}
        errors={errors}
        required
      >
        <input
          type="text"
          {...register("main_address")}
          placeholder="지도에서 위치를 지정하면 자동으로 채워져요"
          className={inputCls}
        />
      </ValidatedField>
      <ValidatedField
        name="detail_address"
        label="상세 주소 (선택)"
        control={control}
        errors={errors}
      >
        <input
          type="text"
          {...register("detail_address")}
          placeholder="예: 2층, 101호 등"
          className={inputCls}
        />
      </ValidatedField>
    </div>
  );
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
type DayKey = (typeof DAYS)[number];

function summarizeDays(selected: DayKey[]): string {
  if (selected.length === 0) return "";
  if (selected.length === 7) return "매일";
  // Preserve calendar order (월→일) regardless of click order.
  const ordered = DAYS.filter((d) => selected.includes(d));
  // Detect contiguous runs (e.g. 월·화·수 → 월–수)
  const runs: DayKey[][] = [];
  let cur: DayKey[] = [];
  ordered.forEach((d) => {
    const idx = DAYS.indexOf(d);
    const last = cur[cur.length - 1];
    if (!last || DAYS.indexOf(last) === idx - 1) {
      cur.push(d);
    } else {
      runs.push(cur);
      cur = [d];
    }
  });
  if (cur.length) runs.push(cur);
  return runs
    .map((run) =>
      run.length >= 3 ? `${run[0]}–${run[run.length - 1]}` : run.join("·")
    )
    .join("·");
}

function composeBusinessHours(
  days: DayKey[],
  open: string,
  close: string,
  note: string
): string {
  const parts: string[] = [];
  const daySummary = summarizeDays(days);
  if (daySummary && open && close) {
    parts.push(`${daySummary} ${open}–${close}`);
  } else if (daySummary) {
    parts.push(daySummary);
  } else if (open && close) {
    parts.push(`${open}–${close}`);
  }
  const trimmedNote = note.trim();
  if (trimmedNote) parts.push(trimmedNote);
  return parts.join(" · ");
}

function BusinessHoursField({
  onChange,
}: {
  onChange: (composed: string) => void;
}) {
  const [days, setDays] = useState<DayKey[]>([]);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [note, setNote] = useState("");

  useEffect(() => {
    onChange(composeBusinessHours(days, openTime, closeTime, note));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, openTime, closeTime, note]);

  const toggleDay = (d: DayKey) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const allSelected = days.length === 7;
  const weekdaysSelected =
    days.length === 5 &&
    (["월", "화", "수", "목", "금"] as DayKey[]).every((d) =>
      days.includes(d)
    );

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
          영업 요일 (선택)
        </label>
        <div className="flex flex-row flex-nowrap gap-1.5 w-full">
          {DAYS.map((d) => {
            const active = days.includes(d);
            const isWeekend = d === "토" || d === "일";
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`h-9 flex-1 basis-0 min-w-0 rounded-md border text-sm transition-colors ${
                  active
                    ? "border-[hsl(var(--lime))] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]"
                    : "border-cart-rule text-cart-ink-60"
                } ${isWeekend && !active ? "text-red-400" : ""}`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setDays(allSelected ? [] : [...DAYS])}
            className="px-2.5 py-1 rounded-md border border-cart-rule text-[11px] tracking-[0.18em] text-cart-ink-60"
          >
            {allSelected ? "전체 해제" : "매일"}
          </button>
          <button
            type="button"
            onClick={() =>
              setDays(
                weekdaysSelected
                  ? []
                  : (["월", "화", "수", "목", "금"] as DayKey[])
              )
            }
            className="px-2.5 py-1 rounded-md border border-cart-rule text-[11px] tracking-[0.18em] text-cart-ink-60"
          >
            평일
          </button>
          <button
            type="button"
            onClick={() => setDays(["토", "일"])}
            className="px-2.5 py-1 rounded-md border border-cart-rule text-[11px] tracking-[0.18em] text-cart-ink-60"
          >
            주말
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
            오픈
          </label>
          <input
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
            마감
          </label>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
          비고 · 예외 (선택)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="예: 격주 화요일 휴무, 공휴일 휴무, 매월 첫째 주 월요일 휴무"
          className={inputCls}
        />
        <p className="text-[11px] text-cart-ink-40">
          요일/시간으로 표현하기 어려운 휴무 패턴이나 변동 사항을 자유롭게 적어
          주세요.
        </p>
      </div>

      <div className="rounded-md border border-cart-rule/60 bg-cart-paper/40 px-3 py-2">
        <p className="text-[11px] tracking-[0.18em] text-cart-ink-40">
          미리보기
        </p>
        <p className="text-sm text-cart-ink mt-1 break-keep">
          {composeBusinessHours(days, openTime, closeTime, note) || (
            <span className="text-cart-ink-40">
              아직 입력된 영업시간이 없어요
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

interface ValidatedFieldProps {
  name: FormField;
  label: string;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function ValidatedField({
  name,
  label,
  control,
  errors,
  required,
  hint,
  children,
}: ValidatedFieldProps) {
  const value = useWatch({ control, name }) as unknown;
  const debounced = useDebounced(value, 300);
  const error = errors[name]?.message as string | undefined;

  const hasValue =
    debounced !== undefined &&
    debounced !== null &&
    String(debounced).trim().length > 0;
  const showCheck = hasValue && !error;
  const showError = !!error && hasValue;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] uppercase tracking-[0.18em] text-cart-ink-60">
          {label} {required && <span className="text-[hsl(var(--lime))]">*</span>}
        </label>
        {showCheck && (
          <Check
            className="w-3.5 h-3.5 text-[hsl(var(--lime))]"
            strokeWidth={2.2}
          />
        )}
        {showError && (
          <X className="w-3.5 h-3.5 text-red-500" strokeWidth={2.2} />
        )}
      </div>
      {children}
      {hint && !showError && (
        <p className="text-[11px] text-cart-ink-40">{hint}</p>
      )}
      {showError && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
