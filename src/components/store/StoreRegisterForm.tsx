"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  STORE_CATEGORIES,
  STORE_CATEGORY_LABELS,
  type StoreCategory,
} from "@/lib/types/store";
import { storeService } from "@/lib/services/store.service";
import { notifyStoreRegistration } from "@/app/actions/store";
import { StoreLocationPickerMap } from "./StoreLocationPickerMap";
import { StorePhotosUpload, type StorePhotoSlot } from "./StorePhotosUpload";

const Schema = z
  .object({
    name: z.string().min(1, "필수"),
    category: z.enum(STORE_CATEGORIES),
    description: z.string().min(1, "필수").max(500),
    verification_method: z.string().min(1, "필수"),
    reward_description: z.string().min(1, "필수"),
    owner_message: z.string().optional(),
    business_hours: z.string().optional(),
    contact: z.string().optional(),
    instagram: z.string().optional(),
    naver_map_url: z.string().url().optional().or(z.literal("")),
    event_post_url: z.string().url().optional().or(z.literal("")),
    pin: z.string().regex(/^\d{4}$/, "4자리 숫자"),
  })
  .refine((v) => !!v.contact || !!v.instagram, {
    message: "연락처 또는 인스타그램 중 하나는 필수입니다.",
    path: ["contact"],
  });

type FormValues = z.infer<typeof Schema>;

export function StoreRegisterForm() {
  const router = useRouter();
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [photos, setPhotos] = useState<StorePhotoSlot[]>([]);
  const [loc, setLoc] = useState<{
    lat: number;
    lng: number;
    main_address: string;
    detail_address?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { category: "cafe" },
  });

  async function onSubmit(values: FormValues) {
    setErr(null);
    if (!mainImage) {
      setErr("대표 사진은 필수입니다.");
      return;
    }
    if (!loc || !loc.main_address) {
      setErr("위치를 지도에서 선택하고 주소를 확인해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
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
          main_address: loc.main_address,
          detail_address: loc.detail_address,
          latitude: loc.lat,
          longitude: loc.lng,
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
          mainAddress: loc.main_address,
          lat: loc.lat,
          lng: loc.lng,
          description: values.description,
          instagram: values.instagram,
        },
        { pin: values.pin }
      );
      router.push(`/store/${id}?registered=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="가게 이름 *" error={errors.name?.message}>
        <input type="text" {...register("name")} className={inputCls} />
      </Field>
      <Field label="카테고리 *" error={errors.category?.message}>
        <select {...register("category")} className={inputCls}>
          {STORE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {STORE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="대표 사진 *">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setMainImage(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </Field>
      <Field label="위치 *">
        <StoreLocationPickerMap onChange={(l) => setLoc(l)} />
      </Field>
      <Field label="가게 소개 * (≤500자)" error={errors.description?.message}>
        <textarea {...register("description")} rows={4} className={inputCls} />
      </Field>
      <Field
        label="러닝 인증 방식 *"
        error={errors.verification_method?.message}
      >
        <textarea
          {...register("verification_method")}
          rows={3}
          className={inputCls}
        />
      </Field>
      <Field label="혜택 *" error={errors.reward_description?.message}>
        <textarea
          {...register("reward_description")}
          rows={3}
          className={inputCls}
        />
      </Field>
      <Field label="사장님 한말씀">
        <textarea {...register("owner_message")} rows={2} className={inputCls} />
      </Field>
      <Field label="영업시간">
        <input
          type="text"
          {...register("business_hours")}
          placeholder="예: 매일 10:00 - 22:00"
          className={inputCls}
        />
      </Field>
      <Field
        label="연락처 (또는 인스타그램 중 하나 필수)"
        error={errors.contact?.message}
      >
        <input type="text" {...register("contact")} className={inputCls} />
      </Field>
      <Field label="인스타그램">
        <input
          type="text"
          {...register("instagram")}
          placeholder="@username"
          className={inputCls}
        />
      </Field>
      <Field label="네이버지도 URL">
        <input type="url" {...register("naver_map_url")} className={inputCls} />
      </Field>
      <Field label="이벤트 글 URL">
        <input type="url" {...register("event_post_url")} className={inputCls} />
      </Field>
      <Field label="추가 사진 (선택, 최대 6장)">
        <StorePhotosUpload onChange={setPhotos} />
      </Field>
      <Field label="PIN 4자리 *" error={errors.pin?.message}>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          {...register("pin")}
          className={inputCls}
        />
      </Field>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[hsl(var(--lime))] py-2 font-semibold text-[hsl(var(--lime-foreground))] disabled:opacity-50"
      >
        {submitting ? "등록 중..." : "매장 등록 신청"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-cart-rule bg-transparent px-3 py-2 text-sm text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-cart-ink";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-cart-ink-60">{label}</span>
      <div>{children}</div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}
