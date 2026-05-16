import { Metadata } from "next";
import { getCrewCount } from "@/lib/server/crews";
import { marathonService } from "@/lib/services/marathon.service";
import { listActiveBanners } from "@/app/actions/banner";
import { HomeContent } from "./home/HomeContent";

// Root route is now the landing/home page — promo banner + primary
// "주변 크루 찾으러 가기" CTA → /map. The interactive map itself lives
// at /map (was the previous root before this refactor).

export const metadata: Metadata = {
  title: "런하우스 | 전국 러닝크루 지도",
  description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
};

export default async function LandingPage() {
  const [registeredCrews, marathonsThisMonth, banners] = await Promise.all([
    getCrewCount().catch(() => 0),
    Promise.resolve(
      (() => {
        const currentMonth = new Date().getMonth() + 1;
        return marathonService.getMarathonEventsByMonth(currentMonth).length;
      })(),
    ),
    listActiveBanners().catch(() => []),
  ]);

  return (
    <HomeContent
      registeredCrews={registeredCrews}
      marathonsThisMonth={marathonsThisMonth}
      banners={banners.map((b) => ({
        id: Number.parseInt(b.id.replace(/[^0-9]/g, "").slice(0, 9) || "0") || 0,
        link: b.link,
        imageUrl: b.image_url ?? "",
        title: b.title,
        description: b.description ?? undefined,
        variant: b.variant ?? undefined,
        code: b.code ?? undefined,
        cta: b.cta ?? undefined,
        bgColor: b.bg_color ?? undefined,
      }))}
    />
  );
}
