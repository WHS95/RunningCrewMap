"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X, ChevronLeft } from "lucide-react";
import {
  STORE_CATEGORIES,
  STORE_CATEGORY_LABELS,
  type StoreCategory,
} from "@/lib/types/store";
import { storeService } from "@/lib/services/store.service";
import { notifyStoreRegistration } from "@/app/actions/store";
import { StorePhotosUpload, type StorePhotoSlot } from "./StorePhotosUpload";

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
  const [extraErr, setExtraErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [topErr, setTopErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: "onChange",
    defaultValues: { category: "cafe" },
  });

  useEffect(() => {
    if (!mainImage) {
      setMainImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(mainImage);
    setMainImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mainImage]);

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
      const coords = await geocode(values.main_address);
      const lat = coords?.lat ?? 0;
      const lng = coords?.lng ?? 0;
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
          <div className="space-y-4">
            <ValidatedField
              name="main_address"
              label="주소"
              control={control}
              errors={errors}
              required
            >
              <input
                type="text"
                {...register("main_address")}
                placeholder="예: 서울시 강남구 테헤란로 123"
                autoFocus
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
            <ValidatedField
              name="business_hours"
              label="영업시간 (선택)"
              control={control}
              errors={errors}
            >
              <input
                type="text"
                {...register("business_hours")}
                placeholder="예: 매일 10:00 - 22:00"
                autoFocus
                className={inputCls}
              />
            </ValidatedField>
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
