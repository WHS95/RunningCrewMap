"use client";

import { CSS_VARIABLES } from "@/lib/constants";
import { useState } from "react";
import { crewService } from "@/lib/services";
import { Crew } from "@/lib/types/crewFile";
import { useEffect } from "react";
import Image from "next/image";
import { CrewDetailView } from "@/components/map/CrewDetailView";

export default function HomePage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeCrewId, setActiveCrewId] = useState<string | null>(null);

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

  const handleCrewClick = (crew: Crew) => {
    setActiveCrewId(crew.id);
    setSelectedCrew(crew);

    // 시각적 피드백을 위한 딜레이 후 시트 열기
    setTimeout(() => {
      setIsDetailOpen(true);
    }, 200);

    // 시트가 닫힌 후 active 상태 제거
    setTimeout(() => {
      setActiveCrewId(null);
    }, 500);
  };

  return (
    <div
      className='flex flex-col min-h-screen'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 공지사항 섹션 */}
      <section className='p-4 border-b'>
        <h2 className='mb-4 text-lg font-medium'>❗️공지사항</h2>
        <div className='space-y-2'>
          <div className='p-4 rounded-lg bg-accent/50'>
            <h3 className='font-medium'>서비스 오픈 안내</h3>
            <p className='mt-1 text-sm text-muted-foreground'>
              🏃🏼‍♂️러너하우스가 드디어 베타 오픈했습니다. <br />
              크루등록 방법은 메뉴 탭 이용해주세요😉
            </p>
            {/* <time className='block mt-2 text-xs text-muted-foreground'>
              2024.02.08
            </time> */}
          </div>
        </div>
      </section>

      {/* 러닝크루 소개 섹션 */}
      <section className='p-4'>
        <h2 className='mb-4 text-lg font-medium'>🏃‍♂️ 러닝크루</h2>
        <div className='grid grid-cols-3 gap-4 md:gap-6'>
          {crews.map((crew) => (
            <button
              key={crew.id}
              onClick={() => handleCrewClick(crew)}
              className={`relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] focus:outline-none group ${
                activeCrewId === crew.id ? "scale-95 opacity-80" : ""
              }`}
            >
              {crew.logo_image ? (
                <Image
                  src={crew.logo_image}
                  alt={`${crew.name} 로고`}
                  fill
                  className={`object-contain p-4 transition-all duration-300 group-hover:scale-110 ${
                    activeCrewId === crew.id ? "scale-90" : ""
                  }`}
                  loading='eager'
                  priority={true}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.parentElement!.innerHTML = `<div class="flex items-center justify-center w-full h-full text-3xl font-medium text-muted-foreground bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">${crew.name.charAt(
                      0
                    )}</div>`;
                  }}
                />
              ) : (
                <div
                  className={`flex items-center justify-center w-full h-full text-3xl font-medium text-muted-foreground bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 transition-transform duration-300 ${
                    activeCrewId === crew.id ? "scale-90" : ""
                  }`}
                >
                  {crew.name.charAt(0)}
                </div>
              )}
              <div
                className={`absolute inset-0 bg-black/0 transition-colors duration-300 ${
                  activeCrewId === crew.id
                    ? "bg-black/10"
                    : "group-hover:bg-black/5"
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      {/* 크루 상세 정보 */}
      <CrewDetailView
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCrew(null);
          setActiveCrewId(null);
        }}
      />
    </div>
  );
}
