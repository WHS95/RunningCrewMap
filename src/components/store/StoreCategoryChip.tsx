import { STORE_CATEGORY_LABELS, type StoreCategory } from "@/lib/types/store";
import { StoreCategoryIcon } from "./StoreCategoryIcon";

export function StoreCategoryChip({ category }: { category: StoreCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cart-rule px-2 py-0.5 text-xs text-cart-ink-60">
      <StoreCategoryIcon category={category} className="h-3 w-3" />
      {STORE_CATEGORY_LABELS[category]}
    </span>
  );
}
