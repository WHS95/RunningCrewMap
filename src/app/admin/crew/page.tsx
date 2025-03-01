"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FormLayout } from "@/components/layout/FormLayout";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import type { Crew } from "@/lib/types/crew";
import { crewService } from "@/lib/services/crew.service";

interface AdminCrew extends Crew {
  is_visible: boolean;
}

export default function AdminCrewPage() {
  const [crews, setCrews] = useState<AdminCrew[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchCrews();
  }, []);

  const fetchCrews = async () => {
    try {
      setIsLoading(true);
      // crewService의 getCrews 메서드를 사용하여 모든 크루 데이터 가져오기
      const crewsData = await crewService.getAdminCrews();
      setCrews(crewsData);
    } catch (error) {
      console.error("크루 목록 조회 실패:", error);
      toast.error("크루 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCrewVisibility = async (crewId: string, newValue: boolean) => {
    try {
      // crewService의 메서드를 사용하여 크루 표시 상태 변경
      await crewService.updateCrewVisibility(crewId, newValue);

      // 로컬 상태 업데이트
      setCrews((prev) =>
        prev.map((crew) =>
          crew.id === crewId ? { ...crew, is_visible: newValue } : crew
        )
      );

      toast.success(
        `${crews.find((c) => c.id === crewId)?.name} 크루가 ${
          newValue ? "표시" : "숨김"
        } 처리되었습니다.`
      );
    } catch (error) {
      console.error("크루 표시 상태 변경 실패:", error);
      toast.error("크루 표시 상태 변경에 실패했습니다.");
    }
  };

  const handleCrewClick = (crew: AdminCrew) => {
    setSelectedCrew(crew);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <FormLayout title='크루 관리'>
        <div className='flex items-center justify-center flex-1'>
          <div className='text-lg'>로딩 중...</div>
        </div>
      </FormLayout>
    );
  }

  return (
    <FormLayout title='크루 관리'>
      <div className='space-y-4'>
        {/* 크루 통계 */}
        <div className='p-4 border rounded-lg bg-accent/10'>
          <div className='flex items-center gap-3 text-sm'>
            <div>
              <span className='text-muted-foreground'>전체:</span>{" "}
              <span className='font-medium'>{crews.length}</span>
            </div>
            <div className='w-px h-4 bg-border' />
            <div>
              <span className='text-muted-foreground'>숨김:</span>{" "}
              <span className='font-medium'>
                {crews.filter((crew) => !crew.is_visible).length}
              </span>
            </div>
          </div>
        </div>

        {/* 크루 목록 */}
        {crews.map((crew) => (
          <div
            key={crew.id}
            className='flex items-center justify-between p-4 border rounded-lg'
          >
            <div
              className='flex items-center flex-1 gap-4 cursor-pointer'
              onClick={() => handleCrewClick(crew)}
            >
              {/* 크루 로고 */}
              {crew.logo_image ? (
                <Image
                  src={crew.logo_image}
                  alt={`${crew.name} 로고`}
                  width={48}
                  height={48}
                  className='object-cover rounded-full'
                />
              ) : (
                <div className='flex items-center justify-center w-12 h-12 text-xl font-medium rounded-full bg-muted'>
                  {crew.name.charAt(0)}
                </div>
              )}

              {/* 크루 정보 */}
              <div>
                <h2 className='font-medium'>{crew.name}</h2>
                <p className='text-sm text-muted-foreground'>
                  {crew.location.main_address}
                </p>
              </div>
            </div>

            {/* 표시 여부 토글 */}
            <div
              className='flex items-center gap-2'
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                checked={crew.is_visible}
                onCheckedChange={(checked) =>
                  toggleCrewVisibility(crew.id, checked)
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* 크루 상세 정보 팝업 */}
      <CrewDetailView
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCrew(null);
        }}
      />
    </FormLayout>
  );
}
