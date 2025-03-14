"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RecordService } from "../../lib/services/record.service";
import { AppError } from "../../lib/errors/app-error";
import { FormLayout } from "@/components/layout/FormLayout";

// 타입 정의
interface RecordFormData {
  runnerName: string;
  birthYear: number;
  crewName: string;
  crewInstagram: string;
  raceName: string;
  raceDate: string;
  raceTime: {
    hours: string;
    minutes: string;
    seconds: string;
  };
  raceCertificateImage: File | null;
  profileImage: File | null;
  review: string;
  shoeModel: string;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  description: string;
  isSuccess: boolean;
}

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate: string;
  disabled?: boolean;
}

// 날짜 선택 컴포넌트
const DatePicker = ({
  value,
  onChange,
  maxDate,
  disabled = false,
}: DatePickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const [year, month, day] = value.split("-").map(Number);
      return { year, month, day };
    }
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  });

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const handleYearChange = (year: number) => {
    setCurrentDate((prev) => {
      const daysInMonth = getDaysInMonth(year, prev.month);
      return {
        year,
        month: prev.month,
        day: prev.day > daysInMonth ? daysInMonth : prev.day,
      };
    });
  };

  const handleMonthChange = (month: number) => {
    setCurrentDate((prev) => {
      const daysInMonth = getDaysInMonth(prev.year, month);
      return {
        year: prev.year,
        month,
        day: prev.day > daysInMonth ? daysInMonth : prev.day,
      };
    });
  };

  const handleDayChange = (day: number) => {
    setCurrentDate((prev) => ({
      ...prev,
      day,
    }));
  };

  const isDateDisabled = (year: number, month: number, day: number) => {
    if (!maxDate) return false;

    const date = new Date(year, month - 1, day);
    const maxDateObj = new Date(maxDate);
    return date > maxDateObj;
  };

  const handleDateSelect = () => {
    const { year, month, day } = currentDate;
    const formattedMonth = month.toString().padStart(2, "0");
    const formattedDay = day.toString().padStart(2, "0");
    onChange(`${year}-${formattedMonth}-${formattedDay}`);
    setShowPicker(false);
  };

  const years = Array.from(
    { length: 50 },
    (_, i) => new Date().getFullYear() - i
  );
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from(
    { length: getDaysInMonth(currentDate.year, currentDate.month) },
    (_, i) => i + 1
  );

  const togglePicker = () => {
    if (!disabled) {
      setShowPicker(!showPicker);
    }
  };

  return (
    <div className='relative w-full'>
      <div
        className={`flex items-center border rounded-lg p-3.5 cursor-pointer ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"
        }`}
        onClick={togglePicker}
      >
        <span className={`flex-grow ${!value ? "text-gray-400" : ""}`}>
          {value || "날짜 선택"}
        </span>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='w-5 h-5 text-gray-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      </div>

      {showPicker && (
        <div className='absolute z-10 w-full p-4 mt-1 bg-white border rounded-lg shadow-xl'>
          <div className='grid grid-cols-3 gap-2 mb-4'>
            <select
              className='p-3 text-base border rounded-lg'
              value={currentDate.year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
            <select
              className='p-3 text-base border rounded-lg'
              value={currentDate.month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
            <select
              className='p-3 text-base border rounded-lg'
              value={currentDate.day}
              onChange={(e) => handleDayChange(Number(e.target.value))}
            >
              {days.map((day) => (
                <option
                  key={day}
                  value={day}
                  disabled={isDateDisabled(
                    currentDate.year,
                    currentDate.month,
                    day
                  )}
                >
                  {day}일
                </option>
              ))}
            </select>
          </div>
          <div className='flex justify-end'>
            <button
              className='px-4 py-2.5 bg-indigo-600 text-white rounded-lg'
              onClick={handleDateSelect}
            >
              선택
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 메인 컴포넌트
export default function RecordPage() {
  const router = useRouter();
  const raceCertInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<RecordFormData>({
    runnerName: "",
    birthYear: new Date().getFullYear() - 30, // 기본값으로 30세
    crewName: "",
    crewInstagram: "",
    raceName: "",
    raceDate: "",
    raceTime: {
      hours: "2",
      minutes: "59",
      seconds: "59",
    },
    raceCertificateImage: null,
    profileImage: null,
    review: "",
    shoeModel: "",
  });

  const [raceCertPreview, setRaceCertPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: "",
    description: "",
    isSuccess: false,
  });

  // 생년 선택 옵션 (1950년부터 현재까지)
  const birthYearOptions = Array.from(
    { length: new Date().getFullYear() - 1950 + 1 },
    (_, i) => new Date().getFullYear() - i
  );

  // 입력 필드 변경 핸들러
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // 기록 시간 변경 핸들러
  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: "hours" | "minutes" | "seconds"
  ) => {
    const { value } = e.target;
    setFormData({
      ...formData,
      raceTime: {
        ...formData.raceTime,
        [field]: value,
      },
    });
  };

  // 대회 기록증 이미지 변경 핸들러
  const handleRaceCertImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({
        ...formData,
        raceCertificateImage: file,
      });
      setRaceCertPreview(URL.createObjectURL(file));
    }
  };

  // 프로필 이미지 변경 핸들러
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({
        ...formData,
        profileImage: file,
      });
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 기본 유효성 검사
    if (!formData.runnerName) {
      setDialogState({
        isOpen: true,
        title: "입력 오류",
        description: "러너 이름을 입력해주세요.",
        isSuccess: false,
      });
      return;
    }

    if (!formData.raceName) {
      setDialogState({
        isOpen: true,
        title: "입력 오류",
        description: "대회명을 입력해주세요.",
        isSuccess: false,
      });
      return;
    }

    if (!formData.raceDate) {
      setDialogState({
        isOpen: true,
        title: "입력 오류",
        description: "대회 날짜를 선택해주세요.",
        isSuccess: false,
      });
      return;
    }

    // 서브3 기록 확인
    const hours = parseInt(formData.raceTime.hours);
    const minutes = parseInt(formData.raceTime.minutes);
    const seconds = parseInt(formData.raceTime.seconds);

    if (
      hours > 2 ||
      (hours === 2 && minutes > 59) ||
      (hours === 2 && minutes === 59 && seconds > 59)
    ) {
      setDialogState({
        isOpen: true,
        title: "기록 확인",
        description:
          "서브3(3시간 미만) 기록만 등록 가능합니다. 기록을 확인해주세요.",
        isSuccess: false,
      });
      return;
    }

    if (!formData.raceCertificateImage) {
      setDialogState({
        isOpen: true,
        title: "입력 오류",
        description: "대회 기록증 이미지를 업로드해주세요.",
        isSuccess: false,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // 실제 API 호출하여 데이터 저장
      const recordService = new RecordService();

      // 시간 형식 구성
      const timeString = `${
        formData.raceTime.hours
      }:${formData.raceTime.minutes.padStart(
        2,
        "0"
      )}:${formData.raceTime.seconds.padStart(2, "0")}`;

      // RecordService.createRecord 호출
      await recordService.createRecord({
        runnerName: formData.runnerName,
        birthYear: formData.birthYear,
        crewName: formData.crewName || null,
        crewInstagram: formData.crewInstagram || null,
        raceName: formData.raceName,
        raceDate: formData.raceDate,
        raceTime: timeString,
        raceCertificateImage: formData.raceCertificateImage,
        profileImage: formData.profileImage || undefined,
        review: formData.review || undefined,
        shoeModel: formData.shoeModel || undefined,
      });

      // 성공 팝업 표시
      setDialogState({
        isOpen: true,
        title: "기록 등록 완료! 🎉",
        description:
          "서브3 기록이 성공적으로 등록되었습니다. 관리자 승인 후 명예의 전당에 표시됩니다.",
        isSuccess: true,
      });

      // 팝업이 닫히면 홈으로 이동
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("기록 등록 실패:", error);

      // 에러 메시지 표시
      let errorMessage =
        "서버 오류로 기록 등록에 실패했습니다. 다시 시도해주세요.";

      if (error instanceof AppError) {
        errorMessage = error.message;
      }

      setDialogState({
        isOpen: true,
        title: "기록 등록 실패",
        description: errorMessage,
        isSuccess: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 다이얼로그 닫기
  const closeDialog = () => {
    setDialogState({
      ...dialogState,
      isOpen: false,
    });
  };

  return (
    <FormLayout title='서브3 명예의 전당'>
      <div className='p-4'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* 기본 정보 섹션 */}
          <div className='space-y-2'>
            <h3 className='text-sm font-bold'>러너 정보</h3>

            <div className='space-y-4'>
              {/* 이름 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='runnerName'
                >
                  이름 <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  id='runnerName'
                  name='runnerName'
                  value={formData.runnerName}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 border rounded-lg'
                  placeholder='실명을 입력해주세요'
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* 출생년도 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='birthYear'
                >
                  출생년도 <span className='text-red-500'>*</span>
                </label>
                <select
                  id='birthYear'
                  name='birthYear'
                  value={formData.birthYear}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 border rounded-lg appearance-none'
                  required
                  disabled={isSubmitting}
                >
                  {birthYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}년생
                    </option>
                  ))}
                </select>
              </div>

              {/* 소속 크루 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='crewName'
                >
                  소속 러닝크루 (선택사항)
                </label>
                <input
                  type='text'
                  id='crewName'
                  name='crewName'
                  value={formData.crewName}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 border rounded-lg'
                  placeholder='소속 러닝크루가 있다면 입력해주세요'
                  disabled={isSubmitting}
                />
              </div>

              {/* 크루 인스타그램 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='crewInstagram'
                >
                  크루 인스타그램 (선택사항)
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-2 text-muted-foreground'>
                    @
                  </span>
                  <input
                    type='text'
                    id='crewInstagram'
                    name='crewInstagram'
                    value={formData.crewInstagram}
                    onChange={handleInputChange}
                    className='w-full px-3 py-2 border rounded-lg pl-7'
                    placeholder='크루 인스타그램 아이디'
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* 프로필 이미지 */}
              <div>
                <label className='block mb-1.5 text-sm font-bold'>
                  프로필 이미지 (선택사항)
                </label>
                <div className='flex flex-col items-center gap-4 mt-2 sm:flex-row'>
                  <div className='flex items-center justify-center w-24 h-24 overflow-hidden bg-gray-100 border rounded-full'>
                    {profilePreview ? (
                      <Image
                        src={profilePreview}
                        alt='프로필 미리보기'
                        width={96}
                        height={96}
                        quality={20}
                        className='object-cover w-full h-full'
                      />
                    ) : (
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='w-10 h-10 text-gray-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                        />
                      </svg>
                    )}
                  </div>
                  <div className='flex-1'>
                    <button
                      type='button'
                      onClick={() => profileInputRef.current?.click()}
                      className='w-full px-4 py-2 text-gray-700 transition-colors border rounded-lg hover:bg-accent'
                      disabled={isSubmitting}
                    >
                      사진 선택
                    </button>
                    <p className='mt-1 text-xs text-center text-gray-500 sm:text-left'>
                      JPG, PNG, WebP 형식 (최대 2MB)
                    </p>
                    <input
                      type='file'
                      ref={profileInputRef}
                      onChange={handleProfileImageChange}
                      className='hidden'
                      accept='image/jpeg, image/png, image/webp'
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 대회 정보 섹션 */}
          <div className='space-y-2'>
            <h3 className='text-sm font-bold'>대회 정보</h3>

            <div className='space-y-4'>
              {/* 대회명 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='raceName'
                >
                  대회명 <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  id='raceName'
                  name='raceName'
                  value={formData.raceName}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 border rounded-lg'
                  placeholder='예) 2023 서울마라톤'
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* 대회 날짜 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='raceDate'
                >
                  대회 날짜 <span className='text-red-500'>*</span>
                </label>
                <DatePicker
                  value={formData.raceDate}
                  onChange={(date) =>
                    setFormData({ ...formData, raceDate: date })
                  }
                  maxDate={new Date().toISOString().split("T")[0]}
                  disabled={isSubmitting}
                />
              </div>

              {/* 완주 기록 */}
              <div>
                <label className='block mb-1.5 text-sm font-bold'>
                  완주 기록 <span className='text-red-500'>*</span>
                </label>
                <div className='flex items-center gap-2'>
                  <select
                    value={formData.raceTime.hours}
                    onChange={(e) => handleTimeChange(e, "hours")}
                    className='flex-1 px-3 py-2 text-center border rounded-lg appearance-none'
                    disabled={isSubmitting}
                  >
                    {Array.from({ length: 3 }, (_, i) => i).map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <span className='text-xl font-bold'>:</span>
                  <select
                    value={formData.raceTime.minutes}
                    onChange={(e) => handleTimeChange(e, "minutes")}
                    className='flex-1 px-3 py-2 text-center border rounded-lg appearance-none'
                    disabled={isSubmitting}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                      <option
                        key={minute}
                        value={minute.toString().padStart(2, "0")}
                      >
                        {minute.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <span className='text-xl font-bold'>:</span>
                  <select
                    value={formData.raceTime.seconds}
                    onChange={(e) => handleTimeChange(e, "seconds")}
                    className='flex-1 px-3 py-2 text-center border rounded-lg appearance-none'
                    disabled={isSubmitting}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((second) => (
                      <option
                        key={second}
                        value={second.toString().padStart(2, "0")}
                      >
                        {second.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
                <p className='mt-1 text-xs text-center text-gray-500'>
                  3시간 미만(서브3) 기록만 등록 가능합니다
                </p>
              </div>

              {/* 대회 기록증 이미지 */}
              <div>
                <label className='block mb-1.5 text-sm font-bold'>
                  대회 기록증 이미지 <span className='text-red-500'>*</span>
                </label>
                {raceCertPreview ? (
                  <div className='relative w-full h-48 mb-3 overflow-hidden border rounded-lg'>
                    <Image
                      src={raceCertPreview}
                      alt='기록증 미리보기'
                      fill
                      className='object-contain'
                    />
                    <button
                      type='button'
                      onClick={() => setRaceCertPreview(null)}
                      className='absolute p-1 bg-white rounded-full top-2 right-2 bg-opacity-70'
                      disabled={isSubmitting}
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='w-5 h-5 text-gray-700'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M6 18L18 6M6 6l12 12'
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    className='flex items-center justify-center w-full h-48 mb-3 transition-colors border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent'
                    onClick={() => raceCertInputRef.current?.click()}
                  >
                    <div className='p-4 text-center'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='w-10 h-10 mx-auto mb-1 text-gray-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                        />
                      </svg>
                      <p className='text-gray-500'>
                        대회 기록증 이미지를 탭하여 업로드하세요
                      </p>
                    </div>
                  </div>
                )}
                <button
                  type='button'
                  onClick={() => raceCertInputRef.current?.click()}
                  className='w-full px-4 py-2 transition-colors border rounded-lg hover:bg-accent'
                  disabled={isSubmitting}
                >
                  {raceCertPreview
                    ? "기록증 이미지 변경"
                    : "기록증 이미지 선택"}
                </button>
                <input
                  type='file'
                  ref={raceCertInputRef}
                  onChange={handleRaceCertImageChange}
                  className='hidden'
                  accept='image/jpeg, image/png, image/webp'
                  required
                />
                <p className='mt-1 text-xs text-center text-gray-500'>
                  JPG, PNG, WebP 형식 (최대 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* 추가 정보 섹션 */}
          <div className='space-y-2'>
            <h3 className='text-sm font-bold'>추가 정보 (선택사항)</h3>

            <div className='space-y-4'>
              {/* 착용 신발 모델 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='shoeModel'
                >
                  착용 신발 모델 (선택사항)
                </label>
                <input
                  type='text'
                  id='shoeModel'
                  name='shoeModel'
                  value={formData.shoeModel}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 border rounded-lg'
                  placeholder='예) Nike Alphafly Next% 2'
                  disabled={isSubmitting}
                />
              </div>

              {/* 후기 */}
              <div>
                <label
                  className='block mb-1.5 text-sm font-bold'
                  htmlFor='review'
                >
                  대회 후기 (선택사항)
                </label>
                <textarea
                  id='review'
                  name='review'
                  value={formData.review}
                  onChange={handleInputChange}
                  className='w-full h-24 px-3 py-2 border rounded-lg'
                  placeholder='당신의 서브3 달성 스토리를 공유해주세요'
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={() => router.back()}
              className='flex-1 px-4 py-2.5 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50'
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type='submit'
              className='flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50'
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className='flex items-center justify-center'>
                  <svg
                    className='w-5 h-5 mr-2 -ml-1 animate-spin'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  등록 중...
                </div>
              ) : (
                "명예의 전당에 등록하기"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 알림 다이얼로그 */}
      {dialogState.isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60'>
          <div className='w-full max-w-xs p-6 mx-4 bg-white shadow-2xl rounded-2xl'>
            <div
              className={`text-center mb-4 ${
                dialogState.isSuccess ? "text-green-500" : "text-red-500"
              }`}
            >
              {dialogState.isSuccess ? (
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='w-16 h-16 mx-auto'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              ) : (
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='w-16 h-16 mx-auto'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              )}
            </div>
            <h3 className='mb-2 text-xl font-bold text-center'>
              {dialogState.title}
            </h3>
            <p className='mb-6 text-center text-gray-600'>
              {dialogState.description}
            </p>
            <div className='flex justify-center'>
              <button
                className={`w-full py-3 rounded-xl ${
                  dialogState.isSuccess
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-primary hover:bg-primary/90"
                } text-primary-foreground font-medium`}
                onClick={closeDialog}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </FormLayout>
  );
}
