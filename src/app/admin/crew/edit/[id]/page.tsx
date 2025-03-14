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
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
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

// 크루 업데이트 데이터 인터페이스 추가
interface CrewUpdateData {
  name: string;
  description: string;
  instagram?: string;
  location: {
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  };
  activity_locations?: string[];
  activity_days: ActivityDay[];
  founded_date?: string;
  age_range?: {
    min_age: number;
    max_age: number;
  };
  logo_image_url?: string;
  use_instagram_dm?: boolean;
  open_chat_link?: string;
  crew_photos?: {
    existing: string[];
    new: string[];
  };
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

  // 크루 활동 사진 상태 추가
  const [crewPhotos, setCrewPhotos] = useState<File[]>([]);
  const [crewPhotosPreviews, setCrewPhotosPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<
    { url: string; id: string }[]
  >([]);
  const crewPhotosInputRef = useRef<HTMLInputElement>(null);

  // 가입 경로 상태 추가
  const [openChatLink, setOpenChatLink] = useState("");
  const [useInstagramDm, setUseInstagramDm] = useState(false);
  const [useOtherJoinMethod, setUseOtherJoinMethod] = useState(false);

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

        // 가입 경로 설정 (join_methods 배열 사용)
        if (crewData.join_methods && crewData.join_methods.length > 0) {
          // 인스타그램 DM 사용 여부 확인
          const hasInstagramDm = crewData.join_methods.some(
            (method) => method.method_type === "instagram_dm"
          );
          if (hasInstagramDm) {
            setUseInstagramDm(true);
          }

          // 오픈채팅 링크 확인
          const openChatMethod = crewData.join_methods.find(
            (method) =>
              method.method_type === "open_chat" ||
              method.method_type === "other"
          );
          if (openChatMethod && openChatMethod.link_url) {
            setOpenChatLink(openChatMethod.link_url);
            setUseOtherJoinMethod(true);
          }
        } else {
          // 이전 코드와의 호환성을 위한 처리 (나중에 제거 가능)
          if (crewData.open_chat_link) {
            setOpenChatLink(crewData.open_chat_link);
            setUseOtherJoinMethod(true);
          }

          if (crewData.use_instagram_dm) {
            setUseInstagramDm(true);
          }
        }

        // 기존 크루 사진 설정
        if (crewData.crew_photos && crewData.crew_photos.length > 0) {
          setExistingPhotos(
            crewData.crew_photos.map((photo) => ({
              url: photo.photo_url,
              id: photo.id,
            }))
          );
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

      // 크루 사진 미리보기 URL 해제
      crewPhotosPreviews.forEach((url) => {
        URL.revokeObjectURL(url);
      });
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

  // 크루 사진 추가 핸들러
  const handleCrewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // 최대 5장까지만 허용
    const maxPhotos = 5;
    const availableSlots =
      maxPhotos - (existingPhotos.length + crewPhotos.length);
    if (availableSlots <= 0) {
      toast.error(`최대 ${maxPhotos}장의 사진만 업로드할 수 있습니다.`);
      return;
    }

    const newFiles = Array.from(files).slice(0, availableSlots);

    // 파일 크기 및 형식 검증
    const invalidFiles = newFiles.filter(
      (file) =>
        file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    if (invalidFiles.length > 0) {
      toast.error(
        "일부 파일이 너무 크거나 지원되지 않는 형식입니다. (최대 5MB, JPG/PNG/GIF 형식만 지원)"
      );
      return;
    }

    // 새 파일 추가 및 미리보기 생성
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setCrewPhotos([...crewPhotos, ...newFiles]);
    setCrewPhotosPreviews([...crewPhotosPreviews, ...newPreviews]);

    // 파일 입력 초기화 (동일한 파일 재선택 가능하게)
    e.target.value = "";
  };

  // 새 크루 사진 삭제
  const removeCrewPhoto = (index: number) => {
    // 미리보기 URL 해제
    URL.revokeObjectURL(crewPhotosPreviews[index]);

    const updatedPhotos = [...crewPhotos];
    const updatedPreviews = [...crewPhotosPreviews];

    updatedPhotos.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setCrewPhotos(updatedPhotos);
    setCrewPhotosPreviews(updatedPreviews);
  };

  // 기존 크루 사진 삭제
  const removeExistingPhoto = (index: number) => {
    const updatedExistingPhotos = [...existingPhotos];
    updatedExistingPhotos.splice(index, 1);
    setExistingPhotos(updatedExistingPhotos);
  };

  // 파일 선택 버튼 클릭 핸들러
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // 크루 사진 선택 버튼 클릭 핸들러
  const handleSelectCrewPhotos = () => {
    crewPhotosInputRef.current?.click();
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

  // 가입 방식 토글 핸들러
  const toggleInstagramDm = () => {
    setUseInstagramDm(!useInstagramDm);
  };

  const toggleOtherJoinMethod = () => {
    setUseOtherJoinMethod(!useOtherJoinMethod);
    if (!useOtherJoinMethod) {
      setOpenChatLink("");
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

    // 가입 방식 확인
    if (useOtherJoinMethod && !openChatLink) {
      toast.error("오픈채팅 링크 또는 기타 가입 정보를 입력해주세요.");
      return;
    }

    if (useInstagramDm && !instagram) {
      toast.error(
        "인스타그램 DM을 가입 방식으로 사용하려면 인스타그램 계정을 입력해주세요."
      );
      return;
    }

    try {
      setIsSaving(true);

      let updatedImageUrl = crew?.logo_image;
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

      // 크루 활동 사진 업로드
      const uploadedPhotoUrls: string[] = [];
      if (crewPhotos.length > 0) {
        for (const photo of crewPhotos) {
          try {
            const uploadedUrl = await crewService.uploadCrewPhoto(
              photo,
              crewId
            );
            if (uploadedUrl) {
              uploadedPhotoUrls.push(uploadedUrl);
            }
          } catch (error) {
            console.error("크루 활동 사진 업로드 실패:", error);
            toast.error("일부 크루 활동 사진 업로드에 실패했습니다.");
          }
        }
      }

      // 크루 정보 업데이트 데이터 준비
      const updateData: CrewUpdateData = {
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
      };

      // 가입 방식 정보 추가 (use_instagram_dm, open_chat_link)
      if (useInstagramDm) {
        updateData.use_instagram_dm = true;
      }

      if (useOtherJoinMethod && openChatLink) {
        updateData.open_chat_link = openChatLink;
      }

      // 크루 사진 정보 추가
      if (existingPhotos.length > 0 || uploadedPhotoUrls.length > 0) {
        updateData.crew_photos = {
          existing: existingPhotos.map((photo) => photo.id),
          new: uploadedPhotoUrls,
        };
      }

      // 크루 정보 업데이트
      await crewService.updateCrew(crewId, updateData);

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
                  quality={20}
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
                accept='image/jpeg,image/png,image/webp'
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
                최대 2MB, JPG, PNG 형식만 지원
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

        {/* 가입 방식 */}
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>가입 방식</h3>
          <p className='mb-3 text-sm text-muted-foreground'>
            신규 회원이 크루에 가입할 수 있는 방법을 선택해주세요.
          </p>

          <div className='flex flex-wrap gap-2 mb-3'>
            <button
              type='button'
              className={`px-3 py-1.5 text-sm rounded-full ${
                useInstagramDm
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={toggleInstagramDm}
            >
              인스타그램 DM
            </button>
            <button
              type='button'
              className={`px-3 py-1.5 text-sm rounded-full ${
                useOtherJoinMethod
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={toggleOtherJoinMethod}
            >
              기타 방식
            </button>
          </div>

          {/* 인스타그램 경고 메시지 */}
          {useInstagramDm && !instagram && (
            <div className='p-2 mb-3 text-sm text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-md'>
              인스타그램 DM을 가입 방식으로 사용하려면 인스타그램 계정을
              입력해주세요.
            </div>
          )}

          {/* 기타 가입 방식 - 오픈채팅 링크 입력 */}
          {useOtherJoinMethod && (
            <div className='space-y-2'>
              <Label htmlFor='open-chat-link'>
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
        <div className='p-4 space-y-4 border rounded-lg'>
          <h3 className='font-medium'>크루 대표 활동 사진</h3>
          <p className='mb-3 text-sm text-muted-foreground'>
            크루 대표 활동 사진을 추가하거나 수정할 수 있습니다. 최대 5장까지
            업로드 가능합니다.
          </p>

          <div className='space-y-4'>
            {/* 현재 선택된 사진과 기존 사진 표시 */}
            {(existingPhotos.length > 0 || crewPhotosPreviews.length > 0) && (
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                {/* 기존 사진 표시 */}
                {existingPhotos.map((photo, index) => (
                  <div key={`existing-${index}`} className='relative'>
                    <div className='flex items-center justify-center overflow-hidden bg-gray-100 rounded-md aspect-square'>
                      <Image
                        src={photo.url}
                        alt={`크루 활동 사진 ${index + 1}`}
                        quality={20}
                        className='object-cover'
                        fill
                        sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw'
                      />
                    </div>
                    <button
                      type='button'
                      onClick={() => removeExistingPhoto(index)}
                      className='absolute p-1 text-white bg-red-500 rounded-full -top-2 -right-2'
                      aria-label='사진 삭제'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>
                ))}

                {/* 새로 업로드할 사진 표시 */}
                {crewPhotosPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className='relative'>
                    <div className='flex items-center justify-center overflow-hidden bg-gray-100 rounded-md aspect-square'>
                      <Image
                        src={preview}
                        alt={`새 크루 활동 사진 ${index + 1}`}
                        className='object-cover'
                        quality={20}
                        fill
                        sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw'
                      />
                    </div>
                    <button
                      type='button'
                      onClick={() => removeCrewPhoto(index)}
                      className='absolute p-1 text-white bg-red-500 rounded-full -top-2 -right-2'
                      aria-label='사진 삭제'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>
                ))}

                {/* 빈 슬롯 표시 */}
                {Array.from({
                  length:
                    5 - (existingPhotos.length + crewPhotosPreviews.length),
                }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className='flex items-center justify-center bg-gray-100 border-2 border-gray-300 border-dashed rounded-md aspect-square'
                  >
                    <span className='text-xs text-muted-foreground'>
                      빈 슬롯
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 사진 업로드 버튼 */}
            {existingPhotos.length + crewPhotosPreviews.length < 5 && (
              <>
                <input
                  type='file'
                  ref={crewPhotosInputRef}
                  onChange={handleCrewPhotoChange}
                  accept='image/jpeg,image/png,image/webp'
                  className='hidden'
                  multiple
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleSelectCrewPhotos}
                  className='w-full h-20 border-dashed'
                >
                  <div className='flex flex-col items-center gap-1'>
                    <Upload className='w-5 h-5 text-muted-foreground' />
                    <span>
                      활동 사진 추가 (
                      {existingPhotos.length + crewPhotosPreviews.length}/5)
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      최대 5MB, JPG, PNG, GIF 형식만 지원
                    </span>
                  </div>
                </Button>
              </>
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
