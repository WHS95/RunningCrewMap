"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crewService } from "@/lib/services";
import type { CreateCrewInput } from "@/lib/types/crew";
import { eventEmitter, EVENTS } from "@/lib/events";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AddressSearchDialog } from "@/components/search/AddressSearchDialog";

const ACTIVITY_DAYS = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
] as const;

const AGE_RANGES = ["20대", "30대", "40대", "50대", "60대 이상"] as const;

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
  const [selectedAges, setSelectedAges] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 선택된 요일과 연령대를 문자열로 변환
      const activityDay =
        selectedDays.length > 0 ? selectedDays.join(", ") + "에 정기 러닝" : "";

      const ageRange =
        selectedAges.length > 0 ? selectedAges.join(", ") + " 모집" : "";

      await crewService.createCrew({
        ...formData,
        activity_day: activityDay,
        age_range: ageRange,
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
              <AddressSearchDialog
                onSelect={(location) => {
                  setFormData({
                    ...formData,
                    location: {
                      lat: location.lat,
                      lng: location.lng,
                      address: location.address,
                      main_address: location.title,
                    },
                  });
                }}
              />
              {formData.location.main_address && (
                <div className='p-3 space-y-1 text-sm rounded-lg bg-accent/50'>
                  <div className='font-medium'>
                    {formData.location.main_address}
                  </div>
                  {formData.location.address && (
                    <div className='text-muted-foreground'>
                      {formData.location.address}
                    </div>
                  )}
                </div>
              )}
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
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              모집 연령대
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <div className='flex flex-wrap gap-2'>
              {AGE_RANGES.map((age) => (
                <button
                  key={age}
                  type='button'
                  onClick={() => {
                    setSelectedAges((prev) =>
                      prev.includes(age)
                        ? prev.filter((a) => a !== age)
                        : [...prev, age]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedAges.includes(age)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {age}
                </button>
              ))}
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
