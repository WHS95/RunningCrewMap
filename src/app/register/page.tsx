"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crewService } from "@/lib/services";
import type { CreateCrewInput } from "@/lib/types/crew";
import { eventEmitter, EVENTS } from "@/lib/events";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const ACTIVITY_DAYS = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateCrewInput>({
    name: "",
    description: "",
    location: {
      lat: 37.5665,
      lng: 126.978,
    },
    instagram: "",
    activity_day: "",
    age_range: "",
    logo_image: "",
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState({ min: 20, max: 60 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activityDay =
        selectedDays.length > 0 ? selectedDays.join(", ") + "에 정기 러닝" : "";

      const ageRangeText = `${ageRange.min}세 ~ ${ageRange.max}세 모집`;

      await crewService.createCrew({
        ...formData,
        activity_day: activityDay,
        age_range: ageRangeText,
      });

      eventEmitter.emit(EVENTS.INVALIDATE_CREWS_CACHE);
      router.push("/");
    } catch (error) {
      console.error("Failed to create crew:", error);
      alert("크루 등록에 실패했습니다.");
    }
  };

  return (
    <div className='min-h-[calc(100vh-4rem)] bg-background'>
      {/* 헤더 */}
      <div className='sticky top-0 flex items-center gap-3 p-4 border-b bg-background'>
        <Link
          href='/menu'
          className='p-2 rounded-full hover:bg-accent'
          title='뒤로가기'
        >
          <ArrowLeft className='w-5 h-5' />
        </Link>
        <h1 className='text-lg font-medium'>러닝크루 등록</h1>
      </div>

      <div className='p-4'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* 크루명 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              크루명
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className='w-full px-3 py-2 border rounded-lg'
              required
              placeholder='크루 이름을 입력해주세요'
            />
          </div>

          {/* 인스타그램 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>인스타그램</label>
            <div className='relative'>
              <span className='absolute left-3 top-2 text-muted-foreground'>
                @
              </span>
              <input
                type='text'
                value={formData.instagram}
                onChange={(e) =>
                  setFormData({ ...formData, instagram: e.target.value })
                }
                className='w-full px-3 py-2 border rounded-lg pl-7'
                placeholder='인스타그램 아이디'
              />
            </div>
          </div>

          {/* 활동 위치 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              메인 활동 장소
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <div className='space-y-2'>
              <input
                type='text'
                value={formData.location.main_address || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      main_address: e.target.value,
                    },
                  })
                }
                className='w-full px-3 py-2 border rounded-lg'
                required
                placeholder='메인 활동 장소를 입력해주세요 (예: 한강공원 잠원지구)'
              />
            </div>
          </div>

          {/* 활동 요일 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              정기 러닝 요일
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <div className='flex flex-wrap gap-2'>
              {ACTIVITY_DAYS.map((day) => (
                <button
                  key={day}
                  type='button'
                  onClick={() => {
                    setSelectedDays((prev) =>
                      prev.includes(day)
                        ? prev.filter((d) => d !== day)
                        : [...prev, day]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedDays.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* 연령대 */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <label className='text-sm font-medium'>
                모집 연령대
                <span className='ml-1 text-red-500'>*</span>
              </label>
              <span className='text-sm text-muted-foreground'>
                {ageRange.min}세 ~ {ageRange.max}세
              </span>
            </div>
            <div className='relative pt-3 pb-3'>
              <div className='h-1 bg-gray-200 rounded-full'>
                <div
                  className='absolute h-1 bg-black rounded-full'
                  style={{
                    left: `${(ageRange.min / 100) * 100}%`,
                    right: `${100 - (ageRange.max / 100) * 100}%`,
                  }}
                ></div>
              </div>
              <input
                type='range'
                min='0'
                max='100'
                value={ageRange.min}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value < ageRange.max) {
                    setAgeRange((prev) => ({ ...prev, min: value }));
                  }
                }}
                className='absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-30'
              />
              <input
                type='range'
                min='0'
                max='100'
                value={ageRange.max}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > ageRange.min) {
                    setAgeRange((prev) => ({ ...prev, max: value }));
                  }
                }}
                className='absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-30'
              />
              <div className='absolute inset-0 pointer-events-none'>
                <div
                  className='absolute h-1 bg-transparent'
                  style={{ left: 0, width: `${(ageRange.min / 100) * 100}%` }}
                />
                <div
                  className='absolute h-1 bg-transparent'
                  style={{
                    right: 0,
                    width: `${100 - (ageRange.max / 100) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 크루 소개 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              크루 소개
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className='w-full px-3 py-2 border rounded-lg min-h-[120px]'
              required
              placeholder='크루를 소개해주세요'
            />
          </div>

          {/* 로고 이미지 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>크루 로고</label>
            <input
              type='file'
              accept='image/*'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // TODO: 이미지 업로드 로직 구현
                  // setFormData({ ...formData, logo_image: uploadedUrl });
                }
              }}
              className='w-full'
            />
          </div>

          {/* 버튼 */}
          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={() => router.back()}
              className='flex-1 px-4 py-2.5 border rounded-lg hover:bg-accent transition-colors'
            >
              취소
            </button>
            <button
              type='submit'
              className='flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors'
            >
              등록하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
