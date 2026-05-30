// src/app/store/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getVisibleStores } from "@/lib/server/stores";
import { StoreList } from "@/components/store/StoreList";

export const metadata: Metadata = {
  title: "러닝 인증 매장 — 런하우스",
  description: "러닝 인증 시 혜택을 제공하는 카페·식당·주점",
};

export default async function StoreIndexPage() {
  const stores = await getVisibleStores();
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-end justify-between">
        <h1 className="text-2xl font-semibold">러닝 인증 매장</h1>
        <Link href="/store/register" className="text-sm underline">매장 등록</Link>
      </header>
      <StoreList stores={stores} />
    </main>
  );
}
