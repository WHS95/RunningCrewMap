"use client";

import { useState } from "react";
import type { Crew } from "@/lib/types/crew";
import { JoinMethod } from "@/lib/types/crew";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MapPin,
  Instagram,
  Calendar,
  ArrowLeft,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";

interface CrewDetailViewProps {
  crew: Crew | null;
  isOpen: boolean;
  onClose: () => void;
}

// Crew 타입 확장
declare module "@/lib/types/crew" {
  interface Crew {
    join_methods?: JoinMethod[];
    photos?: string[];
  }
}

type TabType = "info" | "photos";

export function CrewDetailView({ crew, isOpen, onClose }: CrewDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [expandedLocation, setExpandedLocation] = useState(false);

  // 활동 지역 텍스트가 길어서 더보기가 필요한지 확인하는 함수
  const isLocationLong = () => {
    if (!crew?.activity_locations || crew.activity_locations.length === 0)
      return false;
    const locationText = crew.activity_locations.join(", ");
    return locationText.length > 30; // 대략적인 기준, 필요에 따라 조정 가능
  };

  // isOpen이 false면 null을 반환하지 말고, SheetContent가 열리지 않도록 함
  if (!crew) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        {isOpen && (
          <SheetContent
            side='bottom'
            className='h-[85vh] p-0 rounded-t-[10px] overflow-hidden z-[10000] bg-background text-cart-ink md:w-[430px] md:left-[calc(50vw-215px)] md:right-auto md:rounded-[4px] md:border md:border-cart-rule md:shadow-2xl'
          >
            <div className='flex items-center justify-center flex-1 h-full'>
              <div className='text-center'>
                <div className='w-10 h-10 mx-auto mb-4 border-4 rounded-full border-primary border-t-transparent animate-spin'></div>
                <p className='text-gray-500 dark:text-gray-400'>
                  크루 정보를 불러오는 중...
                </p>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      {isOpen && (
        <SheetContent
          side='bottom'
          className='h-[85vh] p-0 rounded-t-[10px] overflow-hidden z-[10000] bg-background text-cart-ink md:w-[430px] md:left-[calc(50vw-215px)] md:right-auto md:rounded-[4px] md:border md:border-cart-rule md:shadow-2xl'
          closeButtonPosition={{
            top: "1.5rem",
            right: "1rem",
          }}
        >
          <SheetHeader className='relative p-4 pb-3 border-b border-cart-rule'>
            <div className='flex items-center justify-between'>
              <button
                onClick={onClose}
                className='w-9 h-9 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center active:scale-95 transition-transform'
              >
                <ArrowLeft className='w-4 h-4 text-cart-ink' />
              </button>
              <div className='flex-1 text-center'>
                <div className='font-mono text-[9px] tracking-[0.22em] text-[hsl(var(--lime))] font-semibold uppercase mb-0.5'>
                  · CREW
                </div>
                <SheetTitle className='font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink'>
                  {crew.name}
                </SheetTitle>
              </div>
              <div className='w-9' />
            </div>
          </SheetHeader>

          {/* 탭 네비게이션 */}
          <div className='flex border-b border-cart-rule'>
            <button
              className={`flex-1 py-3 text-center font-mono text-[10px] tracking-[0.22em] uppercase ${
                activeTab === "info"
                  ? "text-[hsl(var(--lime))] border-b border-[hsl(var(--lime))] font-semibold"
                  : "text-cart-ink-60"
              }`}
              onClick={() => setActiveTab("info")}
            >
              INFO · 정보
            </button>
            <button
              className={`flex-1 py-3 text-center font-mono text-[10px] tracking-[0.22em] uppercase ${
                activeTab === "photos"
                  ? "text-[hsl(var(--lime))] border-b border-[hsl(var(--lime))] font-semibold"
                  : "text-cart-ink-60"
              }`}
              onClick={() => setActiveTab("photos")}
            >
              PHOTOS · 사진
            </button>
          </div>

          <div className='overflow-y-auto h-[calc(85vh-100px)] pb-3'>
            {activeTab === "info" && (
              <div className='p-3 pb-8 space-y-4'>
                {/* 크루 로고 및 인스타그램 */}
                <div className='flex items-center gap-3 mb-1'>
                  {/* 크루 로고 */}
                  {crew.logo_image ? (
                    <Image
                      src={crew.logo_image}
                      alt={`${crew.name} 로고`}
                      width={56}
                      height={56}
                      quality={20}
                      className='object-cover rounded-[4px] w-14 h-14 border border-cart-rule'
                      style={{ width: "56px", height: "56px" }}
                    />
                  ) : (
                    <div className='flex items-center justify-center rounded-[4px] w-14 h-14 bg-cart-paper border border-cart-rule'>
                      <span className='font-display text-xl font-bold text-[hsl(var(--lime))]'>
                        {crew.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className='flex flex-col justify-center h-14'>
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
                        <Instagram className='w-4 h-4 text-muted-foreground' />
                        <span>{crew.instagram}</span>
                      </a>
                    ) : (
                      <div className='flex items-center gap-1.5 text-lg font-medium'>
                        {crew.name}
                      </div>
                    )}
                    {/* 크루 개설 일자 */}
                    <div className='flex items-center gap-1 text-xs text-muted-foreground mt-0.5'>
                      <Calendar className='w-3 h-3' />
                      <span>
                        {new Date(crew.founded_date || crew.created_at)
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

                {/* 크루 정보 요약 - 세로 배치로 변경 */}
                <div className='grid grid-cols-1 gap-2'>
                  {/* 활동 지역 */}
                  <div className='flex items-start gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule'>
                    <MapPin className='w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5' />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <p className='mr-1 text-xs font-medium'>활동 지역</p>
                        {isLocationLong() && (
                          <button
                            className='flex items-center text-xs text-primary'
                            onClick={() =>
                              setExpandedLocation(!expandedLocation)
                            }
                          >
                            {expandedLocation ? (
                              <>
                                <span className='mr-0.5'>접기</span>
                                <ChevronUp size={12} />
                              </>
                            ) : (
                              <>
                                <span className='mr-0.5'>더보기</span>
                                <ChevronDown size={12} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {crew.activity_locations &&
                      crew.activity_locations.length > 0 ? (
                        <p
                          className={`text-xs text-muted-foreground ${
                            expandedLocation ? "" : "line-clamp-1"
                          }`}
                        >
                          {crew.activity_locations.join(", ")}
                        </p>
                      ) : (
                        <p className='text-xs text-muted-foreground'>
                          정보 없음
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 주요 활동 요일 */}
                  <div className='flex items-center gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule'>
                    <Calendar className='flex-shrink-0 w-4 h-4 text-muted-foreground' />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center'>
                        <p className='mr-1 text-xs font-medium'>활동 요일</p>
                      </div>
                      <p className='text-xs text-muted-foreground line-clamp-1'>
                        {crew.activity_day || "정보 없음"}
                      </p>
                    </div>
                  </div>

                  {/* 연령대 */}
                  <div className='flex items-center gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule'>
                    <Users className='flex-shrink-0 w-4 h-4 text-muted-foreground' />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center'>
                        <p className='mr-1 text-xs font-medium'>연령대</p>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {crew.age_range || "정보 없음"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 가입 방식 (링크) */}
                <div className='p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule'>
                  <h3 className='mb-1.5 text-sm font-medium flex items-center gap-1'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='text-muted-foreground'
                    >
                      <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'></path>
                      <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'></path>
                    </svg>
                    가입 방식
                  </h3>
                  <div className='flex gap-2 mt-1'>
                    {crew.join_methods?.some(
                      (method) => method.method_type === "instagram_dm"
                    ) &&
                      crew.instagram && (
                        <a
                          href='#'
                          className='flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase font-semibold px-3.5 py-2 rounded-[4px] bg-cart-paper border border-cart-rule text-cart-ink hover:border-[hsl(var(--lime))]/40 active:scale-95 transition-transform'
                          onClick={(e) => {
                            e.preventDefault();
                            if (crew?.instagram) {
                              window.open(
                                `https://www.instagram.com/${crew.instagram.replace(
                                  "@",
                                  ""
                                )}`,
                                "_blank"
                              );
                            }
                          }}
                        >
                          <Instagram className='w-3.5 h-3.5' />
                          인스타그램 DM
                        </a>
                      )}
                    {(crew.join_methods?.find(
                      (method) => method.method_type === "other"
                    ) ||
                      crew.join_methods?.find(
                        (method) => method.method_type === "open_chat"
                      )) && (
                      <a
                        href='#'
                        className='flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase font-semibold px-3.5 py-2 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] active:scale-95 transition-transform'
                        onClick={(e) => {
                          e.preventDefault();
                          const otherMethod =
                            crew.join_methods?.find(
                              (method) => method.method_type === "other"
                            ) ||
                            crew.join_methods?.find(
                              (method) => method.method_type === "open_chat"
                            );
                          if (otherMethod?.link_url) {
                            window.open(otherMethod.link_url, "_blank");
                          }
                        }}
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='14'
                          height='14'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          className='w-3.5 h-3.5'
                        >
                          <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
                          <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
                        </svg>
                        기타 방식
                      </a>
                    )}
                  </div>
                </div>

                {/* 크루 소개 */}
                <div className='p-2 mb-3 rounded-[4px] bg-cart-paper border border-cart-rule'>
                  <h3 className='mb-1 text-sm font-medium'>소개글</h3>
                  <div className='max-h-[35vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-accent-foreground/40'>
                    <p className='pb-1 text-xs whitespace-pre-wrap text-muted-foreground'>
                      {crew.description || "크루 소개가 없습니다."}
                    </p>
                  </div>
                </div>

                {/* 하단 여백 확보를 위한 빈 공간 */}
                <div className='h-4'></div>
              </div>
            )}

            {activeTab === "photos" && (
              <div className='p-4 pb-8'>
                <div className='mb-4'>
                  <div className='font-mono text-[9px] tracking-[0.22em] text-[hsl(var(--lime))] font-semibold mb-1'>
                    · CREW · PHOTOS
                  </div>
                  <h3 className='font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink'>
                    대표 사진
                  </h3>
                </div>

                {crew.photos && crew.photos.length > 0 ? (
                  <div className='relative w-full overflow-hidden rounded-[4px] border border-cart-rule aspect-square bg-cart-paper'>
                    <Image
                      src={crew.photos[0]}
                      alt={`${crew.name} 대표 사진`}
                      fill
                      sizes='(max-width: 768px) 100vw, 430px'
                      className='object-cover'
                      quality={70}
                      priority
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div className='relative w-full overflow-hidden rounded-[4px] border border-cart-rule bg-cart-paper aspect-square'>
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='font-mono text-[10px] tracking-[0.2em] text-cart-ink-60 uppercase'>
                        · 사진 준비 중 ·
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
