"use client";

import { useState } from "react";
import { FormLayout } from "@/components/layout/FormLayout";
import {
  timeToSeconds,
  secondsToTimeString,
  validateTimeInputs,
  predictFinishTime,
  calculatePace,
  COMMON_DISTANCES,
} from "@/lib/utils/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function PredictionCalculatorPage() {
  const { toast } = useToast();
  const [recordedDistance, setRecordedDistance] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [seconds, setSeconds] = useState<string>("");
  const [targetDistance, setTargetDistance] = useState<string>("");
  const [result, setResult] = useState<{
    time: string;
    pace: string;
  } | null>(null);

  const handleCalculate = () => {
    // 입력값 검증
    const distance = parseFloat(recordedDistance);
    const targetDist = parseFloat(targetDistance);
    const inputHours = parseInt(hours || "0");
    const inputMinutes = parseInt(minutes || "0");
    const inputSeconds = parseInt(seconds || "0");

    if (!distance || distance <= 0) {
      toast({
        description: "올바른 거리를 입력해주세요.",
        duration: 2000,
      });
      return;
    }

    if (!validateTimeInputs(inputHours, inputMinutes, inputSeconds)) {
      toast({
        description: "올바른 시간을 입력해주세요.",
        duration: 2000,
      });
      return;
    }

    // 계산
    const totalSeconds = timeToSeconds(inputHours, inputMinutes, inputSeconds);
    const predictedSeconds = predictFinishTime(
      distance,
      totalSeconds,
      targetDist
    );
    const pace = calculatePace(targetDist, predictedSeconds);

    setResult({
      time: secondsToTimeString(predictedSeconds),
      pace: pace,
    });
  };

  return (
    <FormLayout title='완주 시간 예측기'>
      <div className='space-y-6'>
        {/* 설명 */}
        <div className='p-4 text-sm rounded-lg bg-accent/50'>
          <p className='text-muted-foreground'>
            이전에 달린 기록을 바탕으로 다른 거리의 예상 완주 시간을 계산합니다.
            <br />
            예를 들어, 10km를 60분에 달렸다면 하프마라톤(21.1km)은 얼마나 걸릴지
            예측할 수 있습니다.
          </p>
        </div>

        {/* 입력 폼 */}
        <div className='space-y-4'>
          {/* 기록한 거리 선택 */}
          <div>
            <label className='block mb-2 text-sm font-medium'>
              기록한 거리 (km)
            </label>
            <Select
              value={recordedDistance}
              onValueChange={setRecordedDistance}
            >
              <SelectTrigger>
                <SelectValue placeholder='거리 선택' />
              </SelectTrigger>
              <SelectContent>
                {COMMON_DISTANCES.map((distance) => (
                  <SelectItem
                    key={distance.value}
                    value={distance.value.toString()}
                  >
                    {distance.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 기록 시간 입력 */}
          <div>
            <label className='block mb-2 text-sm font-medium'>기록 시간</label>
            <div className='relative flex items-center gap-1'>
              <div className='flex-1'>
                <Input
                  type='number'
                  min='0'
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder='0'
                  className='text-center'
                />
                <span className='block mt-1 text-xs text-center text-muted-foreground'>
                  시
                </span>
              </div>
              <span className='text-xl text-muted-foreground'>:</span>
              <div className='flex-1'>
                <Input
                  type='number'
                  min='0'
                  max='59'
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder='0'
                  className='text-center'
                />
                <span className='block mt-1 text-xs text-center text-muted-foreground'>
                  분
                </span>
              </div>
              <span className='text-xl text-muted-foreground'>:</span>
              <div className='flex-1'>
                <Input
                  type='number'
                  min='0'
                  max='59'
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  placeholder='0'
                  className='text-center'
                />
                <span className='block mt-1 text-xs text-center text-muted-foreground'>
                  초
                </span>
              </div>
            </div>
          </div>

          {/* 목표 거리 선택 */}
          <div>
            <label className='block mb-2 text-sm font-medium'>
              목표 거리 (km)
            </label>
            <Select value={targetDistance} onValueChange={setTargetDistance}>
              <SelectTrigger>
                <SelectValue placeholder='거리 선택' />
              </SelectTrigger>
              <SelectContent>
                {COMMON_DISTANCES.map((distance) => (
                  <SelectItem
                    key={distance.value}
                    value={distance.value.toString()}
                  >
                    {distance.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCalculate} className='w-full'>
            계산하기
          </Button>
        </div>

        {/* 결과 */}
        {result && (
          <div className='mt-6'>
            <div className='flex items-center gap-2 mb-4'>
              <h2 className='text-lg font-medium'>
                {COMMON_DISTANCES.find(
                  (d) => d.value.toString() === targetDistance
                )?.label || `${targetDistance}km`}{" "}
                예상 완주 시간
              </h2>
              <div className='relative group'>
                <div className='cursor-help text-muted-foreground'>ⓘ</div>
                <div className='absolute bottom-full mb-2 p-3 text-sm bg-popover text-popover-foreground rounded-lg shadow-lg invisible group-hover:visible w-[280px] left-1/2 -translate-x-1/2'>
                  <p>Riegel의 레이스 타임 공식을 사용</p>
                  <p className='mt-1 font-mono text-xs'>
                    T2 = T1 × (D2/D1)^1.06
                  </p>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    T1: 기록한 시간, D1: 기록한 거리
                    <br />
                    T2: 예상 시간, D2: 목표 거리
                  </p>
                </div>
              </div>
            </div>
            <div className='overflow-hidden border rounded-lg'>
              <table className='w-full'>
                <tbody className='divide-y'>
                  <tr>
                    <td className='px-4 py-3 font-medium'>예상 시간</td>
                    <td className='px-4 py-3'>{result.time}</td>
                  </tr>
                  <tr>
                    <td className='px-4 py-3 font-medium'>평균 페이스</td>
                    <td className='px-4 py-3'>{result.pace}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FormLayout>
  );
}
