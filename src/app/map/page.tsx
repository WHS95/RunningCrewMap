import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getCrews } from "@/lib/server/crews";
import { getVisibleStores } from "@/lib/server/stores";
import MapPageClient from "@/app/_components/MapPageClient";
import type { Crew } from "@/lib/types/crew";
import type { Store } from "@/lib/types/store";

// /map — the interactive Naver map view. Was the root route until the
// landing/home page took over /. The map keeps its own route now so
// the home page can load instantly (no map SDK / crew query) and the
// map view can be linked to directly.

export const metadata: Metadata = {
  title: "지도 | 런하우스",
  description: "전국의 러닝크루를 지도에서 확인하고 가까운 크루를 찾아보세요.",
};

export default async function MapPage() {
  let initialCrews: Crew[] = [];
  let initialStores: Store[] = [];
  // Parallelize crew + store prefetches; isolate failures so one bad
  // domain query doesn't blank out the map for the other.
  const [crewsResult, storesResult] = await Promise.allSettled([
    getCrews(),
    getVisibleStores(),
  ]);
  if (crewsResult.status === "fulfilled") {
    initialCrews = crewsResult.value;
  } else {
    console.error("서버에서 크루 데이터 로딩 실패:", crewsResult.reason);
  }
  if (storesResult.status === "fulfilled") {
    initialStores = storesResult.value;
  } else {
    console.error("서버에서 매장 데이터 로딩 실패:", storesResult.reason);
  }

  return (
    <Suspense fallback={<LoadingSpinner message='페이지 로딩 중' />}>
      <MapPageClient
        initialCrews={initialCrews}
        initialStores={initialStores}
      />
    </Suspense>
  );
}
