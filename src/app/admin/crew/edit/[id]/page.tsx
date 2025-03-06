"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FormLayout } from "@/components/layout/FormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { crewService } from "@/lib/services/crew.service";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { Crew } from "@/lib/types/crew";
import { Checkbox } from "@/components/ui/checkbox";
import { ACTIVITY_DAYS, ActivityDay } from "@/lib/types/crewInsert";

// DatabaseError 인터페이스 추가
interface DatabaseError {
  message?: string;
  [key: string]: unknown;
}

export default function EditCrewPage() {
  const params = useParams();
  const router = useRouter();
  const crewId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [crew, setCrew] = useState<Crew | null>(null);

  // 폼 상태
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [mainAddress, setMainAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [activityLocations, setActivityLocations] = useState<string[]>([]);
  const [newActivityLocation, setNewActivityLocation] = useState("");
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);

  // 위도, 경도 상태 추가
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);

  // 개설일, 연령대 상태 추가
  const [foundedDate, setFoundedDate] = useState("");
  const [minAge, setMinAge] = useState<number>(0);
  const [maxAge, setMaxAge] = useState<number>(100);

  // 로고 이미지 상태 추가
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 크루 정보 로드
  useEffect(() => {
    const loadCrew = async () => {
      try {
        setIsLoading(true);

        // 관리자용 크루 목록에서 해당 ID의 크루 정보 가져오기
        const crewsData = await crewService.getAdminCrews();
        const crewData = crewsData.find((crew) => crew.id === crewId);

        if (!crewData) {
          toast.error("크루 정보를 찾을 수 없습니다.");
          router.push("/admin/crew");
          return;
        }

        setCrew(crewData);

        // 폼 초기화
        setName(crewData.name);
        setDescription(crewData.description);
        setInstagram(crewData.instagram || "");
        setMainAddress(crewData.location.main_address || "");
        setDetailAddress(crewData.location.address || "");
        setIsVisible(crewData.is_visible || false);
        setActivityLocations(crewData.activity_locations || []);

        // 위도, 경도 설정
        setLatitude(crewData.location.lat || 0);
        setLongitude(crewData.location.lng || 0);

        // 개설일 설정
        setFoundedDate(crewData.founded_date || "");

        // 연령대 설정
        if (crewData.age_range) {
          const [minAgeStr, maxAgeStr] = crewData.age_range.split("~");
          const min = parseInt(minAgeStr);
          const max = parseInt(maxAgeStr);
          if (!isNaN(min)) setMinAge(min);
          if (!isNaN(max)) setMaxAge(max);
        }

        // 활동 요일 설정
        if (crewData.activity_day) {
          // "매주 월요일, 수요일" 형식에서 요일만 추출
          const days = crewData.activity_day
            .replace("매주 ", "")
            .split(", ")
            .filter((day) =>
              ACTIVITY_DAYS.includes(day as ActivityDay)
            ) as ActivityDay[];

          setActivityDays(days);
        }
      } catch (error) {
        console.error("크루 정보 로드 실패:", error);
        toast.error("크루 정보를 불러오는데 실패했습니다.");
        router.push("/admin/crew");
      } finally {
        setIsLoading(false);
      }
    };

    loadCrew();

    // 컴포넌트 언마운트 시 임시 URL 정리
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [crewId, router]);

  // 파일 변경 핸들러 추가
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 이전 미리보기 URL이 있다면 메모리 해제
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }

      setLogoImage(file);
      // 미리보기 URL 생성
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // 파일 선택 버튼 클릭 핸들러
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // 활동 장소 추가
  const handleAddActivityLocation = () => {
    if (!newActivityLocation.trim()) return;

    // 중복 체크
    if (activityLocations.includes(newActivityLocation.trim())) {
      toast.error("이미 추가된 활동 장소입니다.");
      return;
    }

    setActivityLocations([...activityLocations, newActivityLocation.trim()]);
    setNewActivityLocation("");
  };

  // 활동 장소 삭제
  const handleRemoveActivityLocation = (location: string) => {
    setActivityLocations(activityLocations.filter((loc) => loc !== location));
  };

  // 활동 요일 토글
  const toggleActivityDay = (day: ActivityDay) => {
    if (activityDays.includes(day)) {
      setActivityDays(activityDays.filter((d) => d !== day));
    } else {
      setActivityDays([...activityDays, day]);
    }
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!crew) return;

    // 최소 하나의 활동 요일 선택 확인
    if (activityDays.length === 0) {
      toast.error("최소 하나의 활동 요일을 선택해주세요.");
      return;
    }

    // 위도, 경도 확인
    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("위도와 경도는 숫자로 입력해주세요.");
      return;
    }

    // 한국의 위경도 범위 확인 (경고만 표시)
    const isInKoreaRange =
      latitude >= 33 && latitude <= 39 && longitude >= 124 && longitude <= 132;

    if (!isInKoreaRange) {
      toast.warning(
        "입력된 위경도 값이 한국의 일반적인 범위를 벗어났습니다. 정확한 위치인지 확인해주세요."
      );
    }

    // 연령대 확인
    if (minAge < 0 || maxAge > 100 || minAge > maxAge) {
      toast.error(
        "유효한 연령대를 입력해주세요. (최소 0세, 최대 100세, 최소 연령은 최대 연령보다 작아야 합니다.)"
      );
      return;
    }

    try {
      setIsSaving(true);

      let updatedImageUrl = crew.logo_image;
      // 새 이미지가 선택된 경우 업로드
      if (logoImage) {
        try {
          const uploadedUrl = await crewService.uploadCrewLogo(
            logoImage,
            crewId
          );
          if (uploadedUrl) {
            updatedImageUrl = uploadedUrl;
          }
        } catch (error) {
          console.error("이미지 업로드 실패:", error);
          toast.error("이미지 업로드에 실패했습니다.");
          setIsSaving(false);
          return;
        }
      }

      // 크루 정보 업데이트
      await crewService.updateCrew(crewId, {
        name,
        description,
        instagram: instagram || undefined,
        location: {
          main_address: mainAddress,
          detail_address: detailAddress || undefined,
          latitude,
          longitude,
        },
        activity_locations: activityLocations,
        activity_days: activityDays,
        founded_date: foundedDate || undefined,
        age_range: {
          min_age: minAge,
          max_age: maxAge,
        },
        logo_image_url: updatedImageUrl,
      });

      // 크루 표시 상태 업데이트
      await crewService.updateCrewVisibility(crewId, isVisible);

      toast.success("크루 정보가 업데이트되었습니다.");
      router.push("/admin/crew");
    } catch (error) {
      console.error("크루 정보 업데이트 실패:", error);

      // 데이터베이스 오류 메시지 처리
      if (error && typeof error === "object" && "message" in error) {
        toast.error(
          `크루 정보 업데이트에 실패했습니다: ${
            (error as DatabaseError).message
          }`
        );
      } else {
        toast.error("크루 정보 업데이트에 실패했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <FormLayout title='크루 정보 수정'>
        <div className='flex items-center justify-center flex-1'>
          <Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
        </div>
      </FormLayout>
    );
  }

  return (
    <FormLayout title='크루 정보 수정'>
      <div className='mb-4'>
        <Button
          variant='ghost'
          onClick={() => router.push("/admin/crew")}
          className='flex items-center gap-1 text-muted-foreground'
        >
          <ArrowLeft className='w-4 h-4' />
          목록으로 돌아가기
        </Button>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* 크루 로고 */}
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>크루 로고</h3>
          <div className='flex items-center gap-4'>
            {/* 로고 이미지 표시 */}
            <div className='relative w-20 h-20 overflow-hidden rounded-full'>
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt={`${name} 로고 미리보기`}
                  fill
                  className='object-cover'
                />
              ) : crew?.logo_image ? (
                <Image
                  src={crew.logo_image}
                  alt={`${name} 로고`}
                  fill
                  className='object-cover'
                />
              ) : (
                <div className='flex items-center justify-center w-full h-full text-2xl font-medium rounded-full bg-muted'>
                  {name.charAt(0)}
                </div>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileChange}
                accept='image/jpeg,image/png,image/gif'
                className='hidden'
              />
              <Button
                type='button'
                variant='outline'
                onClick={handleSelectFile}
                className='text-sm'
              >
                로고 이미지 변경
              </Button>
              {logoImage && (
                <p className='text-xs text-muted-foreground'>
                  {logoImage.name} ({Math.round(logoImage.size / 1024)}KB)
                </p>
              )}
              <p className='text-xs text-muted-foreground'>
                최대 2MB, JPG, PNG, GIF 형식만 지원
              </p>
            </div>
          </div>
        </div>

        {/* 표시 여부 */}
        <div className='flex items-center justify-between p-4 border rounded-lg'>
          <div>
            <h3 className='font-medium'>지도에 표시</h3>
            <p className='text-sm text-muted-foreground'>
              이 크루를 지도에 표시할지 여부를 설정합니다.
            </p>
          </div>
          <Switch checked={isVisible} onCheckedChange={setIsVisible} />
        </div>

        {/* 기본 정보 */}
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>기본 정보</h3>

          <div className='space-y-2'>
            <Label htmlFor='name'>크루명</Label>
            <Input
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='foundedDate'>개설일</Label>
            <Input
              id='foundedDate'
              type='date'
              value={foundedDate}
              onChange={(e) => setFoundedDate(e.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='instagram'>인스타그램</Label>
            <div className='relative'>
              <span className='absolute transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground'>
                @
              </span>
              <Input
                id='instagram'
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className='pl-8'
                placeholder='인스타그램 계정 (@ 제외)'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>크루 소개</Label>
            <Textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
            />
          </div>
        </div>

        {/* 연령대 */}
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>연령대</h3>
          <p className='mb-3 text-sm text-muted-foreground'>
            크루 회원들의 연령대 범위를 설정해주세요.
          </p>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='minAge'>최소 연령</Label>
              <Input
                id='minAge'
                type='number'
                min='0'
                max='100'
                value={minAge}
                onChange={(e) => setMinAge(parseInt(e.target.value))}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='maxAge'>최대 연령</Label>
              <Input
                id='maxAge'
                type='number'
                min='0'
                max='100'
                value={maxAge}
                onChange={(e) => setMaxAge(parseInt(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        {/* 활동 요일 */}
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>활동 요일</h3>
          <p className='mb-3 text-sm text-muted-foreground'>
            크루가 활동하는 요일을 선택해주세요. (복수 선택 가능)
          </p>

          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
            {ACTIVITY_DAYS.map((day) => (
              <div key={day} className='flex items-center space-x-2'>
                <Checkbox
                  id={`day-${day}`}
                  checked={activityDays.includes(day)}
                  onCheckedChange={() => toggleActivityDay(day)}
                />
                <Label htmlFor={`day-${day}`} className='cursor-pointer'>
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* 위치 정보 */}
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>지도 표시 위치 정보</h3>

          <div className='space-y-2'>
            <Label htmlFor='mainAddress'>주소</Label>
            <Input
              id='mainAddress'
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='detailAddress'>지도 검색 주소</Label>
            <Input
              id='detailAddress'
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              placeholder='상세 주소 (선택사항)'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='latitude'>위도</Label>
              <Input
                id='latitude'
                type='number'
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                placeholder='예: 37.5665'
                required
                min='-99.99999999'
                max='99.99999999'
                step='any'
              />
              <p className='text-xs text-muted-foreground'>
                한국의 위도 범위: 33° ~ 39° (북위)
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='longitude'>경도</Label>
              <Input
                id='longitude'
                type='number'
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                placeholder='예: 126.9780'
                required
                min='-999.99999999'
                max='999.99999999'
                step='any'
              />
              <p className='text-xs text-muted-foreground'>
                한국의 경도 범위: 124° ~ 132° (동경)
              </p>
            </div>
          </div>
          <p className='text-xs text-muted-foreground'>
            위도와 경도는 지도에 크루 위치를 표시하는데 사용됩니다. 정확한
            좌표를 입력해주세요.
          </p>
        </div>

        {/* 활동 장소 */}
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>활동 장소</h3>

          <div className='flex gap-2'>
            <Input
              value={newActivityLocation}
              onChange={(e) => setNewActivityLocation(e.target.value)}
              placeholder='활동 장소 추가'
              className='flex-1'
            />
            <Button
              type='button'
              onClick={handleAddActivityLocation}
              variant='secondary'
            >
              추가
            </Button>
          </div>

          <div className='space-y-2'>
            {activityLocations.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {activityLocations.map((location, index) => (
                  <div
                    key={index}
                    className='flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-accent'
                  >
                    <span>{location}</span>
                    <button
                      type='button'
                      onClick={() => handleRemoveActivityLocation(location)}
                      className='flex items-center justify-center w-4 h-4 rounded-full hover:bg-muted-foreground/20'
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>
                등록된 활동 장소가 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.push("/admin/crew")}
            disabled={isSaving}
          >
            취소
          </Button>
          <Button type='submit' disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </form>
    </FormLayout>
  );
}
