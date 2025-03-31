"use client";

import { useState, useMemo, useEffect } from "react";
import { runningEvents } from "@/lib/data/events";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ExternalLink } from "lucide-react";
import { CSS_VARIABLES, LAYOUT } from "@/lib/constants";

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

  // 월별로 그룹화된 이벤트 목록
  const groupedEvents = useMemo(() => {
    const sorted = [...runningEvents].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    if (selectedMonth === "전체") {
      return sorted;
    }

    const monthIndex = MONTHS.indexOf(selectedMonth);
    return sorted.filter(
      (event) => new Date(event.startDate).getMonth() === monthIndex - 1
    );
  }, [selectedMonth]);

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
      className='flex flex-col min-h-screen '
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      {/* 필터 */}
      <div
        className='sticky border-b bg-background/80 backdrop-blur-md'
        style={{ top: LAYOUT.HEADER_HEIGHT }}
      >
        <div className='flex gap-2 p-4 pb-2 overflow-x-auto scrollbar-none'>
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
        <div className='divide-y'>
          {groupedEvents.length > 0 ? (
            groupedEvents.map((event) => (
              <div
                key={`${event.title}-${event.startDate}`}
                className='p-4 transition-colors hover:bg-accent/50'
              >
                <div className='flex items-center justify-between gap-4'>
                  <h3 className='font-medium'>{event.title}</h3>
                  {event.link && (
                    <a
                      href={event.link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 px-2 py-1 text-xs transition-colors rounded-md text-primary hover:bg-primary/10'
                    >
                      <ExternalLink className='w-3 h-3' />
                    </a>
                  )}
                </div>
                <div className='mt-2 space-y-1'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Calendar className='w-4 h-4' />
                    <span>{formatDate(event.startDate)}</span>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <MapPin className='w-4 h-4' />
                    <span>
                      {event.city} {event.location}
                    </span>
                  </div>
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
    </div>
  );
}
