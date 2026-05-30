"use client";

import {
  StoreEditForm,
  type StoreEditInitial,
} from "@/components/store/StoreEditForm";

export function StoreEditClient({
  initial,
  token,
}: {
  initial: StoreEditInitial;
  token: string | null;
}) {
  return <StoreEditForm storeId={initial.id} token={token} initial={initial} />;
}
