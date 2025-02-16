"use client";

import { useState } from "react";
import { FormLayout } from "@/components/layout/FormLayout";
import {
  calculateMaxHeartRate,
  calculateHeartRateZones,
  type HeartRateZone,
} from "@/lib/utils/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// 존별 색상 정의
const ZONE_COLORS = {
  1: "from-blue-500/20 to-blue-500/30 hover:from-blue-500/30 hover:to-blue-500/40",
  2: "from-green-500/20 to-green-500/30 hover:from-green-500/30 hover:to-green-500/40",
  3: "from-yellow-500/20 to-yellow-500/30 hover:from-yellow-500/30 hover:to-yellow-500/40",
  4: "from-orange-500/20 to-orange-500/30 hover:from-orange-500/30 hover:to-orange-500/40",
  5: "from-red-500/20 to-red-500/30 hover:from-red-500/30 hover:to-red-500/40",
} as const;

export default function HeartRateCalculatorPage() {
  const { toast } = useToast();
  const [age, setAge] = useState<string>("");
  const [results, setResults] = useState<HeartRateZone[]>([]);
  const [maxHR, setMaxHR] = useState<number | null>(null);

  const handleCalculate = () => {
    const ageNum = parseInt(age);
    if (!ageNum || ageNum <= 0 || ageNum > 120) {
      toast({
        description: "올바른 나이를 입력해주세요 (1-120).",
        duration: 2000,
      });
      return;
    }

    const calculatedMaxHR = calculateMaxHeartRate(ageNum);
    const zones = calculateHeartRateZones(ageNum);

    setMaxHR(calculatedMaxHR);
    setResults(zones);
  };

  return (
    <FormLayout title='심박수 존 계산기'>
      <div className='max-w-md mx-auto space-y-6'>
        {/* 입력 폼 */}
        <div className='space-y-4'>
          <div>
            <label className='block mb-2 text-sm font-medium'>
              나이
              <span className='ml-1 text-muted-foreground'>(세)</span>
            </label>
            <Input
              type='number'
              min='1'
              max='120'
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder='30'
            />
          </div>

          <Button onClick={handleCalculate} className='w-full'>
            계산하기
          </Button>
        </div>

        {/* 결과 */}
        {results.length > 0 && maxHR && (
          <div className='mt-6'>
            <div className='flex items-center gap-2 mb-4'>
              <h2 className='text-lg font-medium'>트레이닝 존</h2>
              <div className='relative group'>
                <div className='cursor-help text-muted-foreground'>ⓘ</div>
                <div className='absolute bottom-full mb-2 p-3 text-sm bg-popover text-popover-foreground rounded-lg shadow-lg invisible group-hover:visible w-[280px] left-1/2 -translate-x-1/2'>
                  <p>최대 심박수 계산 공식:</p>
                  <p className='mt-1 font-mono text-xs'>220 - 나이</p>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    각 존은 최대 심박수의 비율로 계산됩니다.
                    <br />
                    이는 일반적인 추정치이며, 개인차가 있을 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className='p-3 mb-4 rounded-lg bg-gradient-to-r from-primary/20 to-primary/30'>
              <div className='font-medium'>예상 최대 심박수</div>
              <div className='mt-1 text-2xl'>
                {maxHR}{" "}
                <span className='text-sm text-muted-foreground'>bpm</span>
              </div>
            </div>

            <div className='grid gap-2'>
              {results.map((zone) => (
                <div
                  key={zone.zone}
                  className={cn(
                    "relative p-3 rounded-lg bg-gradient-to-r transition-all duration-200 group/zone",
                    ZONE_COLORS[zone.zone as keyof typeof ZONE_COLORS]
                  )}
                >
                  <div className='flex items-center gap-3'>
                    <div className='flex items-center justify-center w-6 h-6 text-sm font-medium rounded-full bg-background/80'>
                      {zone.zone}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <div className='font-medium'>{zone.name}</div>
                        <div className='text-sm tabular-nums'>
                          {zone.min}-{zone.max}
                          <span className='ml-1 text-muted-foreground'>
                            bpm
                          </span>
                        </div>
                      </div>
                      <p className='mt-0.5 text-xs text-muted-foreground line-clamp-1 group-hover/zone:line-clamp-none'>
                        {zone.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormLayout>
  );
}
