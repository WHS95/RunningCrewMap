"use client";

import { useMemo } from "react";
import { IoShirtOutline, IoThermometerOutline } from "react-icons/io5";
import { GiShorts } from "react-icons/gi";
import { FaPersonRunning } from "react-icons/fa6";
import { CLOTHING_RANGES } from "@/lib/types/clothing";

interface RunningClothingGuideProps {
  currentTemp: number;
}

const ICONS = {
  IoShirtOutline,
  GiShorts,
  FaPersonRunning,
} as const;

export function RunningClothingGuide({
  currentTemp,
}: RunningClothingGuideProps) {
  // 현재 온도에 해당하는 복장 범위 찾기
  const currentRange = useMemo(() => {
    return CLOTHING_RANGES.find(
      (range) => currentTemp >= range.minTemp && currentTemp <= range.maxTemp
    );
  }, [currentTemp]);

  // 온도에 따른 색상 설정
  const getTemperatureColor = (temp: number) => {
    if (temp >= 30) return "text-red-500";
    if (temp >= 20) return "text-orange-500";
    if (temp >= 10) return "text-yellow-500";
    if (temp >= 0) return "text-blue-400";
    return "text-blue-600";
  };

  return (
    <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-3'>
      {CLOTHING_RANGES.map((range) => {
        const isCurrentRange = currentRange === range;
        const tempColor = getTemperatureColor(range.minTemp);

        return (
          <div
            key={range.description}
            className={`p-4 rounded-lg transition-colors ${
              isCurrentRange
                ? "bg-primary/20 ring-2 ring-primary"
                : "bg-accent/50"
            }`}
          >
            <div className='flex items-center justify-between mb-2'>
              <span className='font-medium'>
                {range.maxTemp === Infinity
                  ? `${range.minTemp}°C 이상`
                  : range.minTemp === -Infinity
                  ? `${range.maxTemp}°C 이하`
                  : `${range.minTemp}~${range.maxTemp}°C`}
              </span>
              <IoThermometerOutline className={`w-5 h-5 ${tempColor}`} />
            </div>
            <div className='flex flex-wrap gap-3'>
              {range.items.map((item) => {
                const Icon = ICONS[item.icon as keyof typeof ICONS];
                return (
                  <div
                    key={item.name}
                    className='flex flex-col items-center'
                    title={item.description}
                  >
                    <Icon className='w-6 h-6' />
                    <span className='text-xs text-muted-foreground'>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
