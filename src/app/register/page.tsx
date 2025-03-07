"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { crewService } from "@/lib/services/crew.service";
import type { CreateCrewInput, ActivityDay } from "@/lib/types/crewInsert";
import { FormLayout } from "@/components/layout/FormLayout";
import { ACTIVITY_DAYS } from "@/lib/types/crewInsert";
import { AppError, ErrorCode } from "@/lib/types/error";
import { ResultDialog } from "@/components/dialog/ResultDialog";

// 날짜 선택 컴포넌트 Props 타입 정의
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate: string;
  disabled?: boolean;
}

// 커스텀 날짜 선택 컴포넌트
const DatePicker = ({
  value,
  onChange,
  maxDate,
  disabled = false,
}: DatePickerProps) => {
  // 현재 선택된 날짜 분해
  const [selectedDate, setSelectedDate] = useState<{
    year: number;
    month: number;
    day: number;
  }>(() => {
    const date = new Date(value);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1, // JavaScript의 월은 0부터 시작
      day: date.getDate(),
    };
  });

  // 최대 날짜 분해
  const maxDateObj = new Date(maxDate);
  const maxYear = maxDateObj.getFullYear();
  const maxMonth = maxDateObj.getMonth() + 1;
  const maxDay = maxDateObj.getDate();

  // 년도 범위 생성 (1990년부터 현재 년도까지)
  const years = Array.from({ length: maxYear - 1989 }, (_, i) => 1990 + i);

  // 월 범위 생성 (1-12)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 선택된 년/월에 따른 일 범위 생성
  const getDaysInMonth = (year: number, month: number) => {
    // 해당 월의 마지막 날짜 구하기
    const lastDay = new Date(year, month, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  };

  const days = getDaysInMonth(selectedDate.year, selectedDate.month);

  // 날짜 변경 시 부모 컴포넌트에 알림
  useEffect(() => {
    // 선택된 일이 해당 월의 최대 일수를 초과하는 경우 조정
    const daysInMonth = getDaysInMonth(selectedDate.year, selectedDate.month);
    const adjustedDay = Math.min(selectedDate.day, daysInMonth.length);

    if (adjustedDay !== selectedDate.day) {
      setSelectedDate((prev) => ({ ...prev, day: adjustedDay }));
    }

    // 날짜 문자열 생성 (YYYY-MM-DD 형식)
    const formattedMonth = selectedDate.month.toString().padStart(2, "0");
    const formattedDay = adjustedDay.toString().padStart(2, "0");
    const dateString = `${selectedDate.year}-${formattedMonth}-${formattedDay}`;

    onChange(dateString);
  }, [selectedDate, onChange]);

  // 최대 날짜 제한 적용
  const isDateDisabled = (year: number, month: number, day: number) => {
    if (year > maxYear) return true;
    if (year === maxYear && month > maxMonth) return true;
    if (year === maxYear && month === maxMonth && day > maxDay) return true;
    return false;
  };

  return (
    <div className='flex space-x-2'>
      {/* 년도 선택 */}
      <div className='flex-1'>
        <select
          value={selectedDate.year}
          onChange={(e) =>
            setSelectedDate({ ...selectedDate, year: parseInt(e.target.value) })
          }
          className='w-full px-3 py-2 bg-white border rounded-lg appearance-none'
          disabled={disabled}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* 월 선택 */}
      <div className='flex-1'>
        <select
          value={selectedDate.month}
          onChange={(e) =>
            setSelectedDate({
              ...selectedDate,
              month: parseInt(e.target.value),
            })
          }
          className='w-full px-3 py-2 bg-white border rounded-lg appearance-none'
          disabled={disabled}
        >
          {months.map((month) => (
            <option
              key={month}
              value={month}
              disabled={isDateDisabled(selectedDate.year, month, 1)}
            >
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* 일 선택 */}
      <div className='flex-1'>
        <select
          value={selectedDate.day}
          onChange={(e) =>
            setSelectedDate({ ...selectedDate, day: parseInt(e.target.value) })
          }
          className='w-full px-3 py-2 bg-white border rounded-lg appearance-none'
          disabled={disabled}
        >
          {days.map((day) => (
            <option
              key={day}
              value={day}
              disabled={isDateDisabled(
                selectedDate.year,
                selectedDate.month,
                day
              )}
            >
              {day}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

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

  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
  const todayDate = new Date().toISOString().split("T")[0];

  // 활동 장소 목록 상태
  const [activityLocations, setActivityLocations] = useState<string[]>([]);
  // 새 활동 장소 입력 상태
  const [newLocation, setNewLocation] = useState("");

  // 폼 데이터 상태
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [foundedDate, setFoundedDate] = useState(todayDate);
  const [mainAddress, setMainAddress] = useState("");
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);
  const [minAge, setMinAge] = useState(20);
  const [maxAge, setMaxAge] = useState(60);
  const [logoImage, setLogoImage] = useState<File | undefined>(undefined);

  // 연령대 변경 핸들러
  const handleMinAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      // 최소 연령이 최대 연령보다 크면 최대 연령도 함께 변경
      if (value > maxAge) {
        setMaxAge(value);
      }
      setMinAge(value);
    }
  };

  const handleMaxAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      // 최대 연령이 최소 연령보다 작으면 최소 연령도 함께 변경
      if (value < minAge) {
        setMinAge(value);
      }
      setMaxAge(value);
    }
  };

  // 폼 데이터를 제출 시 조합
  const getFormData = (): CreateCrewInput => {
    return {
      name,
      description,
      instagram,
      founded_date: foundedDate,
      logo_image: logoImage,
      location: {
        main_address: mainAddress,
        latitude: 37.5665,
        longitude: 126.978,
      },
      activity_days: activityDays,
      age_range: {
        min_age: minAge,
        max_age: maxAge,
      },
      activity_locations: activityLocations,
    };
  };

  // 활동 장소 추가 함수
  const addActivityLocation = () => {
    if (!newLocation.trim()) return;

    // 중복 체크
    if (activityLocations.includes(newLocation.trim())) {
      setDialogState({
        isOpen: true,
        title: "중복된 활동 장소",
        description: "이미 추가된 활동 장소입니다.",
        isSuccess: false,
      });
      return;
    }

    setActivityLocations([...activityLocations, newLocation.trim()]);
    setNewLocation("");
  };

  // 키보드 엔터키 처리 함수
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // 폼 제출 방지
      addActivityLocation();
    }
  };

  // 활동 장소 삭제 함수
  const removeActivityLocation = (index: number) => {
    const updatedLocations = [...activityLocations];
    updatedLocations.splice(index, 1);
    setActivityLocations(updatedLocations);
  };

  // 활동 요일 토글 핸들러
  const toggleActivityDay = (day: ActivityDay) => {
    if (isLoading) return;

    setActivityDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // 파일 변경 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const formData = getFormData();

      // 필수 필드 검증
      if (!formData.name.trim()) {
        setDialogState({
          isOpen: true,
          title: "크루 이름 입력 필요",
          description: "크루 이름을 입력해주세요.",
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

      if (!formData.founded_date) {
        setDialogState({
          isOpen: true,
          title: "크루 개설일 입력 필요",
          description: "크루 개설일을 선택해주세요.",
          isSuccess: false,
        });
        return;
      }

      // 개설일 미래 날짜 검증
      const selectedDate = new Date(formData.founded_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 시간 정보 제거하여 날짜만 비교

      if (selectedDate > today) {
        setDialogState({
          isOpen: true,
          title: "개설일 날짜 오류",
          description: "크루 개설일은 오늘 이후의 날짜가 될 수 없습니다.",
          isSuccess: false,
        });
        return;
      }

      if (!formData.location.main_address.trim()) {
        setDialogState({
          isOpen: true,
          title: "활동 장소",
          description: "지도에 표시될 대표 위치",
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
          "크루가 성공적으로 등록되었습니다. 관리자 승인 후 지도에 표시됩니다. 로고 및 수정을 원하시면 메뉴-문의 바리스타에게 문의해주세요.",
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
      } else if (appError.code === ErrorCode.INVALID_FOUNDED_DATE) {
        errorTitle = "개설일 오류";
        errorDescription = "올바른 크루 개설일을 선택해주세요.";
      } else if (appError.code === ErrorCode.FUTURE_FOUNDED_DATE) {
        errorTitle = "개설일 날짜 오류";
        errorDescription = "크루 개설일은 오늘 이후의 날짜가 될 수 없습니다.";
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
            <label className='text-sm font-bold'>
              크루 이름
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full px-3 py-2 border rounded-lg'
              required
              placeholder='크루 이름을 입력해주세요'
              disabled={isLoading}
            />
          </div>

          {/* 인스타그램 */}
          <div className='space-y-2'>
            <label className='text-sm font-bold'>Instagram</label>
            <span className='ml-1 text-red-500'>*</span>
            <div className='relative'>
              <span className='absolute left-3 top-2 text-muted-foreground'>
                @
              </span>
              <input
                type='text'
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className='w-full px-3 py-2 border rounded-lg pl-7'
                required
                placeholder='인스타그램 아이디'
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 크루 개설일 - 커스텀 날짜 선택기로 변경 */}
          <div className='space-y-2'>
            <label className='text-sm font-bold'>
              크루 개설일
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <DatePicker
              value={foundedDate}
              onChange={(date) => setFoundedDate(date)}
              maxDate={todayDate}
              disabled={isLoading}
            />
          </div>

          {/* 활동 장소들 - 여러 개 추가 가능 */}
          <div className='space-y-2'>
            <label className='text-sm font-bold'>
              활동 장소
              <span className='ml-1 text-red-500'>*</span>
            </label>

            <div className='relative'>
              <input
                type='text'
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={handleKeyDown}
                className='w-full px-3 py-2 pr-20 border rounded-lg'
                placeholder='반포 한강공원'
                disabled={isLoading}
              />
              <button
                type='button'
                onClick={addActivityLocation}
                className='absolute px-3 py-1 text-sm transition-colors bg-gray-100 border rounded-lg right-1 top-1 hover:bg-gray-200'
                disabled={isLoading || !newLocation.trim()}
              >
                추가
              </button>
            </div>

            {/* 추가된 활동 장소 목록 */}
            {activityLocations.length > 0 && (
              <div className='mt-2 space-y-2'>
                <p className='text-xs text-gray-500'>활동 장소:</p>
                <div className='flex flex-wrap gap-2'>
                  {activityLocations.map((location, index) => (
                    <div
                      key={index}
                      className='flex items-center bg-gray-100 px-3 py-1.5 rounded-full text-sm'
                    >
                      <span>{location}</span>
                      <button
                        type='button'
                        onClick={() => removeActivityLocation(index)}
                        className='ml-2 text-gray-500 hover:text-red-500'
                        disabled={isLoading}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 지도 표시 위치 - 하나만 입력 가능 */}
          <div className='space-y-2'>
            <label className='text-sm font-bold'>
              지도 표시 위치
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              className='w-full px-3 py-2 border rounded-lg'
              required
              placeholder='서울 강남터미널역'
              disabled={isLoading}
            />
            <p className='text-xs text-gray-500'>
              * 이 위치가 지도 상에 핀으로 표시됩니다.
            </p>
          </div>

          {/* 활동 요일 */}
          <div className='space-y-2'>
            <label className='text-sm font-bold'>
              정기 러닝 요일
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <div className='flex flex-wrap gap-2'>
              {ACTIVITY_DAYS.map((day) => (
                <button
                  key={day}
                  type='button'
                  onClick={() => toggleActivityDay(day)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    activityDays.includes(day)
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
          <div className='space-y-2'>
            <label className='text-sm font-bold'>
              모집 연령대
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <div className='flex items-center space-x-2'>
              <select
                value={minAge}
                onChange={handleMinAgeChange}
                className='w-24 px-3 py-2 text-center bg-white border rounded-lg appearance-none'
                disabled={isLoading}
              >
                {Array.from({ length: 101 }, (_, i) => (
                  <option key={`min-${i}`} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <span className='text-gray-500'>~</span>
              <select
                value={maxAge}
                onChange={handleMaxAgeChange}
                className='w-24 px-3 py-2 text-center bg-white border rounded-lg appearance-none'
                disabled={isLoading}
              >
                {Array.from({ length: 101 }, (_, i) => (
                  <option key={`max-${i}`} value={i} disabled={i < minAge}>
                    {i}
                  </option>
                ))}
              </select>
              <span className='ml-2 text-sm text-gray-500'>세</span>
            </div>
          </div>

          {/* 크루 소개 */}
          <div className='space-y-2'>
            <label className='text-sm font-bold'>
              크루 소개글
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full px-3 py-2 border rounded-lg min-h-[120px]'
              required
              placeholder='크루를 소개해주세요'
              disabled={isLoading}
            />
          </div>

          {/* 로고 이미지 */}
          <div className='space-y-2'>
            <label className='text-sm font-bold'>
              크루 로고
              <span className='ml-1 text-red-500'>*</span>
            </label>
            <input
              type='file'
              accept='image/jpeg, image/png'
              onChange={handleFileChange}
              className='w-full'
              disabled={isLoading}
            />
            <p className='text-xs text-gray-500'>* JPG, PNG</p>
          </div>

          {/* 안내 문구 */}
          <div className='py-2 text-sm text-center text-gray-600'>
            <p>💬 크루 로고 및 작성 내용 수정을 원하시면</p>
            <p>메뉴-문의 버튼(카카오채널)로 연락 언제든 주세요</p>
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
