import type { Metadata } from "next";
import { CartographicHeader, KickerLabel } from "@/components/design/cartographic";
import { RegionIndexList } from "@/components/regions/RegionIndexList";
import { getRegionSummaries } from "@/lib/server/regions";
import { CSS_VARIABLES } from "@/lib/constants";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "지역별 러닝크루",
  description: "전국 7개 광역 단위로 등록된 러닝크루를 찾아보세요. 서울·경기·강원·경상·전라·충청·제주.",
  alternates: { canonical: "/regions" },
  openGraph: {
    title: "지역별 러닝크루 | 런하우스",
    description: "전국 7개 광역의 러닝크루를 한눈에.",
    url: "/regions",
    type: "website",
  },
};

export default async function RegionsIndexPage() {
  const summaries = await getRegionSummaries();
  const total = summaries.reduce((acc, s) => acc + s.count, 0);

  return (
    <div
      className="flex flex-col min-h-screen bg-background"
      style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}
    >
      <div className="px-[18px] pt-4 pb-3">
        <CartographicHeader
          kicker="DISCOVER · 7 REGIONS"
          title="지역별 러닝크루"
        />
        <KickerLabel tone="muted" className="tracking-[0.18em] mt-2">
          전국 {total.toString().padStart(3, "0")} 곳 · 광역 단위 집계
        </KickerLabel>
      </div>

      <RegionIndexList rows={summaries} />

      <div className="px-[18px] py-6 text-[11px] text-cart-ink-60 leading-relaxed">
        주소의 시·도 표기를 기준으로 자동 분류합니다. 매장 정보가 갱신되면 약 1분 안에 반영됩니다.
      </div>
    </div>
  );
}
