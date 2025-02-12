"use client";

import { Crew } from "@/lib/types/crew";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Instagram, SquareArrowOutUpRight } from "lucide-react";
import Image from "next/image";
import { CrewDetailView } from "./CrewDetailView";
import { useState, useEffect } from "react";

interface VisibleCrewListProps {
  crews: Crew[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (crew: Crew) => void;
}

export function VisibleCrewList({
  crews,
  isOpen,
  onClose,
}: VisibleCrewListProps) {
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 이미지 프리로딩
  useEffect(() => {
    if (isOpen) {
      crews.forEach((crew) => {
        if (crew.logo_image) {
          const img = new global.Image();
          img.src = crew.logo_image;
        }
      });
    }
  }, [crews, isOpen]);

  const handleCrewSelect = (crew: Crew) => {
    setSelectedCrew(crew);
    setIsDetailOpen(true);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setSelectedCrew(null);
  };

  return (
    <>
      <Sheet open={isOpen && !isDetailOpen} onOpenChange={onClose}>
        <SheetContent
          side='bottom'
          className='h-[calc(80vh-4rem)] p-0 rounded-t-[10px]'
        >
          <div className='sticky top-0 flex items-center justify-center h-10 border-b bg-background/80 backdrop-blur-md'>
            <SheetTitle>목록</SheetTitle>
          </div>
          <div className='overflow-y-auto h-[calc(80vh-10.5rem)]'>
            {crews.map((crew) => (
              <div
                key={crew.id}
                className='px-4 py-3 transition-colors border-b hover:bg-accent/50'
              >
                <div className='flex gap-3'>
                  {/* 로고 이미지 */}
                  <button
                    onClick={() => handleCrewSelect(crew)}
                    className='relative flex-shrink-0 group focus:outline-none'
                    title='크루 상세정보 보기'
                  >
                    {crew.logo_image ? (
                      <>
                        <Image
                          src={crew.logo_image}
                          alt={`${crew.name} 로고`}
                          width={48}
                          height={48}
                          className='flex-shrink-0 object-cover transition-opacity rounded-full group-hover:opacity-90'
                          loading='eager'
                          priority={true}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.parentElement!.innerHTML = `<div class="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-full bg-muted"><span class="text-lg font-medium text-muted-foreground">${crew.name.charAt(
                              0
                            )}</span></div>`;
                          }}
                        />
                        <div className='absolute inset-0 transition-all rounded-full ring-2 ring-transparent group-hover:ring-primary' />
                      </>
                    ) : (
                      <div className='flex items-center justify-center flex-shrink-0 w-12 h-12 transition-colors rounded-full bg-muted group-hover:bg-muted/80'>
                        <span className='text-lg font-medium text-muted-foreground'>
                          {crew.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* 크루 정보 */}
                  <div className='flex-1 min-w-0'>
                    {/* 크루 이름 */}
                    <div className='flex items-center justify-between gap-2'>
                      <button
                        onClick={() => handleCrewSelect(crew)}
                        className='text-left group focus:outline-none'
                        title='크루 상세정보 보기'
                      >
                        <h3 className='flex items-center font-medium truncate transition-colors group-hover:text-primary'>
                          <span className='truncate'>{crew.name}</span>
                          <SquareArrowOutUpRight className='w-3.5 h-3.5 ml-0.5' />
                        </h3>
                      </button>
                      {crew.instagram && (
                        <a
                          href={`https://instagram.com/${crew.instagram}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center flex-shrink-0 gap-1 text-xs text-blue-600 hover:underline'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Instagram className='w-3.5 h-3.5' />
                          <span>@{crew.instagram}</span>
                        </a>
                      )}
                    </div>

                    {/* 활동 지역 */}
                    <div className='flex items-center gap-1.5 mt-1'>
                      <MapPin className='h-3.5 w-3.5 flex-shrink-0 text-muted-foreground' />
                      <span className='text-xs truncate text-muted-foreground'>
                        {crew.location.main_address ||
                          crew.location.address ||
                          "활동 지역 정보 없음"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <CrewDetailView
        crew={selectedCrew}
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
      />
    </>
  );
}
