"use client";

import {
  StoreEditForm,
  type StoreEditInitial,
} from "@/components/store/StoreEditForm";

/**
 * 어드민 전용 StoreEditClient 래퍼.
 *
 * `/store/edit/[id]/StoreEditClient.tsx`는 PIN/토큰 진입용. 어드민은 토큰이
 * 없으므로 token={null}로 전달 — 미들웨어가 이미 권한 검증을 수행함.
 */
export function StoreEditClient({ initial }: { initial: StoreEditInitial }) {
  return <StoreEditForm storeId={initial.id} token={null} initial={initial} />;
}
