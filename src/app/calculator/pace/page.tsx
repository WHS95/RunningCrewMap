"use client";

import { useState } from "react";
import { FormLayout } from "@/components/layout/FormLayout";
import {
  timeToSeconds,
  validateTimeInputs,
  calculatePacePerKm,
} from "@/lib/utils/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type CalculatorMode = "pace" | "distance" | "time";

export default function PaceCalculatorPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<CalculatorMode>("pace");
  const [distance, setDistance] = useState<string>("10");
  const [hours, setHours] = useState<string>("1");
  const [minutes, setMinutes] = useState<string>("30");
  const [seconds, setSeconds] = useState<string>("0");
  const [paceMinutes, setPaceMinutes] = useState<string>("5");
  const [paceSeconds, setPaceSeconds] = useState<string>("0");
  const [results, setResults] = useState<{
    pace?: string;
    distance?: string;
    time?: string;
    speed?: string;
  } | null>(null);

  const handleCalculate = () => {
    const targetHours = parseInt(hours || "0");
    const targetMinutes = parseInt(minutes || "0");
    const targetSeconds = parseInt(seconds || "0");
    const targetPaceMinutes = parseInt(paceMinutes || "0");
    const targetPaceSeconds = parseInt(paceSeconds || "0");
    const targetDistance = parseFloat(distance);

    if (mode === "pace") {
      // 거리와 시간으로 페이스 계산
      if (!targetDistance || targetDistance <= 0) {
        toast({
          description: "올바른 거리를 입력해주세요.",
          duration: 2000,
        });
        return;
      }

      if (!validateTimeInputs(targetHours, targetMinutes, targetSeconds)) {
        toast({
          description: "올바른 시간을 입력해주세요.",
          duration: 2000,
        });
        return;
      }

      const totalSeconds = timeToSeconds(
        targetHours,
        targetMinutes,
        targetSeconds
      );
      const pacePerKm = calculatePacePerKm(targetDistance, totalSeconds);
      const speed = ((targetDistance / totalSeconds) * 3600).toFixed(1);

      setResults({
        pace: `${pacePerKm}/km`,
        speed: `${speed} km/h`,
      });
    } else if (mode === "distance") {
      // 페이스와 시간으로 거리 계산
      if (!validateTimeInputs(targetHours, targetMinutes, targetSeconds)) {
        toast({
          description: "올바른 시간을 입력해주세요.",
          duration: 2000,
        });
        return;
      }

      if (!validateTimeInputs(0, targetPaceMinutes, targetPaceSeconds)) {
        toast({
          description: "올바른 페이스를 입력해주세요.",
          duration: 2000,
        });
        return;
      }

      const totalSeconds = timeToSeconds(
        targetHours,
        targetMinutes,
        targetSeconds
      );
      const paceSeconds = timeToSeconds(
        0,
        targetPaceMinutes,
        targetPaceSeconds
      );
      const calculatedDistance = (totalSeconds / paceSeconds).toFixed(2);

      setResults({
        distance: `${calculatedDistance} km`,
      });
    } else {
      // 페이스와 거리로 시간 계산
      if (!targetDistance || targetDistance <= 0) {
        toast({
          description: "올바른 거리를 입력해주세요.",
          duration: 2000,
        });
        return;
      }

      if (!validateTimeInputs(0, targetPaceMinutes, targetPaceSeconds)) {
        toast({
          description: "올바른 페이스를 입력해주세요.",
          duration: 2000,
        });
        return;
      }

      const paceSeconds = timeToSeconds(
        0,
        targetPaceMinutes,
        targetPaceSeconds
      );
      const totalSeconds = paceSeconds * targetDistance;
      const resultHours = Math.floor(totalSeconds / 3600);
      const resultMinutes = Math.floor((totalSeconds % 3600) / 60);
      const resultSeconds = Math.floor(totalSeconds % 60);

      setResults({
        time: `${resultHours}:${resultMinutes
          .toString()
          .padStart(2, "0")}:${resultSeconds.toString().padStart(2, "0")}`,
      });
    }
  };

  const resetInputs = () => {
    setDistance("10");
    setHours("1");
    setMinutes("30");
    setSeconds("0");
    setPaceMinutes("5");
    setPaceSeconds("0");
    setResults(null);
  };

  return (
    <FormLayout title='페이스 계산기'>
      <div className='max-w-md mx-auto space-y-6'>
        {/* 모드 선택 탭 */}
        <div className='flex p-1 space-x-1 border rounded-lg'>
          {[
            { id: "pace", label: "페이스" },
            { id: "distance", label: "거리" },
            { id: "time", label: "시간" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMode(tab.id as CalculatorMode);
                resetInputs();
              }}
              className={cn(
                "flex-1 px-3 py-2 text-sm rounded-md transition-colors",
                mode === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <div className='space-y-4'>
          {mode !== "distance" && (
            <div>
              <label className='block mb-2 text-sm font-medium'>
                거리 (km)
              </label>
              <Input
                type='number'
                step='0.1'
                min='0'
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder='10'
              />
            </div>
          )}

          {mode !== "time" && (
            <div>
              <label className='block mb-2 text-sm font-medium'>시간</label>
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
          )}

          {mode !== "pace" && (
            <div>
              <label className='block mb-2 text-sm font-medium'>
                목표 페이스 (km당)
              </label>
              <div className='relative flex items-center gap-1'>
                <div className='flex-1'>
                  <Input
                    type='number'
                    min='0'
                    value={paceMinutes}
                    onChange={(e) => setPaceMinutes(e.target.value)}
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
                    value={paceSeconds}
                    onChange={(e) => setPaceSeconds(e.target.value)}
                    placeholder='0'
                    className='text-center'
                  />
                  <span className='block mt-1 text-xs text-center text-muted-foreground'>
                    초
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleCalculate} className='w-full'>
            계산하기
          </Button>
        </div>

        {/* 결과 */}
        {results && (
          <div className='mt-6'>
            <h2 className='mb-4 text-lg font-medium'>결과</h2>
            <div className='overflow-hidden border rounded-lg'>
              <table className='w-full'>
                <tbody className='divide-y'>
                  {results.pace && (
                    <>
                      <tr>
                        <td className='px-4 py-3 font-medium'>평균 페이스</td>
                        <td className='px-4 py-3'>{results.pace}</td>
                      </tr>
                      <tr>
                        <td className='px-4 py-3 font-medium'>평균 속도</td>
                        <td className='px-4 py-3'>{results.speed}</td>
                      </tr>
                    </>
                  )}
                  {results.distance && (
                    <tr>
                      <td className='px-4 py-3 font-medium'>예상 거리</td>
                      <td className='px-4 py-3'>{results.distance}</td>
                    </tr>
                  )}
                  {results.time && (
                    <tr>
                      <td className='px-4 py-3 font-medium'>예상 시간</td>
                      <td className='px-4 py-3'>{results.time}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FormLayout>
  );
}
