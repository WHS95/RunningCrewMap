"use client";

import { useState } from "react";
import { runningEvents } from "@/lib/data/events";
import { CITIES, type City } from "@/lib/types/event";
import { formatDate } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar } from "lucide-react";

interface RunningEventListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RunningEventList({ isOpen, onClose }: RunningEventListProps) {
  const [selectedCity, setSelectedCity] = useState<City | "전체">("전체");

  // 날짜순으로 정렬하고 필터링된 이벤트 목록
  const filteredEvents = runningEvents
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
    .filter((event) => selectedCity === "전체" || event.city === selectedCity);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side='bottom' className='h-[80vh] p-0 rounded-t-[10px]'>
        <SheetHeader className='p-4 pb-2 border-b'>
          <SheetTitle>대회 일정</SheetTitle>
        </SheetHeader>

        {/* 필터 */}
        <div className='p-4 border-b bg-background/80 backdrop-blur-md'>
          <div className='flex gap-2 pb-2 overflow-x-auto scrollbar-none'>
            <Button
              variant={selectedCity === "전체" ? "default" : "outline"}
              size='sm'
              onClick={() => setSelectedCity("전체")}
            >
              전체
            </Button>
            {CITIES.map((city) => (
              <Button
                key={city}
                variant={selectedCity === city ? "default" : "outline"}
                size='sm'
                onClick={() => setSelectedCity(city)}
              >
                {city}
              </Button>
            ))}
          </div>
        </div>

        {/* 이벤트 목록 */}
        <div className='overflow-y-auto h-[calc(80vh-8rem)]'>
          {filteredEvents.map((event) => (
            <div
              key={`${event.title}-${event.startDate}`}
              className='p-4 border-b last:border-b-0'
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
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
