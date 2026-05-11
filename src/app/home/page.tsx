import { Metadata } from "next";
import { getCrewCount } from "@/lib/server/crews";
import { marathonService } from "@/lib/services/marathon.service";
import { HomeContent } from "./HomeContent";

export const metadata: Metadata = {
  title: "홈 | 런하우스",
  description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
};

export default async function HomePage() {
  // 서버에서 데이터 병렬 페칭 (server-only Supabase client 사용)
  const [registeredCrews, marathonsThisMonth] = await Promise.all([
    getCrewCount().catch(() => 0),
    Promise.resolve(
      (() => {
        const currentMonth = new Date().getMonth() + 1;
        return marathonService.getMarathonEventsByMonth(currentMonth).length;
      })(),
    ),
  ]);

  return (
    <HomeContent
      registeredCrews={registeredCrews}
      marathonsThisMonth={marathonsThisMonth}
    />
  );
}
