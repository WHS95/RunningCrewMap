"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  ExternalLink,
  Award,
  Gift,
  CreditCard,
  Info,
} from "lucide-react";
import { CSS_VARIABLES, LAYOUT } from "@/lib/constants";
import { marathonService } from "@/lib/services/marathon.service";
import type { MarathonEvent } from "@/lib/types/marathon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// 월 이름 상수
const MONTHS = [
  "전체",
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
] as const;

type Month = (typeof MONTHS)[number];

export default function EventsPage() {
  // 현재 월을 계산
  const getCurrentMonth = useMemo(() => {
    const now = new Date();
    const monthIndex = now.getMonth() + 1; // JavaScript는 0부터 월을 시작하므로 +1
    return MONTHS[monthIndex] as Month; // 현재 월에 해당하는 "N월" 형식 반환
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<Month>(getCurrentMonth);
  const [selectedEvent, setSelectedEvent] = useState<MarathonEvent | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 월별로 그룹화된 이벤트 목록
  const groupedEvents = useMemo(() => {
    const monthIndex = MONTHS.indexOf(selectedMonth);
    return marathonService.getMarathonEventsByMonth(monthIndex);
  }, [selectedMonth]);

  // 이벤트 상세 정보 다이얼로그를 열기
  const handleEventClick = (event: MarathonEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  // 현재 월이 변경되면 자동 스크롤
  useEffect(() => {
    // 현재 선택된 월 버튼으로 스크롤
    const buttons = document.querySelectorAll("button");
    const selectedButton = Array.from(buttons).find(
      (button) => button.textContent === selectedMonth
    );

    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedMonth]);

  return (
    <div
      className='flex flex-col min-h-screen'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 필터 */}
      <div
        className='sticky backdrop-blur-md'
        style={{ top: LAYOUT.HEADER_HEIGHT }}
      >
        <div className='flex gap-2 p-4 pb-2 overflow-x-auto scrollbar-hide'>
          {MONTHS.map((month) => (
            <Button
              key={month}
              variant={selectedMonth === month ? "default" : "outline"}
              size='sm'
              onClick={() => setSelectedMonth(month)}
            >
              {month}
            </Button>
          ))}
        </div>
      </div>

      {/* 이벤트 목록 */}
      <div className='flex-1'>
        <div className=''>
          {groupedEvents.length > 0 ? (
            groupedEvents.map((event) => (
              <div
                key={`${event.eventName}-${event.date}`}
                className='p-4 transition-colors cursor-pointer hover:bg-accent/50'
                onClick={() => handleEventClick(event)}
              >
                <div className='flex items-center justify-between gap-4'>
                  <h3 className='font-medium'>{event.eventName}</h3>
                  <div className='flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md cursor-pointer text-primary hover:bg-primary/10'>
                    <span>상세보기</span>
                    <Info className='w-4 h-4' />
                  </div>
                </div>
                <div className='mt-2 space-y-1'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Calendar className='w-4 h-4' />
                    <span>{event.date}</span>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <MapPin className='w-4 h-4' />
                    <span>{event.location}</span>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Award className='w-4 h-4' />
                    <span>{event.courses}</span>
                  </div>
                  {event.eventHomepage && (
                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                      <ExternalLink className='w-4 h-4' />
                      <a
                        href={event.eventHomepage}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary hover:underline'
                        onClick={(e) => e.stopPropagation()}
                      >
                        대회 홈페이지
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className='p-8 text-center text-muted-foreground'>
              해당 월에 예정된 대회가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 이벤트 상세 정보 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className='text-xl'>
                  {selectedEvent.eventName}
                </DialogTitle>
                <DialogDescription className='text-base'>
                  {selectedEvent.date}
                </DialogDescription>
              </DialogHeader>
              <div className='py-4 space-y-3'>
                <div className='flex items-start gap-3'>
                  <MapPin className='w-5 h-5 mt-0.5 text-primary' />
                  <div>
                    <p className='font-medium'>장소</p>
                    <p className='text-muted-foreground'>
                      {selectedEvent.location}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <Award className='w-5 h-5 mt-0.5 text-primary' />
                  <div>
                    <p className='font-medium'>코스</p>
                    <p className='text-muted-foreground'>
                      {selectedEvent.courses}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <Info className='w-5 h-5 mt-0.5 text-primary' />
                  <div>
                    <p className='font-medium'>주최</p>
                    <p className='text-muted-foreground'>
                      {selectedEvent.organizer}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <Gift className='w-5 h-5 mt-0.5 text-primary' />
                  <div>
                    <p className='font-medium'>증정품</p>
                    <p className='text-muted-foreground'>
                      {selectedEvent.giveaways || "정보 없음"}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3'>
                  <CreditCard className='w-5 h-5 mt-0.5 text-primary' />
                  <div>
                    <p className='font-medium'>참가비</p>
                    <p className='text-muted-foreground'>
                      {selectedEvent.registrationFee || "정보 없음"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedEvent.eventHomepage && (
                <div className='flex justify-end'>
                  <a
                    href={selectedEvent.eventHomepage}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90'
                  >
                    대회 홈페이지 <ExternalLink className='w-4 h-4' />
                  </a>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
