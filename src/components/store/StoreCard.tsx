import Image from "next/image";
import Link from "next/link";
import type { Store } from "@/lib/types/store";
import { StoreCategoryChip } from "./StoreCategoryChip";

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link
      href={`/store/${store.id}`}
      className="block rounded-lg border border-cart-rule transition-colors hover:bg-cart-paper/40"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-cart-paper">
        {store.main_image_url && (
          <Image
            src={store.main_image_url}
            alt={store.name}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        )}
      </div>
      <div className="space-y-1 p-3">
        <StoreCategoryChip category={store.category} />
        <div className="text-base font-medium text-cart-ink">{store.name}</div>
        {store.description && (
          <div className="line-clamp-2 text-sm text-cart-ink-60">
            {store.description}
          </div>
        )}
      </div>
    </Link>
  );
}
