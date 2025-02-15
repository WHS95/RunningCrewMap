"use client";

import { Crew } from "@/lib/types/crew";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MapPin, Instagram, Calendar, ArrowLeft, Users } from "lucide-react";
import Image from "next/image";

interface CrewDetailViewProps {
  crew: Crew | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CrewDetailView({ crew, isOpen, onClose }: CrewDetailViewProps) {
  if (!crew) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side='bottom'
        className='h-[80vh] p-0 rounded-t-[10px] z-[10000]'
        closeButtonPosition={{
          top: "1.5rem",
          right: "1rem",
        }}
      >
        <SheetHeader className='relative p-4 pb-2 border-b'>
          <div className='flex items-center justify-between'>
            <button onClick={onClose} className='p-2'>
              <ArrowLeft className='w-5 h-5' />
            </button>
            <SheetTitle className='flex-1 text-lg text-center'>
              {crew.name}
            </SheetTitle>
            <div className='w-9' /> {/* 왼쪽 버튼과 동일한 공간 확보 */}
          </div>
        </SheetHeader>

        <div className='overflow  -y-auto h-[calc(80vh-60px)] p-4'>
          {/* 크루 로고 및 인스타그램 */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-4'>
              {/* 크루 로고 */}
              {crew.logo_image ? (
                <Image
                  src={crew.logo_image}
                  alt={`${crew.name} 로고`}
                  width={64}
                  height={64}
                  className='object-cover rounded-full'
                />
              ) : (
                <div className='flex items-center justify-center w-16 h-16 rounded-full bg-muted'>
                  <span className='text-2xl font-medium text-muted-foreground'>
                    {crew.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className='flex flex-col justify-between h-10'>
                {/* 크루 인스타그램 또는 크루명 */}
                {crew.instagram ? (
                  <a
                    href={`https://www.instagram.com/${crew.instagram.replace(
                      "@",
                      ""
                    )}`}
                    target='_blank'
                    rel='noopener noreferrer nofollow'
                    className='flex items-center gap-1.5 text-blue-600 hover:underline'
                  >
                    <Instagram className='w-5 h-5 text-muted-foreground' />
                    <span>{crew.instagram}</span>
                  </a>
                ) : (
                  <div className='flex items-center gap-1.5 text-lg font-medium'>
                    {crew.name}
                  </div>
                )}
                {/* 크루 개설 일자 */}
                <div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
                  <Calendar className='w-4 h-4' />
                  <span>
                    {new Date(crew.created_at)
                      .toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                      })
                      .replace(".", "년 ")
                      .replace(".", "월")}{" "}
                    개설
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 크루 주요 정보 */}
          <div className='grid gap-4'>
            {/* 활동 지역 */}
            <div className='flex items-start gap-3 p-3 rounded-lg bg-accent/50'>
              <MapPin className='w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5' />
              <div>
                {/* <h3 className='mb-1 font-medium'>주요 활동 지역</h3> */}
                <p className='text-sm text-muted-foreground'>
                  {crew.location.main_address ||
                    crew.location.address ||
                    "활동 지역 정보 없음"}
                </p>
              </div>
            </div>

            {/* 주요 활동 요일 */}
            <div className='flex items-start gap-3 p-3 rounded-lg bg-accent/50'>
              <Calendar className='w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5' />
              <div>
                {/* <h3 className='mb-1 font-medium'>주요 활동 요일</h3> */}
                <p className='text-sm text-muted-foreground'>
                  {crew.activity_day || "활동 요일 정보 없음"}
                </p>
              </div>
            </div>

            {/* 연령대 */}
            <div className='flex items-start gap-3 p-3 rounded-lg bg-accent/50'>
              <Users className='w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5' />
              <div>
                {/* <h3 className='mb-1 font-medium'>모집 연령대</h3> */}
                <p className='text-sm text-muted-foreground'>
                  {crew.age_range || "연령대 정보 없음"}
                </p>
              </div>
            </div>

            {/* 크루 소개 */}
            <div className='p-3 mb-3 rounded-lg bg-accent/50'>
              <h3 className='mb-2 font-medium'>소개글</h3>
              <div className='max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-accent-foreground/40'>
                <p className='text-sm whitespace-pre-wrap text-muted-foreground'>
                  {crew.description || "크루 소개가 없습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
