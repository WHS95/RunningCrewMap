"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { crewService } from "@/lib/services";
import type { Crew } from "@/lib/types/crew";
import { MobileNav } from "@/components/layout/MobileNav";

const NaverMap = dynamic(() => import("@/components/map/NaverMap"), {
  ssr: false,
});

function CrewList({ crews }: { crews: Crew[] }) {
  return (
    <div className='h-full overflow-auto p-4'>
      <div className='mb-4'>
        <h2 className='text-lg font-semibold'>러닝 크루 목록</h2>
        <p className='text-sm text-muted-foreground'>
          총 {crews.length}개의 크루
        </p>
      </div>
      <div className='space-y-4'>
        {crews.map((crew) => (
          <div
            key={crew.id}
            className='p-4 rounded-lg border hover:bg-accent cursor-pointer'
          >
            <h3 className='font-semibold'>{crew.name}</h3>
            <p className='text-sm text-muted-foreground line-clamp-2'>
              {crew.description}
            </p>
            {crew.instagram && (
              <p className='text-sm text-blue-600 mt-2'>{crew.instagram}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [crews, setCrews] = useState<Crew[]>([]);

  useEffect(() => {
    const loadCrews = async () => {
      try {
        const data = await crewService.getAllCrews();
        setCrews(data);
      } catch (error) {
        console.error("Failed to load crews:", error);
      }
    };

    loadCrews();
  }, []);

  return (
    <div className='relative flex flex-col md:flex-row h-[calc(100vh-3.5rem)]'>
      {/* 데스크톱: 왼쪽 사이드바 */}
      <div className='hidden md:block w-80 border-r'>
        <CrewList crews={crews} />
      </div>

      {/* 지도 */}
      <div className='flex-1 h-[calc(100vh-3.5rem-4rem)] md:h-full'>
        <NaverMap
          width='100%'
          height='100%'
          initialCenter={{ lat: 37.5665, lng: 126.978 }}
          initialZoom={13}
          crews={crews}
        />
      </div>

      {/* 모바일: 하단 네비게이션 */}
      <MobileNav>
        <CrewList crews={crews} />
      </MobileNav>
    </div>
  );
}
