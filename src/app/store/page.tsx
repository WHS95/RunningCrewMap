// src/app/store/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getVisibleStores } from "@/lib/server/stores";
import { StoreList } from "@/components/store/StoreList";
import { CartographicHeader } from "@/components/design/cartographic";

export const metadata: Metadata = {
  title: "러닝 인증 매장 — 런하우스",
  description: "러닝 인증 시 혜택을 제공하는 카페·식당·주점",
};

export default async function StoreIndexPage() {
  const stores = await getVisibleStores();
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* 카토그래픽 헤더 — 크루 리스트와 동일한 kicker + title 처리 */}
      <CartographicHeader
        kicker={`STORES · ${stores.length.toString().padStart(3, "0")}`}
        title="러닝 인증 매장"
        size="lg"
        className="px-0 pt-0"
        action={
          <Link
            href="/store/register"
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-cart-ink-60 border border-cart-rule rounded-[4px] px-3 py-1.5 active:scale-95 transition-transform hover:border-[hsl(var(--lime))]/40 mt-1"
          >
            매장 등록
          </Link>
        }
      />
      <StoreList stores={stores} />
    </main>
  );
}
