import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getCrews } from "@/lib/server/crews";
import MapPageClient from "./_components/MapPageClient";
import type { Crew } from "@/lib/types/crew";

export default async function Home() {
  // 서버에서 크루 데이터 미리 가져오기 (Server Component)
  let initialCrews: Crew[] = [];
  try {
    initialCrews = await getCrews();
  } catch (error) {
    console.error("서버에서 크루 데이터 로딩 실패:", error);
    initialCrews = [];
  }

  return (
    <Suspense fallback={<LoadingSpinner message='페이지 로딩 중' />}>
      <MapPageClient initialCrews={initialCrews} />
    </Suspense>
  );
}
