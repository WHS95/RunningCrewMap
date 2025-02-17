"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FormLayout } from "@/components/layout/FormLayout";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import type { Crew } from "@/lib/types/crew";

interface AdminCrew {
  id: string;
  name: string;
  logo_image_url?: string;
  is_visible: boolean;
  location: {
    main_address: string;
    latitude: number;
    longitude: number;
  };
  description?: string;
  instagram?: string;
  created_at: string;
  activity_day?: string;
  age_range?: string;
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
      const { data, error } = await supabase
        .from("crews")
        .select(
          `
          id,
          name,
          logo_image_url,
          is_visible,
          description,
          instagram,
          created_at,
          crew_locations (
            main_address,
            latitude,
            longitude
          ),
          crew_activity_days (
            day_of_week
          ),
          crew_age_ranges (
            min_age,
            max_age
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCrews(
        data.map((crew) => ({
          ...crew,
          location: {
            main_address: crew.crew_locations[0]?.main_address || "주소 없음",
            latitude: crew.crew_locations[0]?.latitude || 0,
            longitude: crew.crew_locations[0]?.longitude || 0,
          },
          activity_day: crew.crew_activity_days
            ?.map((d) => d.day_of_week)
            .join(", "),
          age_range: crew.crew_age_ranges?.[0]
            ? `${crew.crew_age_ranges[0].min_age}~${crew.crew_age_ranges[0].max_age}세`
            : undefined,
          logo_image: crew.logo_image_url,
        }))
      );
    } catch (error) {
      console.error("크루 목록 조회 실패:", error);
      toast.error("크루 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCrewVisibility = async (crewId: string, newValue: boolean) => {
    try {
      const { error } = await supabase
        .from("crews")
        .update({ is_visible: newValue })
        .eq("id", crewId);

      if (error) throw error;

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
    setSelectedCrew({
      id: crew.id,
      name: crew.name,
      description: crew.description || "",
      instagram: crew.instagram,
      logo_image: crew.logo_image_url,
      created_at: crew.created_at,
      activity_day: crew.activity_day,
      age_range: crew.age_range,
      location: {
        lat: crew.location.latitude,
        lng: crew.location.longitude,
        main_address: crew.location.main_address,
      },
    });
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
        {crews.map((crew) => (
          <div
            key={crew.id}
            className='flex items-center justify-between p-4 border rounded-lg'
          >
            <div
              className='flex items-center gap-4 flex-1 cursor-pointer'
              onClick={() => handleCrewClick(crew)}
            >
              {/* 크루 로고 */}
              {crew.logo_image_url ? (
                <Image
                  src={crew.logo_image_url}
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
              <span className='text-sm text-muted-foreground'>
                {crew.is_visible ? "표시" : "숨김"}
              </span>
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
