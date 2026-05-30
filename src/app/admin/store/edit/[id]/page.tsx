import { notFound } from "next/navigation";
import { getStoreByIdAdmin } from "@/lib/server/stores";
import type { StoreEditInitial } from "@/components/store/StoreEditForm";
import { StoreEditClient } from "./StoreEditClient";

export const runtime = "nodejs";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreEditPage({ params }: Props) {
  const { id } = await params;
  const store = await getStoreByIdAdmin(id);
  if (!store) notFound();

  // Store → StoreEditInitial 형 변환. transformStore가 detail_address를
  // 별도 필드로 보존하지 않으므로 address ≠ main_address 휴리스틱으로 복원.
  const detailAddress =
    store.location.address && store.location.address !== store.location.main_address
      ? store.location.address
      : undefined;

  const initial: StoreEditInitial = {
    id: store.id,
    name: store.name,
    category: store.category,
    description: store.description,
    verification_method: store.verification_method,
    reward_description: store.reward_description,
    owner_message: store.owner_message,
    business_hours: store.business_hours,
    contact: store.contact,
    instagram: store.instagram,
    naver_map_url: store.naver_map_url,
    event_post_url: store.event_post_url,
    main_image_url: store.main_image_url,
    location: {
      main_address: store.location.main_address,
      detail_address: detailAddress,
      latitude: store.location.lat,
      longitude: store.location.lng,
    },
    // Store.photos는 URL 배열. display_order는 배열 인덱스로 복원 가능.
    photos: store.photos.map((photo_url, idx) => ({
      photo_url,
      display_order: idx,
    })),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">매장 수정</h1>
        <p className="text-sm text-cart-ink-60 mt-1">
          어드민 모드 — 토큰 없이 진입 (미들웨어 권한 검증)
        </p>
        {!store.is_visible && (
          <p className="text-xs text-amber-300 mt-2">
            ● PENDING — 가시성 OFF 상태입니다.
          </p>
        )}
      </div>
      <StoreEditClient initial={initial} />
    </main>
  );
}
