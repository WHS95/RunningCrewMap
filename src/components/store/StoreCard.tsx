import Image from "next/image";
import type { Store } from "@/lib/types/store";
import { STORE_CATEGORY_LABELS } from "@/lib/types/store";

// Cartographic store row — mirrors CrewRow (crew/list): 36px paper avatar,
// name + mono meta (카테고리 · 주소), hairline top border between rows.
export function StoreRow({
  store,
  onClick,
  isFirst = false,
}: {
  store: Store;
  onClick: () => void;
  isFirst?: boolean;
}) {
  const categoryLabel = STORE_CATEGORY_LABELS[store.category];
  const area = store.location.main_address || store.location.address || "";
  const meta = area ? `${categoryLabel} · ${area}` : categoryLabel;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 py-3.5 cursor-pointer active:bg-white/[0.02] ${
        isFirst ? "" : "border-t border-cart-rule"
      }`}
    >
      {store.logo_url ? (
        <div className="relative flex-shrink-0 w-9 h-9 rounded-[4px] overflow-hidden border border-cart-rule bg-cart-paper">
          <Image
            src={store.logo_thumb_url ?? store.logo_url}
            alt={store.name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
            sizes="36px"
            quality={40}
            unoptimized
          />
        </div>
      ) : (
        <div className="flex flex-shrink-0 justify-center items-center w-9 h-9 rounded-[4px] bg-cart-paper border border-cart-rule font-display text-[14px] font-semibold text-[hsl(var(--lime))]">
          {store.name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-cart-ink truncate">
          {store.name}
        </div>
        <div className="font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 truncate mt-0.5">
          {meta}
        </div>
      </div>
    </div>
  );
}
