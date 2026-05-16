import { Metadata } from "next";
import { getCrewCount } from "@/lib/server/crews";
import { marathonService } from "@/lib/services/marathon.service";
import { listActiveBanners } from "@/app/actions/banner";
import { HomeContent } from "./HomeContent";

export const metadata: Metadata = {
  title: "홈 | 런하우스",
  description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
};

export default async function HomePage() {
  // 서버에서 데이터 병렬 페칭 (server-only Supabase client 사용)
  const [registeredCrews, marathonsThisMonth, banners] = await Promise.all([
    getCrewCount().catch(() => 0),
    Promise.resolve(
      (() => {
        const currentMonth = new Date().getMonth() + 1;
        return marathonService.getMarathonEventsByMonth(currentMonth).length;
      })(),
    ),
    // promo_banners table — admin manages from /admin/events. If the table
    // doesn't exist yet (migration unrun) this returns [] and the carousel
    // simply hides.
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
