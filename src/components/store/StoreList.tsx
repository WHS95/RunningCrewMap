"use client";

import { useState } from "react";
import {
  STORE_CATEGORIES,
  STORE_CATEGORY_LABELS,
  type Store,
  type StoreCategory,
} from "@/lib/types/store";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { StoreDetailView } from "@/components/store/StoreDetailView";
import { KickerLabel } from "@/components/design/cartographic";
import { StoreRow } from "./StoreCard";

export function StoreList({ stores }: { stores: Store[] }) {
  const [tab, setTab] = useState<"all" | StoreCategory>("all");

  // CLICK -> OVERLAY: selectedStore가 있으면 Sheet 오픈. 크루 리스트가
  // CrewDetailView를 오버레이로 여는 것과 동일 패턴(라우팅 X).
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const filtered =
    tab === "all" ? stores : stores.filter((s) => s.category === tab);

  return (
    <div>
      {/* 카테고리 필터 — 카토그래픽 필 (sharp 라디우스, 모노 라벨) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
        <FilterPill active={tab === "all"} onClick={() => setTab("all")}>
          전체
        </FilterPill>
        {STORE_CATEGORIES.map((c) => (
          <FilterPill key={c} active={tab === c} onClick={() => setTab(c)}>
            {STORE_CATEGORY_LABELS[c]}
          </FilterPill>
        ))}
      </div>

      {/* 카토그래픽 컬럼 헤더 — 크루 리스트와 동일 */}
      <div className="flex items-center gap-3 py-2 border-b border-cart-rule">
        <div className="flex-1 font-mono text-[9px] tracking-[0.15em] text-cart-ink-40">
          NAME · CATEGORY
        </div>
        <KickerLabel tone="muted" className="tracking-[0.18em]">
          TOTAL · {filtered.length.toString().padStart(3, "0")}
        </KickerLabel>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-40 text-center">
          <p className="text-cart-ink-60 font-mono text-[11px] tracking-[0.1em]">
            · 등록된 매장이 없습니다 ·
          </p>
        </div>
      ) : (
        <div className="pb-8">
          {filtered.map((s, idx) => (
            <StoreRow
              key={s.id}
              store={s}
              onClick={() => setSelectedStore(s)}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}

      {/* 매장 상세 — StoreDetailView를 Sheet으로 감싼 인라인 래퍼.
          MapPageClient.tsx의 패턴과 동일(크루용 CrewDetailView 오버레이와 같은 흐름). */}
      <Sheet
        open={selectedStore !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedStore(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[85vh] overflow-y-auto p-0 sm:max-w-full"
        >
          <SheetTitle className="sr-only">
            {selectedStore ? selectedStore.name : "매장 상세"}
          </SheetTitle>
          {selectedStore && <StoreDetailView store={selectedStore} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// 카토그래픽 필터 필 — active = bg-cart-ink text-cart-paper, sharp 라디우스.
function FilterPill({
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
      className={`whitespace-nowrap rounded-[4px] border px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-transform active:scale-95 ${
        active
          ? "border-cart-ink bg-cart-ink text-cart-paper font-semibold"
          : "border-cart-rule text-cart-ink-60"
      }`}
    >
      {children}
    </button>
  );
}
