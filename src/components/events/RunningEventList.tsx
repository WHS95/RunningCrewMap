"use client";

import { useState } from "react";
import { CITIES, type City } from "@/lib/types/event";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar } from "lucide-react";
import { marathonService } from "@/lib/services/marathon.service";

interface RunningEventListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RunningEventList({ isOpen, onClose }: RunningEventListProps) {
  const [selectedCity, setSelectedCity] = useState<City | "전체">("전체");

  // 날짜순으로 정렬하고 필터링된 이벤트 목록
  const filteredEvents = marathonService
    .getMarathonEvents()
    .sort((a, b) => {
      // date 포맷이 "5/17 (토)" 형식이므로 현재 연도를 추가하여 날짜 형식으로 변환
      const currentYear = new Date().getFullYear();

      const aDateString = a.date.split(" ")[0]; // "5/17"
      const [aMonth, aDay] = aDateString.split("/");
      const aFormattedDate = `${currentYear}-${aMonth.padStart(
        2,
        "0"
      )}-${aDay.padStart(2, "0")}`;

      const bDateString = b.date.split(" ")[0]; // "5/17"
      const [bMonth, bDay] = bDateString.split("/");
      const bFormattedDate = `${currentYear}-${bMonth.padStart(
        2,
        "0"
      )}-${bDay.padStart(2, "0")}`;

      return (
        new Date(aFormattedDate).getTime() - new Date(bFormattedDate).getTime()
      );
    })
    .filter((event) => {
      if (selectedCity === "전체") return true;
      // 지역 정보에서 도시 추출 (쉼표 앞 부분)
      const city = event.location.split(",")[0].trim();
      return city === selectedCity;
    });

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
              key={`${event.eventName}-${event.date}`}
              className='p-4 border-b last:border-b-0'
            >
              <h3 className='font-medium'>{event.eventName}</h3>
              <div className='mt-2 space-y-1'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Calendar className='w-4 h-4' />
                  <span>{event.date}</span>
                </div>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <MapPin className='w-4 h-4' />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
