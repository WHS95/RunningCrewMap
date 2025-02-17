"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crewService } from "@/lib/services/crew.service";
import type { CreateCrewInput } from "@/lib/types/crewInsert";
import { FormLayout } from "@/components/layout/FormLayout";
import { ACTIVITY_DAYS } from "@/lib/types/crewInsert";
import { ErrorMessages, AppError, ErrorCode } from "@/lib/types/error";
import { ResultDialog } from "@/components/dialog/ResultDialog";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    isSuccess: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    isSuccess: true,
  });
  const [formData, setFormData] = useState<CreateCrewInput>({
    name: "",
    description: "",
    instagram: "",
    location: {
      main_address: "",
      latitude: 37.5665,
      longitude: 126.978,
    },
    activity_days: [],
    age_range: {
      min_age: 20,
      max_age: 60,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      await crewService.createCrew(formData);

      // 성공 팝업 표시
      setDialogState({
        isOpen: true,
        title: "크루 등록 완료! 🎉",
        description: "크루가 성공적으로 등록되었습니다. 홈으로 이동합니다.",
        isSuccess: true,
      });

      // 팝업이 닫히면 홈으로 이동
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      const appError = error as AppError;

      // 이미지 압축 성공은 팝업으로 표시하지 않음
      if (appError.code !== ErrorCode.FILE_COMPRESSED) {
        setDialogState({
          isOpen: true,
          title: "크루 등록 실패",
          description:
            ErrorMessages[appError.code] || "알 수 없는 오류가 발생했습니다.",
          isSuccess: false,
        });
      }

      // 개발자를 위한 상세 로그
      console.error("Failed to create crew:", {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormLayout title='러닝크루 등록'>
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
              disabled={isLoading}
            />
          </div>

          {/* 인스타그램 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Instagram</label>
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
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 활동 위치 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              메인 활동 장소
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={formData.location.main_address}
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
              disabled={isLoading}
            />
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
                    if (isLoading) return;
                    setFormData((prev) => ({
                      ...prev,
                      activity_days: prev.activity_days.includes(day)
                        ? prev.activity_days.filter((d) => d !== day)
                        : [...prev.activity_days, day],
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    formData.activity_days.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={isLoading}
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
                {formData.age_range.min_age} ~ {formData.age_range.max_age}
              </span>
            </div>
            <div className='relative h-4 my-2'>
              <div className='absolute left-0 right-0 h-1 -translate-y-1/2 bg-gray-200 rounded-full '>
                <div
                  className='absolute inset-y-0 bg-black rounded-full'
                  style={{
                    left: `${(formData.age_range.min_age / 100) * 100}%`,
                    right: `${100 - (formData.age_range.max_age / 100) * 100}%`,
                  }}
                ></div>
              </div>
              <input
                type='range'
                min='0'
                max='100'
                value={formData.age_range.min_age}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value < formData.age_range.max_age) {
                    setFormData((prev) => ({
                      ...prev,
                      age_range: { ...prev.age_range, min_age: value },
                    }));
                  }
                }}
                className='absolute inset-0 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:translate-y-[-50%]'
                disabled={isLoading}
              />
              <input
                type='range'
                min='0'
                max='100'
                value={formData.age_range.max_age}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > formData.age_range.min_age) {
                    setFormData((prev) => ({
                      ...prev,
                      age_range: { ...prev.age_range, max_age: value },
                    }));
                  }
                }}
                className='absolute inset-0 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:translate-y-[-50%]'
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 크루 소개 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              크루 소개글
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
              disabled={isLoading}
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
                  setFormData({ ...formData, logo_image: file });
                }
              }}
              className='w-full'
              disabled={isLoading}
            />
          </div>

          {/* 버튼 */}
          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={() => router.back()}
              className='flex-1 px-4 py-2.5 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50'
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type='submit'
              className='flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50'
              disabled={isLoading}
            >
              {isLoading ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>

      <ResultDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        title={dialogState.title}
        description={dialogState.description}
        isSuccess={dialogState.isSuccess}
      />
    </FormLayout>
  );
}
