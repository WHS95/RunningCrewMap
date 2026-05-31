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
import { updateStoreByToken } from "@/app/actions/store";
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
  })
  .refine((v) => !!v.contact || !!v.instagram, {
    message: "연락처 또는 인스타그램 중 하나는 필수입니다.",
    path: ["contact"],
  });

type FormValues = z.infer<typeof Schema>;

export interface StoreEditInitial {
  id: string;
  name: string;
  category: StoreCategory;
  description?: string;
  verification_method?: string;
  reward_description?: string;
  owner_message?: string;
  business_hours?: string;
  contact?: string;
  instagram?: string;
  naver_map_url?: string;
  event_post_url?: string;
  main_image_url?: string;
  location: {
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  };
  photos: Array<{ photo_url: string; display_order: number }>;
}

export function StoreEditForm({
  storeId,
  token,
  initial,
}: {
  storeId: string;
  token?: string | null;
  initial: StoreEditInitial;
}) {
  const router = useRouter();

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [removeMainImage, setRemoveMainImage] = useState(false);
  const [photos, setPhotos] = useState<StorePhotoSlot[]>(
    initial.photos.map((p) => ({
      url: p.photo_url,
      preview: p.photo_url,
      display_order: p.display_order,
    }))
  );
  const initialPhotoUrls = initial.photos.map((p) => p.photo_url);

  const [loc, setLoc] = useState<{
    lat: number;
    lng: number;
    main_address: string;
    detail_address?: string;
  }>({
    lat: initial.location.latitude,
    lng: initial.location.longitude,
    main_address: initial.location.main_address,
    detail_address: initial.location.detail_address,
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetVisibilityNotice, setResetVisibilityNotice] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: initial.name,
      category: initial.category,
      description: initial.description ?? "",
      verification_method: initial.verification_method ?? "",
      reward_description: initial.reward_description ?? "",
      owner_message: initial.owner_message ?? "",
      business_hours: initial.business_hours ?? "",
      contact: initial.contact ?? "",
      instagram: initial.instagram ?? "",
      naver_map_url: initial.naver_map_url ?? "",
      event_post_url: initial.event_post_url ?? "",
    },
  });

  function diffLocation() {
    const same =
      loc.lat === initial.location.latitude &&
      loc.lng === initial.location.longitude &&
      loc.main_address === initial.location.main_address &&
      (loc.detail_address ?? "") === (initial.location.detail_address ?? "");
    return same ? undefined : loc;
  }

  async function onSubmit(values: FormValues) {
    setErr(null);
    setResetVisibilityNotice(false);
    if (!loc.main_address) {
      setErr("주소가 비어있습니다.");
      return;
    }
    setSubmitting(true);
    try {
      // 1) 텍스트/카테고리/위치 — 서버 액션 (좌표 변경 감지가 서버에서 일어남)
      const locDiff = diffLocation();
      const textPatch: Record<string, string | undefined> = {};
      const keys = [
        "name",
        "category",
        "description",
        "verification_method",
        "reward_description",
        "owner_message",
        "business_hours",
        "contact",
        "instagram",
        "naver_map_url",
        "event_post_url",
      ] as const;
      for (const k of keys) {
        const v = values[k as keyof FormValues];
        const initVal = (initial as unknown as Record<string, unknown>)[k];
        if ((v ?? "") !== ((initVal as string | undefined) ?? "")) {
          textPatch[k] = v as string;
        }
      }
      if (Object.keys(textPatch).length > 0 || locDiff) {
        const res = await updateStoreByToken(storeId, token ?? null, {
          ...textPatch,
          location: locDiff
            ? {
                main_address: locDiff.main_address,
                detail_address: locDiff.detail_address,
                latitude: locDiff.lat,
                longitude: locDiff.lng,
              }
            : undefined,
        });
        if (!res.success) {
          throw new Error(res.error ?? "업데이트에 실패했습니다.");
        }
        if (res.resetVisibility) setResetVisibilityNotice(true);
      }

      // 2) 메인 이미지 / 사진 — 클라이언트 서비스 (브라우저 압축 + 업로드)
      const removedPhotoUrls = initialPhotoUrls.filter(
        (u) => !photos.some((p) => p.url === u)
      );
      const newPhotos = photos.filter((p) => p.file).map((p) => p.file as File);
      const hasImagePayload =
        mainImage !== null ||
        removeMainImage ||
        removedPhotoUrls.length > 0 ||
        newPhotos.length > 0;
      if (hasImagePayload) {
        await storeService.updateStore(storeId, {
          main_image: mainImage ?? undefined,
          remove_main_image: removeMainImage && !mainImage,
          new_photos: newPhotos.length > 0 ? newPhotos : undefined,
          removed_photo_urls:
            removedPhotoUrls.length > 0 ? removedPhotoUrls : undefined,
        });
      }

      router.refresh();
      router.push(`/store/${storeId}?edited=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px)+1.5rem)]"
    >
      {resetVisibilityNotice && (
        <div className="rounded-md border border-cart-rule bg-cart-paper p-3 text-xs text-cart-ink-60">
          좌표/주소가 변경되어 재승인 대기 상태로 전환되었습니다.
        </div>
      )}

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

      <Field label="대표 사진">
        {initial.main_image_url && !removeMainImage && !mainImage && (
          <div className="mb-2 text-xs text-cart-ink-60">현재 이미지가 설정되어 있습니다.</div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setMainImage(e.target.files?.[0] ?? null);
            if (e.target.files?.[0]) setRemoveMainImage(false);
          }}
          className="text-sm"
        />
        {initial.main_image_url && (
          <label className="mt-1 inline-flex items-center gap-1 text-xs text-cart-ink-60">
            <input
              type="checkbox"
              checked={removeMainImage}
              onChange={(e) => {
                setRemoveMainImage(e.target.checked);
                if (e.target.checked) setMainImage(null);
              }}
            />
            기존 대표 사진 삭제
          </label>
        )}
      </Field>

      <Field label="위치 *">
        <StoreLocationPickerMap
          initial={{
            lat: initial.location.latitude,
            lng: initial.location.longitude,
            main_address: initial.location.main_address,
            detail_address: initial.location.detail_address,
          }}
          onChange={(l) => setLoc(l)}
        />
        <p className="mt-1 text-xs text-cart-ink-60">
          위치를 변경하면 재승인 대기 상태로 전환됩니다.
        </p>
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
      <Field label="추가 사진 (최대 6장)">
        <StorePhotosUpload
          initial={initial.photos.map((p) => ({
            url: p.photo_url,
            display_order: p.display_order,
          }))}
          onChange={setPhotos}
        />
      </Field>

      {err && <p className="text-sm text-red-500">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[hsl(var(--lime))] py-2 font-semibold text-[hsl(var(--lime-foreground))] disabled:opacity-50"
      >
        {submitting ? "저장 중..." : "변경사항 저장"}
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
