"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crewService } from "@/lib/services/crew.service";
import type { CreateCrewInput } from "@/lib/types/crewInsert";
import { FormLayout } from "@/components/layout/FormLayout";
import { ACTIVITY_DAYS } from "@/lib/types/crewInsert";
import { AppError, ErrorCode } from "@/lib/types/error";
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

      // 필수 필드 검증
      if (!formData.name.trim()) {
        setDialogState({
          isOpen: true,
          title: "크루명 입력 필요",
          description: "크루명을 입력해주세요.",
          isSuccess: false,
        });
        return;
      }

      if (!formData.description.trim()) {
        setDialogState({
          isOpen: true,
          title: "크루 소개 입력 필요",
          description: "크루를 소개하는 내용을 입력해주세요.",
          isSuccess: false,
        });
        return;
      }

      if (!formData.location.main_address.trim()) {
        setDialogState({
          isOpen: true,
          title: "활동 장소 입력 필요",
          description: "주요 활동 장소를 입력해주세요.",
          isSuccess: false,
        });
        return;
      }

      if (formData.activity_days.length === 0) {
        setDialogState({
          isOpen: true,
          title: "활동 요일 선택 필요",
          description: "정기 러닝 요일을 하나 이상 선택해주세요.",
          isSuccess: false,
        });
        return;
      }

      // 인스타그램 아이디 형식 검증
      if (formData.instagram && formData.instagram.includes("@")) {
        setDialogState({
          isOpen: true,
          title: "인스타그램 아이디 형식 오류",
          description: "@를 제외한 아이디만 입력해주세요.",
          isSuccess: false,
        });
        return;
      }

      // 이미지 파일 검증
      if (formData.logo_image) {
        const fileSize = formData.logo_image.size / (1024 * 1024); // MB로 변환
        const validTypes = ["image/jpeg", "image/png", "image/gif"];

        // 파일 형식 검증
        if (!validTypes.includes(formData.logo_image.type)) {
          setDialogState({
            isOpen: true,
            title: "지원하지 않는 파일 형식",
            description: `현재 파일: ${formData.logo_image.type}\n지원 형식: JPG, PNG, GIF\n\n다른 이미지를 선택해주세요.`,
            isSuccess: false,
          });
          return;
        }

        // 파일 크기 검증 및 자동 압축 시도
        if (fileSize > 2) {
          try {
            setDialogState({
              isOpen: true,
              title: "이미지 압축 시작",
              description: `현재 크기: ${fileSize.toFixed(
                1
              )}MB\n2MB 이하로 자동 압축을 시도합니다.`,
              isSuccess: true,
            });
          } catch (error) {
            const compressionError = error as AppError;
            if (compressionError.code === ErrorCode.COMPRESSION_FAILED) {
              setDialogState({
                isOpen: true,
                title: "이미지 압축 실패",
                description:
                  "이미지 압축에 실패했습니다. 더 작은 크기의 이미지를 사용하거나 다른 이미지를 선택해주세요.",
                isSuccess: false,
              });
              return;
            }

            setDialogState({
              isOpen: true,
              title: "이미지 처리 오류",
              description:
                "이미지 처리 중 오류가 발생했습니다. 다른 이미지를 선택해주세요.",
              isSuccess: false,
            });
            return;
          }
        }

        // 이미지 파일명 검증
        const filename = formData.logo_image.name;
        const invalidChars = /[\\/:*?"<>|]/;
        if (invalidChars.test(filename)) {
          setDialogState({
            isOpen: true,
            title: "잘못된 파일명",
            description:
              "파일명에 특수문자를 사용할 수 없습니다. 파일명을 변경하거나 다른 이미지를 선택해주세요.",
            isSuccess: false,
          });
          return;
        }
      }

      await crewService.createCrew(formData);

      // 성공 팝업 표시
      setDialogState({
        isOpen: true,
        title: "크루 등록 완료! 🎉",
        description:
          "크루가 성공적으로 등록되었습니다. 관리자 승인 후 지도에 표시됩니다.",
        isSuccess: true,
      });

      // 팝업이 닫히면 홈으로 이동
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      const appError = error as AppError;
      console.error("크루 등록 실패:", {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      });

      // 에러 코드별 사용자 피드백
      let errorTitle = "크루 등록 실패";
      let errorDescription = "알 수 없는 오류가 발생했습니다.";

      // 이미지 관련 에러 처리 추가
      if (appError.code === ErrorCode.FILE_TOO_LARGE) {
        errorTitle = "이미지 크기 초과";
        errorDescription =
          "이미지 크기가 2MB를 초과합니다. 더 작은 이미지를 사용해주세요.";
      } else if (appError.code === ErrorCode.INVALID_FILE_TYPE) {
        errorTitle = "잘못된 파일 형식";
        errorDescription = "JPG, PNG, GIF 형식의 이미지만 업로드 가능합니다.";
      } else if (appError.code === ErrorCode.UPLOAD_FAILED) {
        errorTitle = "업로드 실패";
        errorDescription =
          "이미지 업로드에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.";
      } else if (appError.code === ErrorCode.COMPRESSION_FAILED) {
        errorTitle = "압축 실패";
        errorDescription =
          "이미지 압축에 실패했습니다. 다른 이미지를 선택해주세요.";
      } else if (appError.code === ErrorCode.STORAGE_ERROR) {
        errorTitle = "저장소 오류";
        errorDescription =
          "이미지 저장소에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
      } else if (appError.code === ErrorCode.DUPLICATE_CREW_NAME) {
        errorTitle = "중복된 크루명";
        errorDescription =
          "이미 등록된 크루명입니다. 다른 이름을 사용해주세요.";
      } else if (appError.code === ErrorCode.INVALID_CREW_NAME) {
        errorTitle = "크루명 형식 오류";
        errorDescription = "크루명은 2자 이상 100자 이하로 입력해주세요.";
      } else if (appError.code === ErrorCode.INVALID_DESCRIPTION) {
        errorTitle = "크루 소개 오류";
        errorDescription = "크루 소개를 입력해주세요.";
      } else if (appError.code === ErrorCode.INVALID_LOCATION) {
        errorTitle = "활동 장소 오류";
        errorDescription = "활동 장소를 입력해주세요.";
      } else if (appError.code === ErrorCode.INVALID_ACTIVITY_DAYS) {
        errorTitle = "활동 요일 오류";
        errorDescription = "활동 요일을 선택해주세요.";
      } else if (appError.code === ErrorCode.INVALID_AGE_RANGE) {
        errorTitle = "연령대 범위 오류";
        errorDescription = "올바른 연령대 범위를 선택해주세요.";
      }

      setDialogState({
        isOpen: true,
        title: errorTitle,
        description: errorDescription,
        isSuccess: false,
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
