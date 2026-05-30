// src/app/store/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreByIdAdmin } from "@/lib/server/stores";
import { StoreDetailView } from "@/components/store/StoreDetailView";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const store = await getStoreByIdAdmin(id);
  if (!store) return { title: "매장 — 런하우스" };
  return {
    title: `${store.name} — 런하우스 매장`,
    description: store.description?.slice(0, 120) ?? undefined,
  };
}

export default async function StoreDetailPage({ params }: Props) {
  const { id } = await params;
  const store = await getStoreByIdAdmin(id);
  if (!store || !store.is_visible) notFound();
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <StoreDetailView store={store} />
    </main>
  );
}
