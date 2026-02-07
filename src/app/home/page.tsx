import { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import { marathonService } from "@/lib/services/marathon.service";
import { HomeContent } from "./HomeContent";

export const metadata: Metadata = {
  title: "홈 | 런하우스",
  description: "전국의 러닝크루를 한눈에 확인하고 함께 달려보세요.",
};

// 서버에서 크루 수 가져오기 (Server Component 데이터 페칭)
async function getCrewCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("crews")
      .select("*", { count: "exact", head: true })
      .eq("is_visible", true);

    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function HomePage() {
  // 서버에서 데이터 병렬 페칭
  const [registeredCrews, marathonsThisMonth] = await Promise.all([
    getCrewCount(),
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
