"use client";

import { useState, useMemo } from "react";
import { runningEvents } from "@/lib/data/events";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar } from "lucide-react";

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
  const [selectedMonth, setSelectedMonth] = useState<Month>("전체");

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

  return (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      {/* 필터 */}
      <div className='sticky top-0 p-4 border-b bg-background/80 backdrop-blur-md'>
        <div className='flex gap-2 pb-2 overflow-x-auto scrollbar-none'>
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
      <div className='flex-1 overflow-y-auto'>
        <div className='divide-y'>
          {groupedEvents.length > 0 ? (
            groupedEvents.map((event) => (
              <div
                key={`${event.title}-${event.startDate}`}
                className='p-4 transition-colors hover:bg-accent/50'
              >
                <h3 className='font-medium'>{event.title}</h3>
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
