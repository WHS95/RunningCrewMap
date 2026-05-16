"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  MapPin,
  ExternalLink,
  Award,
  Gift,
  CreditCard,
  Info,
} from "lucide-react";
import { CSS_VARIABLES, LAYOUT } from "@/lib/constants";
import type { MarathonEvent } from "@/lib/types/marathon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CartographicHeader,
  KickerLabel,
  TagPill,
} from "@/components/design/cartographic";
import { cn } from "@/lib/utils";

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

interface EventsClientProps {
  allEvents: MarathonEvent[];
  initialMonth: number; // 1-12 for current month
}

export default function EventsClient({
  allEvents,
  initialMonth,
}: EventsClientProps) {
  const defaultMonth = MONTHS[initialMonth] as Month;

  const [selectedMonth, setSelectedMonth] = useState<Month>(defaultMonth);
  const [selectedEvent, setSelectedEvent] = useState<MarathonEvent | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 월별로 그룹화된 이벤트 목록
  const groupedEvents = useMemo(() => {
    const monthIndex = MONTHS.indexOf(selectedMonth);
    if (monthIndex === 0) return allEvents; // "전체"

    return allEvents.filter((event) => {
      const dateString = event.date.split(" ")[0]; // "5/17"
      const eventMonth = parseInt(dateString.split("/")[0]);
      return eventMonth === monthIndex;
    });
  }, [selectedMonth, allEvents]);

  // 이벤트 상세 정보 다이얼로그를 열기 - 메모이제이션으로 최적화
  const handleEventClick = useCallback((event: MarathonEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  }, []);

  // 다이얼로그 닫기 핸들러
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  }, []);

  // 현재 월이 변경되면 자동 스크롤 - 성능 최적화
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const monthFilterContainer = document.querySelector(
        "[data-month-filter]"
      );
      if (!monthFilterContainer) return;

      const selectedButton = monthFilterContainer.querySelector(
        `button[data-month="${selectedMonth}"]`
      );

      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedMonth]);

  // Group events by month for cartographic layout
  const eventsByMonth = useMemo(() => {
    const grouped: Record<number, MarathonEvent[]> = {};
    groupedEvents.forEach((event) => {
      const dateString = event.date.split(" ")[0];
      const month = parseInt(dateString.split("/")[0]);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(event);
    });
    return grouped;
  }, [groupedEvents]);

  return (
    <div
      className='flex flex-col min-h-screen bg-background'
      style={{
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      <CartographicHeader
        kicker={`2026 SEASON · ${allEvents.length} EVENTS`}
        title="대회 일정"
      />

      {/* Month filter chips */}
      <div
        className='sticky backdrop-blur-md bg-background/85 z-20'
        style={{ top: LAYOUT.HEADER_HEIGHT }}
      >
        <div
          className='flex gap-1.5 px-[18px] pb-3 overflow-x-auto scrollbar-hide border-b border-cart-rule'
          data-month-filter
        >
          {MONTHS.map((month) => {
            const active = selectedMonth === month;
            const label = month === "전체" ? "ALL" : month.replace("월", "").padStart(2, "0");
            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                data-month={month}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-[4px] border",
                  "font-mono text-[10px] font-semibold tracking-[0.12em] uppercase",
                  "transition-all active:scale-95",
                  active
                    ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
                    : "text-cart-ink-60 border-cart-rule"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events list grouped by month */}
      <div className='flex-1 px-[22px] pb-24'>
        {groupedEvents.length > 0 ? (
          Object.entries(eventsByMonth).map(([month, events]) => {
            const monthEn = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][parseInt(month)];
            return (
              <div key={month} className='mb-7'>
                <div className='flex items-baseline gap-3 mb-3 mt-5'>
                  <span className='font-display text-[40px] font-bold text-[hsl(var(--lime))] tracking-[-0.04em] leading-[0.85]'>
                    {month.padStart(2, "0")}
                  </span>
                  <KickerLabel tone="muted" className='tracking-[0.2em]'>
                    {monthEn} · 2026
                  </KickerLabel>
                  <div className='flex-1 h-px bg-cart-rule mb-2' />
                </div>
                {events.map((event, idx) => {
                  // Estimate D-day
                  const dateStr = event.date.split(" ")[0];
                  const [m, d] = dateStr.split("/").map((n) => parseInt(n));
                  const now = new Date();
                  const target = new Date(now.getFullYear(), m - 1, d);
                  if (target < now) target.setFullYear(target.getFullYear() + 1);
                  const diffDays = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  const hot = diffDays <= 14 && diffDays > 0;
                  return (
                    <div
                      key={`${event.eventName}-${event.date}`}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        "flex items-center gap-3 py-3 cursor-pointer active:bg-white/[0.02]",
                        idx === 0 ? "" : "border-t border-cart-rule"
                      )}
                    >
                      <div className='w-14 flex-shrink-0'>
                        <span className='font-mono text-[11px] tracking-[0.08em] text-cart-ink tabular-nums'>
                          {String(d).padStart(2, "0")} {monthEn}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-1.5 mb-1'>
                          <span className='text-[14px] font-semibold text-cart-ink truncate'>
                            {event.eventName}
                          </span>
                          {hot && (
                            <span className='size-1.5 rounded-full bg-[hsl(var(--lime))] shadow-[0_0_0_3px_hsl(var(--lime)/0.25)] flex-shrink-0' />
                          )}
                        </div>
                        <div className='font-mono text-[9px] tracking-[0.08em] text-cart-ink-60 truncate'>
                          {event.location} · {event.courses}
                        </div>
                      </div>
                      <TagPill variant={hot ? "solid" : "ghost"}>
                        D-{diffDays}
                      </TagPill>
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          <KickerLabel tone="muted" className='text-center py-12 tracking-[0.18em]'>
            · NO EVENTS THIS MONTH ·
          </KickerLabel>
        )}
      </div>

      {/* 이벤트 상세 정보 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
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
