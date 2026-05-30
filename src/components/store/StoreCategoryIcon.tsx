import { Coffee, UtensilsCrossed, Beer, Store as StoreIcon } from "lucide-react";
import type { StoreCategory } from "@/lib/types/store";

export function StoreCategoryIcon({
  category,
  className,
}: {
  category: StoreCategory;
  className?: string;
}) {
  switch (category) {
    case "cafe":
      return <Coffee className={className} aria-hidden />;
    case "restaurant":
      return <UtensilsCrossed className={className} aria-hidden />;
    case "pub":
      return <Beer className={className} aria-hidden />;
    case "other":
    default:
      return <StoreIcon className={className} aria-hidden />;
  }
}
