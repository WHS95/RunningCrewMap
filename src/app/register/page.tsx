"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { crewService } from "@/lib/services/crew.service";
import { AppError, ErrorCode } from "@/lib/types/error";
import { ResultDialog } from "@/components/dialog/ResultDialog";
import { X, Upload } from "lucide-react";
import MImage from "next/image";
import { notifyCrewRegistration } from "@/app/actions/crew";
import { KickerLabel } from "@/components/design/cartographic";
import { LogoCropDialog } from "@/components/dialog/LogoCropDialog";

const CrewLocationPickerMap = dynamic(
  () => import("@/components/map/CrewLocationPickerMap"),
  { ssr: false }
);

// Import types
import {
  CreateCrewInput,
  JoinMethod,
  ActivityDay,
  ACTIVITY_DAYS,
} from "@/lib/types/crewInsert";

// UI Components - 실제 사용하는 컴포넌트만 임포트
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
          className='px-3 py-2 w-full bg-cart-paper border border-cart-rule rounded-[4px] text-cart-ink focus:outline-none focus:border-[hsl(var(--lime))] transition-colors appearance-none'
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
          className='px-3 py-2 w-full bg-cart-paper border border-cart-rule rounded-[4px] text-cart-ink focus:outline-none focus:border-[hsl(var(--lime))] transition-colors appearance-none'
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
          className='px-3 py-2 w-full bg-cart-paper border border-cart-rule rounded-[4px] text-cart-ink focus:outline-none focus:border-[hsl(var(--lime))] transition-colors appearance-none'
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

import { PhotoUploadStrategyFactory } from "@/lib/strategies/photo-upload.strategy";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 사전 조건 확인 모달 상태
  const [showPreCheckModal, setShowPreCheckModal] = useState(true);

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

  // Picked location from interactive map. Null until the user places a pin.
  const [pickedLocation, setPickedLocation] = useState<
    { lat: number; lng: number; address?: string } | null
  >(null);

  // Existing crews shown as context dots so the user can avoid collisions.
  const [contextCrews, setContextCrews] = useState<
    Array<{ id: string; lat: number; lng: number; name?: string }>
  >([]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/crews")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (!mounted || !Array.isArray(list)) return;
        const ctx: Array<{ id: string; lat: number; lng: number; name?: string }> = [];
        for (const c of list as Array<{
          id?: string;
          name?: string;
          location?: {
            lat?: number;
            lng?: number;
            latitude?: number;
            longitude?: number;
          };
        }>) {
          const loc = c.location;
          const lat = loc?.lat ?? loc?.latitude;
          const lng = loc?.lng ?? loc?.longitude;
          if (!c.id || typeof lat !== "number" || typeof lng !== "number") continue;
          ctx.push({ id: c.id, lat, lng, name: c.name });
        }
        setContextCrews(ctx);
      })
      .catch(() => {
        // Non-fatal — picker still works without context dots.
      });
    return () => {
      mounted = false;
    };
  }, []);
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);
  const [minAge, setMinAge] = useState(20);
  const [maxAge, setMaxAge] = useState(60);
  const [logoImage, setLogoImage] = useState<File | undefined>(undefined);
  // Object URL for previewing the cropped logo. Revoked when replaced.
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  // The raw file the user just picked, sitting in the crop dialog until they
  // confirm or cancel.
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // 가입 방식 상태
  const [useInstagramDm, setUseInstagramDm] = useState(true);
  const [useOtherJoinMethod, setUseOtherJoinMethod] = useState(false);
  const [openChatLink, setOpenChatLink] = useState("");

  // 크루 사진 상태
  const [crewPhotos, setCrewPhotos] = useState<File[]>([]);

  // 사진 업로드 전략 가져오기
  const photoUploadStrategy = PhotoUploadStrategyFactory.getStrategy();

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
    // 가입 방식 생성
    const joinMethods: JoinMethod[] = [];

    if (useInstagramDm) {
      joinMethods.push({
        method_type: "instagram_dm",
      });
    }

    if (useOtherJoinMethod && openChatLink.trim()) {
      joinMethods.push({
        method_type: "other",
        link_url: openChatLink.trim(),
      });
    }

    return {
      name,
      description,
      instagram,
      founded_date: foundedDate,
      logo_image: logoImage,
      location: {
        main_address: mainAddress,
        detail_address: "",
        // Use map-picked coordinates; fallback to Seoul City Hall only if the
        // user somehow didn't pick (the submit validation below blocks this).
        latitude: pickedLocation?.lat ?? 37.5665,
        longitude: pickedLocation?.lng ?? 126.978,
      },
      activity_days: activityDays,
      age_range: {
        min_age: minAge,
        max_age: maxAge,
      },
      activity_locations: activityLocations,
      join_methods: joinMethods.length > 0 ? joinMethods : undefined,
      photos: crewPhotos.length > 0 ? crewPhotos : undefined,
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

  // 파일 변경 핸들러 — 선택된 파일을 즉시 저장하지 않고 크롭 다이얼로그로 넘김.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still re-triggers onChange.
    if (e.target) e.target.value = "";
    if (file) {
      setPendingLogoFile(file);
    }
  };

  // After the user adjusts + confirms the crop, swap in the cropped file and
  // refresh the preview URL.
  const handleLogoCropConfirm = (cropped: File) => {
    setLogoImage(cropped);
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(URL.createObjectURL(cropped));
    setPendingLogoFile(null);
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearLogo = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    setLogoImage(undefined);
  };

  // 크루 사진 추가 핸들러
  const handleCrewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // 새 사진을 추가할 수 있는지 전략 패턴을 이용해 검증
    const newPhotos = Array.from(files);
    const validationResult = photoUploadStrategy.validatePhotos(
      crewPhotos,
      newPhotos
    );

    if (!validationResult.isValid) {
      setDialogState({
        isOpen: true,
        title: validationResult.errorTitle || "오류",
        description:
          validationResult.errorMessage ||
          "사진 업로드 중 오류가 발생했습니다.",
        isSuccess: false,
      });
      return;
    }

    // 파일을 처리하고 상태에 추가
    setCrewPhotos([...crewPhotos, ...newPhotos]);

    // 파일 입력 초기화 (동일한 파일 재선택 가능하게)
    e.target.value = "";
  };

  // 크루 사진 삭제 핸들러
  const removeCrewPhoto = (index: number) => {
    const updatedPhotos = [...crewPhotos];
    updatedPhotos.splice(index, 1);
    setCrewPhotos(updatedPhotos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 폼 데이터 가져오기
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

      // main_address (지도 표시 위치 텍스트 입력) — 비어 있으면 차단
      if (
        !formData.location.main_address ||
        !formData.location.main_address.trim()
      ) {
        setDialogState({
          isOpen: true,
          title: "지도 표시 위치 입력 필요",
          description:
            "지도에 표시될 대표 위치(주소)를 입력해주세요.",
          isSuccess: false,
        });
        return;
      }

      // Require an actual map pick — block submission if the user never placed
      // the pin (otherwise we'd save the default Seoul City Hall fallback).
      if (!pickedLocation) {
        setDialogState({
          isOpen: true,
          title: "지도 위치 선택 필요",
          description: "지도에서 크루의 정확한 위치를 핀으로 표시해주세요.",
          isSuccess: false,
        });
        return;
      }

      // 활동 장소(여러 개) — 별도 chips 배열, 최소 1개 필수
      if (
        !formData.activity_locations ||
        formData.activity_locations.length === 0
      ) {
        setDialogState({
          isOpen: true,
          title: "활동 장소 입력 필요",
          description:
            "정기 모임이 이루어지는 활동 장소를 한 개 이상 추가해주세요. (예: 반포 한강공원)",
          isSuccess: false,
        });
        return;
      }

      if (formData.activity_days.length === 0) {
        setDialogState({
          isOpen: true,
          title: "활동 요일 선택 필요",
          description: "최소 하나 이상의 활동 요일을 선택해주세요.",
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

      // 가입 방식 검증
      if (!useInstagramDm && !useOtherJoinMethod) {
        setDialogState({
          isOpen: true,
          title: "가입 방식 선택 필요",
          description: "최소 하나 이상의 가입 방식을 선택해주세요.",
          isSuccess: false,
        });
        return;
      }

      if (useOtherJoinMethod && !openChatLink.trim()) {
        setDialogState({
          isOpen: true,
          title: "기타 가입 방식 링크 입력 필요",
          description: "기타 가입 방식을 선택한 경우 링크를 입력해주세요.",
          isSuccess: false,
        });
        return;
      }

      // 이미지 파일 검증
      if (formData.logo_image) {
        // 로고 이미지 검증
        const logoFile = formData.logo_image;
        if (logoFile.size > 5 * 1024 * 1024) {
          setDialogState({
            isOpen: true,
            title: "이미지 크기 초과",
            description: "로고 이미지 파일 크기는 5MB 이하여야 합니다.",
            isSuccess: false,
          });
          return;
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

      // 크루 사진 검증
      if (formData.photos && formData.photos.length > 0) {
        // 사진 개수 검증
        if (formData.photos.length > photoUploadStrategy.getMaxPhotoCount()) {
          setDialogState({
            isOpen: true,
            title: "사진 개수 초과",
            description: `크루 사진은 최대 ${photoUploadStrategy.getMaxPhotoCount()}개까지만 업로드할 수 있습니다.`,
            isSuccess: false,
          });
          return;
        }

        // 모든 사진 파일 크기 검증
        for (const photo of formData.photos) {
          if (photo.size > 5 * 1024 * 1024) {
            setDialogState({
              isOpen: true,
              title: "이미지 크기 초과",
              description: `사진 '${photo.name}'의 파일 크기가 5MB를 초과합니다.`,
              isSuccess: false,
            });
            return;
          }

          // 이미지 파일명 검증
          const invalidChars = /[\\/:*?"<>|]/;
          if (invalidChars.test(photo.name)) {
            setDialogState({
              isOpen: true,
              title: "잘못된 파일명",
              description: `파일 '${photo.name}'의 이름에 특수문자를 사용할 수 없습니다.`,
              isSuccess: false,
            });
            return;
          }
        }
      }

      // crewInsert.ts의 CreateCrewInput 타입에 맞게 데이터 변환
      const typeSafeInput: CreateCrewInput = {
        ...formData,
        location: {
          main_address: formData.location.main_address,
          detail_address: "",
          latitude: formData.location.latitude,
          longitude: formData.location.longitude,
        },
      };

      const createdCrew = await crewService.createCrew(typeSafeInput);

      // Fire Discord webhook notification — non-blocking; if it fails we still
      // surface success to the user (the crew row is already persisted).
      notifyCrewRegistration({
        id: createdCrew.id,
        name: typeSafeInput.name,
        instagram: typeSafeInput.instagram || null,
        mainAddress: typeSafeInput.location.main_address,
        lat: typeSafeInput.location.latitude,
        lng: typeSafeInput.location.longitude,
        description: typeSafeInput.description || null,
      }).catch((err) => {
        // Log but don't break the user flow.
        console.error("Discord notify failed:", err);
      });

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
      // Log the raw error first so we can see whatever shape it really has,
      // *then* the typed view. AppError fields are often undefined when the
      // throwable is a plain Error / Supabase error / DOMException etc., which
      // is how this used to print as `{}` in the console.
      console.error("크루 등록 실패 (raw):", error);
      console.error("크루 등록 실패 (parsed):", {
        code: appError?.code,
        message: appError?.message,
        details: appError?.details,
        name: (error as Error)?.name,
        rawMessage: (error as Error)?.message,
        stack: (error as Error)?.stack,
        // Supabase errors put SQL info on `.hint` / `.details`
        hint: (error as { hint?: string })?.hint,
        pgCode: (error as { code?: string })?.code,
      });

      // 에러 코드별 사용자 피드백
      let errorTitle = "크루 등록 실패";
      let errorDescription =
        (error as Error)?.message ||
        "알 수 없는 오류가 발생했습니다. 콘솔의 raw 로그를 확인해주세요.";

      // 이미지 관련 에러 처리 추가
      if (appError.code === ErrorCode.FILE_TOO_LARGE) {
        errorTitle = "이미지 크기 초과";
        errorDescription =
          "이미지 크기가 2MB를 초과합니다. 더 작은 이미지를 사용해주세요.";
      } else if (appError.code === ErrorCode.INVALID_FILE_TYPE) {
        errorTitle = "잘못된 파일 형식";
        errorDescription = "JPG, PNG 형식의 이미지만 업로드 가능합니다.";
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
        errorTitle = "지도 표시 위치 오류";
        errorDescription =
          "지도에 표시될 주소 또는 좌표가 올바르지 않습니다. 주소 입력 + 지도 핀 위치를 확인해주세요.";
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

  // 사전 조건 확인 모달이 열려있으면 폼을 표시하지 않음
  if (showPreCheckModal) {
    return (
      <main className='py-6 space-y-8 max-w-5xl'>
        <AlertDialog
          open={showPreCheckModal}
          onOpenChange={setShowPreCheckModal}
        >
          <AlertDialogContent className='w-[340px] max-w-[90vw] rounded-[4px] bg-cart-paper border border-cart-rule p-0 overflow-hidden'>
            <AlertDialogHeader className='px-6 pt-6 pb-2 space-y-1.5'>
              <div className='font-mono text-[9px] tracking-[0.22em] font-semibold text-[hsl(var(--lime))] text-center'>
                · CREW · REGISTRATION
              </div>
              <AlertDialogTitle className='font-display text-[22px] font-bold tracking-[-0.025em] text-cart-ink text-center'>
                크루 등록 조건
              </AlertDialogTitle>
              <AlertDialogDescription className='text-[12px] text-center text-cart-ink-60'>
                아래 조건을 확인해주세요
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className='px-6 py-4'>
              <div className='border-y border-cart-rule'>
                {[
                  "크루 인원이 5명 이상",
                  "크루 전용 인스타그램 계정 운영",
                  "크루 인스타에 단체 활동 사진 업로드",
                ].map((item, idx, arr) => (
                  <div
                    key={item}
                    className={`flex items-start gap-3 py-2.5 ${
                      idx < arr.length - 1 ? "border-b border-cart-rule" : ""
                    }`}
                  >
                    <span className='font-mono text-[10px] tracking-[0.05em] text-cart-ink-60 tabular-nums w-5 mt-0.5'>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className='text-[13px] text-cart-ink flex-1'>
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className='mt-3 text-[11px] text-cart-ink-60 leading-relaxed'>
                * 해당 조건이 안되면 크루 등록이 어려울 수 있습니다
              </div>
            </div>

            <AlertDialogFooter className='flex-col-reverse sm:flex-col-reverse gap-2 sm:space-x-0 px-6 pb-6 pt-2'>
              {/* Cancel — secondary ghost button */}
              <AlertDialogCancel
                onClick={() => router.back()}
                className='w-full py-3 rounded-[4px] bg-background border border-cart-rule text-cart-ink-60 hover:text-cart-ink hover:border-[hsl(var(--lime))]/40 font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all m-0'
              >
                취소 · CANCEL
              </AlertDialogCancel>
              {/* Confirm — primary lime CTA */}
              <AlertDialogAction
                onClick={() => setShowPreCheckModal(false)}
                className='w-full py-3 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[15px] font-bold tracking-[-0.01em] active:scale-[0.98] transition-transform hover:bg-[hsl(var(--lime))]/90'
              >
                확인하고 진행하기 →
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    );
  }

  // 기존 폼 렌더링 (모달이 닫힌 후)
  return (
    <main className='py-6 space-y-8 max-w-5xl'>
      <div className='flex justify-center items-center'></div>
      <div className='p-4'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* 크루명 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              크루 이름
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='px-3 py-2 w-full rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50'
              required
              placeholder='크루 이름을 입력해주세요'
              disabled={isLoading}
            />
          </div>

          {/* 인스타그램 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">Instagram</label>
            <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            <div className='relative'>
              <span className='absolute top-2 left-3 text-muted-foreground'>
                @
              </span>
              <input
                type='text'
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className='px-3 py-2 pl-7 w-full rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50'
                required
                placeholder='인스타그램 아이디'
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 크루 개설일 - 커스텀 날짜 선택기로 변경 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              크루 개설일
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
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
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              활동 장소
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <p className='mb-3 text-[11px] text-cart-ink-60'>
              최대 3개 입력 가능
            </p>

            <div className='relative'>
              <input
                type='text'
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={handleKeyDown}
                className='px-3 py-2 pr-20 w-full rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50'
                placeholder='반포 한강공원'
                disabled={isLoading}
              />
              <button
                type='button'
                onClick={addActivityLocation}
                className='absolute top-1 right-1 px-3 py-1.5 text-[11px] font-mono tracking-[0.12em] uppercase font-semibold bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-95 transition-transform disabled:opacity-50'
                disabled={isLoading || !newLocation.trim()}
              >
                추가
              </button>
            </div>

            {/* 추가된 활동 장소 목록 */}
            {activityLocations.length > 0 && (
              <div className='mt-2 space-y-2'>
                <p className='text-xs text-cart-ink-60'>활동 장소:</p>
                <div className='flex flex-wrap gap-2'>
                  {activityLocations.map((location, index) => (
                    <div
                      key={index}
                      className='flex items-center bg-cart-paper border border-cart-rule px-3 py-1.5 rounded-[4px] text-[12px] text-cart-ink'
                    >
                      <span>{location}</span>
                      <button
                        type='button'
                        onClick={() => removeActivityLocation(index)}
                        className='ml-2 text-cart-ink-60 hover:text-red-500'
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

          {/* 지도 표시 위치 - 지도 핀 + 주소 자동 채움 */}
          <div className='space-y-3'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              지도 표시 위치
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <p className='text-[11px] text-cart-ink-60'>
              지도를 탭하거나 핀을 끌어서 정기 모임 장소를 정확히 지정해주세요.
              다른 크루의 위치(연한 lime 점)와 너무 겹치지 않도록 살짝 조정하면 좋아요.
            </p>

            <CrewLocationPickerMap
              value={pickedLocation}
              onChange={(picked) => {
                setPickedLocation(picked);
                // Auto-fill the address field if it's still empty (don't clobber
                // anything the user typed manually).
                if (picked.address && !mainAddress.trim()) {
                  setMainAddress(picked.address);
                }
              }}
              otherCrews={contextCrews}
            />

            <input
              type='text'
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              className='px-3 py-2 w-full rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50'
              required
              placeholder='서울특별시 용산구 동자동 43-205'
              disabled={isLoading}
            />
            {pickedLocation ? (
              <KickerLabel tone="lime" className="tracking-[0.18em]">
                ● PICKED · LAT {pickedLocation.lat.toFixed(5)} / LNG{" "}
                {pickedLocation.lng.toFixed(5)}
              </KickerLabel>
            ) : (
              <KickerLabel tone="muted" className="tracking-[0.18em]">
                · 지도에서 위치를 선택해주세요
              </KickerLabel>
            )}
          </div>

          {/* 활동 요일 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              정기 러닝 요일
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <div className='flex flex-wrap gap-2'>
              {ACTIVITY_DAYS.map((day) => (
                <button
                  key={day}
                  type='button'
                  onClick={() => toggleActivityDay(day)}
                  className={`px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors ${
                    activityDays.includes(day)
                      ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
                      : "border-cart-rule text-cart-ink-60 hover:border-[hsl(var(--lime))]/40"
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
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              모집 연령대
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <div className='flex items-center space-x-2'>
              <select
                value={minAge}
                onChange={handleMinAgeChange}
                className='px-3 py-2 w-24 text-center bg-cart-paper border border-cart-rule rounded-[4px] text-cart-ink focus:outline-none focus:border-[hsl(var(--lime))] transition-colors appearance-none'
                disabled={isLoading}
              >
                {Array.from({ length: 101 }, (_, i) => (
                  <option key={`min-${i}`} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <span className='text-cart-ink-60'>~</span>
              <select
                value={maxAge}
                onChange={handleMaxAgeChange}
                className='px-3 py-2 w-24 text-center bg-cart-paper border border-cart-rule rounded-[4px] text-cart-ink focus:outline-none focus:border-[hsl(var(--lime))] transition-colors appearance-none'
                disabled={isLoading}
              >
                {Array.from({ length: 101 }, (_, i) => (
                  <option key={`max-${i}`} value={i} disabled={i < minAge}>
                    {i}
                  </option>
                ))}
              </select>
              <span className='ml-2 text-sm text-cart-ink-60'>세</span>
            </div>
          </div>

          {/* 크루 소개 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              크루 소개글
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full px-3 py-2 border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 rounded-[4px] min-h-[120px] focus:outline-none focus:border-[hsl(var(--lime))] transition-colors'
              required
              placeholder='크루를 소개해주세요. 상세히 적으실수록 좋아요!'
              disabled={isLoading}
            />
          </div>

          {/* 로고 이미지 — 업로드 후 1:1 크롭 다이얼로그 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              크루 로고
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <KickerLabel tone='muted' className='tracking-[0.18em]'>
              · 지도 핀의 원형 영역과 동일하게 잘립니다 · 1:1 SQUARE
            </KickerLabel>

            <input
              ref={logoInputRef}
              type='file'
              accept='image/jpeg, image/png, image/webp'
              onChange={handleFileChange}
              className='hidden'
              disabled={isLoading}
            />

            <div className='flex items-center gap-4'>
              {/* Circular preview — mirrors the map pin's logo well */}
              <button
                type='button'
                onClick={() => logoInputRef.current?.click()}
                disabled={isLoading}
                className='relative w-20 h-20 rounded-full border border-cart-rule bg-cart-paper flex items-center justify-center overflow-hidden active:scale-95 transition-transform disabled:opacity-50'
                aria-label='로고 업로드'
              >
                {logoPreviewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoPreviewUrl}
                    alt='크루 로고 미리보기'
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <Upload className='w-5 h-5 text-[hsl(var(--lime))]' />
                )}
                {/* Lime ring on hover/focus to mimic the pin chrome */}
                <span
                  aria-hidden
                  className='absolute inset-0 rounded-full ring-1 ring-inset ring-[hsl(var(--lime))]/0 transition-shadow'
                />
              </button>

              <div className='flex-1 min-w-0'>
                <div className='flex flex-wrap gap-1.5'>
                  <button
                    type='button'
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isLoading}
                    className='px-3 py-1.5 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform disabled:opacity-50'
                  >
                    {logoImage ? "다시 선택" : "파일 선택"}
                  </button>
                  {logoImage && (
                    <button
                      type='button'
                      onClick={handleClearLogo}
                      disabled={isLoading}
                      className='px-3 py-1.5 rounded-[4px] border border-cart-rule text-cart-ink-60 font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform disabled:opacity-50'
                    >
                      제거
                    </button>
                  )}
                </div>
                <p className='text-[11px] text-cart-ink-60 mt-1.5'>
                  JPG · PNG · WebP / 최대 5MB
                </p>
                {logoImage && (
                  <KickerLabel tone='lime' className='tracking-[0.18em] mt-1.5'>
                    ● {(logoImage.size / 1024).toFixed(0)} KB · 크롭 완료
                  </KickerLabel>
                )}
              </div>
            </div>
          </div>

          {/* Crop dialog — opens when a file is picked, before it becomes logoImage. */}
          <LogoCropDialog
            file={pendingLogoFile}
            onCancel={() => setPendingLogoFile(null)}
            onConfirm={handleLogoCropConfirm}
          />

          {/* 가입 방식 설정 섹션 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              가입 방식 설정
              <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
            </label>
            <p className='mb-3 text-sm text-cart-ink-60'>
              크루에 가입하기 위한 방법을 설정해주세요. 최소 하나 이상의 방법이
              필요합니다.
            </p>

            {/* 가입 방식 버튼 그룹 */}
            <div className='flex flex-wrap gap-2 mb-4'>
              <button
                type='button'
                className={`px-3 py-1.5 text-sm rounded-full ${
                  useInstagramDm
                    ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]"
                    : "bg-cart-paper text-cart-ink hover:bg-cart-paper"
                }`}
                onClick={() => setUseInstagramDm(!useInstagramDm)}
              >
                인스타그램 DM
              </button>
              <button
                type='button'
                className={`px-3 py-1.5 text-sm rounded-full ${
                  useOtherJoinMethod
                    ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]"
                    : "bg-cart-paper text-cart-ink hover:bg-cart-paper"
                }`}
                onClick={() => setUseOtherJoinMethod(!useOtherJoinMethod)}
              >
                기타 방식
              </button>
            </div>

            {/* 인스타그램 경고 메시지 */}
            {useInstagramDm && !instagram}

            {/* 기타 가입 방식 - 오픈채팅 링크 입력 */}
            {useOtherJoinMethod && (
              <div className='mt-3 mb-4'>
                <Label htmlFor='open-chat-link' className='block mb-1 text-sm'>
                  오픈채팅 링크 또는 기타 가입 정보
                </Label>
                <Input
                  id='open-chat-link'
                  type='url'
                  placeholder='가입 경로 링크'
                  value={openChatLink}
                  onChange={(e) => setOpenChatLink(e.target.value)}
                  className='w-full'
                />
              </div>
            )}
          </div>

          {/* 크루 대표 활동 사진 업로드 섹션 */}
          <div className='space-y-2'>
            <label className="text-[13px] font-semibold text-cart-ink tracking-[-0.005em]">
              크루 대표 활동 사진 업로드
            </label>
            <p className='mb-3 text-sm text-cart-ink-60'>
              크루 대표 활동 사진을 업로드해주세요. 최대{" "}
              {photoUploadStrategy.getMaxPhotoCount()}개까지 업로드 가능합니다.
            </p>
            <div className='space-y-4'>
              {/* 현재 선택된 사진 표시 */}
              {crewPhotos.length > 0 && (
                <div className='grid grid-cols-3 gap-4'>
                  {crewPhotos.map((photo, index) => (
                    <div key={index} className='relative'>
                      <div className='flex overflow-hidden justify-center items-center bg-cart-paper rounded-md aspect-square'>
                        <MImage
                          src={URL.createObjectURL(photo)}
                          alt={`크루 사진 ${index + 1}`}
                          className='object-cover w-full h-full'
                          fill
                          sizes='100%'
                          unoptimized={true}
                        />
                      </div>
                      <button
                        type='button'
                        onClick={() => removeCrewPhoto(index)}
                        className='absolute -top-2 -right-2 p-1 text-white bg-red-500 rounded-full'
                        aria-label='사진 삭제'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  ))}
                  {/* 빈 슬롯 표시 */}
                  {Array.from({
                    length:
                      photoUploadStrategy.getMaxPhotoCount() -
                      crewPhotos.length,
                  }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className='flex justify-center items-center bg-cart-paper rounded-md border-2 border-cart-rule border-dashed aspect-square'
                    >
                      <span className='text-xs text-cart-ink-40'>빈 슬롯</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 사진 업로드 버튼 */}
              {crewPhotos.length < photoUploadStrategy.getMaxPhotoCount() && (
                <Label
                  htmlFor='crew-photos'
                  className='flex justify-center items-center px-4 w-full h-32 bg-cart-paper rounded-md border-2 border-cart-rule border-dashed transition appearance-none cursor-pointer hover:border-cart-rule focus:outline-none'
                >
                  <span className='flex flex-col items-center space-y-2'>
                    <Upload className='w-6 h-6 text-cart-ink-60' />
                    <span className='font-medium text-cart-ink-60'>
                      사진 추가하기 ({crewPhotos.length}/
                      {photoUploadStrategy.getMaxPhotoCount()})
                    </span>
                    <span className='text-xs text-cart-ink-60'>
                      최대 5MB, JPG, PNG, WebP 파일 지원 (자동 WebP 변환)
                    </span>
                  </span>
                  <input
                    id='crew-photos'
                    type='file'
                    accept='image/jpeg, image/png, image/webp, image/*'
                    className='hidden'
                    onChange={handleCrewPhotoChange}
                  />
                </Label>
              )}
            </div>
          </div>

          {/* 안내 문구 */}
          <div className='py-2 text-sm text-center text-cart-ink-60'>
            <p>크루 로고 및 작성 내용 수정을 원하시면</p>
            <p>메뉴-문의 버튼(카카오채널)로 연락 언제든 주세요</p>
          </div>

          {/* 버튼 */}
          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={() => router.back()}
              className='flex-1 px-4 py-2.5 border border-cart-rule rounded-[4px] bg-cart-paper text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-transform disabled:opacity-50'
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type='submit'
              className='flex-1 px-4 py-2.5 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] font-display text-[14px] font-bold active:scale-[0.98] transition-transform disabled:opacity-50'
              disabled={isLoading}
            >
              {isLoading ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>

      {/* 결과 다이얼로그 */}
      <ResultDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState({ ...dialogState, isOpen: false })}
        title={dialogState.title}
        description={dialogState.description}
        isSuccess={dialogState.isSuccess}
      />
    </main>
  );
}
