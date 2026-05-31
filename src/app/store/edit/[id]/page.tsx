import { notFound } from "next/navigation";
import { getStoreForEdit } from "@/app/actions/store";
import { serverSupabase } from "@/lib/server/supabase";
import { CSS_VARIABLES } from "@/lib/constants";
import type { StoreCategory } from "@/lib/types/store";
import type { StoreEditInitial } from "@/components/store/StoreEditForm";
import { StoreEditClient } from "./StoreEditClient";
import SetPinForm from "./SetPinForm";

export const runtime = "nodejs";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function StoreEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;
  const r = await getStoreForEdit(id, token);
  if (!r.success) notFound();

  // PIN 설정 여부
  const { data } = await serverSupabase
    .from("stores")
    .select("pin_hash")
    .eq("id", id)
    .maybeSingle();
  const pinSet = !!(data as { pin_hash?: string | null } | null)?.pin_hash;

  const initial: StoreEditInitial = {
    ...r.store,
    category: r.store.category as StoreCategory,
    // 로고 (선택). getStoreForEdit가 logo_url을 반환하면 그대로 전달.
    logo_url: (r.store as { logo_url?: string }).logo_url,
  };

  return (
    <main
      className="mx-auto max-w-2xl px-4 pt-6"
      style={{ paddingBottom: CSS_VARIABLES.MOBILE_NAV_PADDING }}
    >
      {!pinSet ? <SetPinForm storeId={id} token={token ?? null} /> : null}
      <StoreEditClient initial={initial} token={token ?? null} />
    </main>
  );
}
