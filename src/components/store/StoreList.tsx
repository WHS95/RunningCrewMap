"use client";

import { useState } from "react";
import {
  STORE_CATEGORIES,
  STORE_CATEGORY_LABELS,
  type Store,
  type StoreCategory,
} from "@/lib/types/store";
import { StoreCard } from "./StoreCard";

export function StoreList({ stores }: { stores: Store[] }) {
  const [tab, setTab] = useState<"all" | StoreCategory>("all");
  const filtered =
    tab === "all" ? stores : stores.filter((s) => s.category === tab);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
          전체
        </TabBtn>
        {STORE_CATEGORIES.map((c) => (
          <TabBtn key={c} active={tab === c} onClick={() => setTab(c)}>
            {STORE_CATEGORY_LABELS[c]}
          </TabBtn>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <StoreCard key={s.id} store={s} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-cart-ink-60">
            등록된 매장이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-cart-ink bg-cart-ink text-cart-paper"
          : "border-cart-rule text-cart-ink-60"
      }`}
    >
      {children}
    </button>
  );
}
