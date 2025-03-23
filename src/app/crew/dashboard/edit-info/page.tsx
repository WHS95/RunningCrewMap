"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { crewService } from "@/lib/services/crew.service";

// 크루 정보 타입 정의
interface Crew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image_url?: string;
  founded_date: string;
}

// 활동 요일 정보
interface ActivityDay {
  id?: string;
  day_of_week: string;
}

// 활동 장소 정보
interface ActivityLocation {
  id?: string;
  location_name: string;
}

// 연령대 정보
interface AgeRange {
  id?: string;
  min_age: number;
  max_age: number;
}

// 전체 크루 상세 정보
interface CrewDetails {
  crew: Crew;
  activityDays: ActivityDay[];
  activityLocations: ActivityLocation[];
  ageRanges: AgeRange[];
}

// 요일 목록
const DAYS_OF_WEEK = [
  { value: "월요일", label: "월요일" },
  { value: "화요일", label: "화요일" },
  { value: "수요일", label: "수요일" },
  { value: "목요일", label: "목요일" },
  { value: "금요일", label: "금요일" },
  { value: "토요일", label: "토요일" },
  { value: "일요일", label: "일요일" },
];

// 폼 스키마
const crewFormSchema = z.object({
  description: z.string().min(10, "소개글은 10자 이상이어야 합니다."),
  instagram: z.string().optional(),
  activityDays: z
    .array(z.string())
    .min(1, "활동 요일을 하나 이상 선택해주세요."),
  activityLocations: z
    .array(z.string())
    .min(1, "활동 장소를 하나 이상 입력해주세요."),
  ageRange: z.object({
    min_age: z.number().min(0, "최소 나이는 0 이상이어야 합니다."),
    max_age: z.number().min(0, "최대 나이는 0 이상이어야 합니다."),
  }),
});

export default function EditCrewInfo() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 크루 정보 상태
  const [crewDetails, setCrewDetails] = useState<CrewDetails | null>(null);

  // 폼 상태
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [activityLocations, setActivityLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(100);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activityPhotos, setActivityPhotos] = useState<File[]>([]);
  const [activityPhotosPreviews, setActivityPhotosPreviews] = useState<
    string[]
  >([]);
  const [activityPhotosUrls, setActivityPhotosUrls] = useState<string[]>([]);

  // 크루 정보 불러오기
  useEffect(() => {
    async function fetchCrewDetails() {
      try {
        const response = await fetch("/api/crew/details");

        if (!response.ok) {
          throw new Error("크루 상세 정보를 가져오는데 실패했습니다.");
        }

        const data = await response.json();
        setCrewDetails(data);

        // 폼 초기값 설정
        setDescription(data.crew.description || "");
        setInstagram(data.crew.instagram || "");
        setSelectedDays(
          data.activityDays.map((day: ActivityDay) => day.day_of_week) || []
        );
        setActivityLocations(
          data.activityLocations.map(
            (loc: ActivityLocation) => loc.location_name
          ) || []
        );

        if (data.ageRanges && data.ageRanges.length > 0) {
          setMinAge(data.ageRanges[0].min_age);
          setMaxAge(data.ageRanges[0].max_age);
        }

        // 기존 로고 URL 저장
        if (data.crew.logo_image_url) {
          setLogoUrl(data.crew.logo_image_url);
        }

        // 기존 활동 사진 URL 가져오기
        try {
          const photosResponse = await fetch(
            `/api/crew/photos?crewId=${data.crew.id}`
          );
          if (photosResponse.ok) {
            const photosData = await photosResponse.json();
            if (photosData.photos && photosData.photos.length > 0) {
              setActivityPhotosUrls(
                photosData.photos.map((p: { photo_url: string }) => p.photo_url)
              );
            }
          }
        } catch (photoErr) {
          console.error("활동 사진 로드 오류:", photoErr);
        }
      } catch (err) {
        console.error("크루 상세 정보 로드 오류:", err);
        setError("크루 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchCrewDetails();
  }, []);

  // 활동 요일 토글
  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // 활동 장소 추가
  const addActivityLocation = () => {
    if (newLocation.trim() && !activityLocations.includes(newLocation.trim())) {
      setActivityLocations((prev) => [...prev, newLocation.trim()]);
      setNewLocation("");
    }
  };

  // 활동 장소 제거
  const removeActivityLocation = (location: string) => {
    setActivityLocations((prev) => prev.filter((loc) => loc !== location));
  };

  // 로고 이미지 변경 핸들러
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLogoImage(file);

      // 이미지 미리보기 URL 생성
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setLogoUrl(null);
    }
  };

  // 로고 이미지 삭제
  const handleRemoveLogo = () => {
    setLogoImage(null);
    setLogoPreview(null);
    setLogoUrl(null);
  };

  // 활동 사진 추가 핸들러
  const handleActivityPhotosChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);

      // 최대 5개 이미지로 제한
      const filesToAdd = newFiles.slice(0, 5 - activityPhotos.length);

      if (filesToAdd.length > 0) {
        setActivityPhotos((prev) => [...prev, ...filesToAdd]);

        // 미리보기 URL 생성
        const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
        setActivityPhotosPreviews((prev) => [...prev, ...newPreviews]);
      }
    }
  };

  // 활동 사진 삭제
  const handleRemoveActivityPhoto = (index: number) => {
    setActivityPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });

    setActivityPhotosPreviews((prev) => {
      const newPreviews = [...prev];
      // 기존 URL 해제
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });

    setActivityPhotosUrls((prev) => {
      const newUrls = [...prev];
      newUrls.splice(index, 1);
      return newUrls;
    });
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // 폼 데이터 유효성 검증
      const formData = {
        description,
        instagram,
        activityDays: selectedDays,
        activityLocations,
        ageRange: {
          min_age: minAge,
          max_age: maxAge,
        },
      };

      const validationResult = crewFormSchema.safeParse(formData);

      if (!validationResult.success) {
        setError(validationResult.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      // 상태 변수로 이미지 수정 여부 추적
      const isLogoModified = !!logoPreview || logoUrl === null;
      const arePhotosModified =
        activityPhotosPreviews.length > 0 || activityPhotosUrls.length === 0;

      // 서버에서 인증 관리하므로 쿠키에 직접 접근할 필요 없음
      console.log("제출 시작: 이미지 업로드");

      // 이미지 업로드 처리
      let finalLogoUrl = logoUrl;
      let finalActivityPhotosUrls = [...activityPhotosUrls];

      // 로고 이미지 업로드 (변경된 경우에만)
      if (isLogoModified) {
        if (logoPreview && logoImage && crewDetails?.crew.id) {
          // 새 로고 이미지 업로드
          finalLogoUrl = await crewService.uploadCrewLogo(
            logoImage,
            crewDetails.crew.id
          );
        } else if (logoUrl === null) {
          // 로고 삭제 요청
          finalLogoUrl = null;
        }
      }

      // 활동 사진 업로드 (변경된 경우에만)
      if (arePhotosModified) {
        // 새 활동 사진이 있으면 업로드
        if (
          activityPhotosPreviews.length > 0 &&
          activityPhotos.length > 0 &&
          crewDetails?.crew.id
        ) {
          // null이 아닌 파일만 업로드
          const validPhotos = activityPhotos.filter(
            (file): file is File => !!file
          );
          finalActivityPhotosUrls = (
            await Promise.all(
              validPhotos.map((file) =>
                crewService.uploadCrewPhoto(file, crewDetails.crew.id)
              )
            )
          ).filter((url): url is string => url !== null);
        } else {
          // 활동 사진 삭제 요청
          finalActivityPhotosUrls = [];
        }
      }

      console.log("제출할 데이터:", {
        ...formData,
        logo_url: finalLogoUrl,
        is_logo_modified: isLogoModified,
        activity_photos: finalActivityPhotosUrls,
        are_photos_modified: arePhotosModified,
      });

      // 수정 요청 API 호출 (JWT 쿠키 자동 전송)
      const response = await fetch("/api/crew/edit-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          logo_url: finalLogoUrl,
          is_logo_modified: isLogoModified,
          activity_photos: finalActivityPhotosUrls,
          are_photos_modified: arePhotosModified,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("서버 오류:", data);
        throw new Error(data.error || "수정 요청 실패");
      }

      // 성공 시 처리
      toast.success("수정 요청이 성공적으로 제출되었습니다.");
      router.push("/crew/dashboard");
    } catch (err) {
      console.error("수정 요청 오류:", err);
      setError(
        err instanceof Error ? err.message : "수정 요청 중 오류가 발생했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error && !crewDetails) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <p className='text-red-500'>{error}</p>
        <Button onClick={() => router.push("/crew/dashboard")} className='mt-4'>
          대시보드로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className='container py-8 mx-auto'>
      <div className='mb-8'>
        <Button
          onClick={() => router.push("/crew/dashboard")}
          variant='outline'
        >
          ← 대시보드로 돌아가기
        </Button>
        <h1 className='mt-4 text-3xl font-bold'>크루 정보 수정</h1>
        <p className='text-gray-500'>수정 요청은 관리자 검토 후 반영됩니다.</p>
      </div>

      {error && (
        <div className='p-3 mb-6 text-sm text-red-800 bg-red-100 rounded-md'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-8'>
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='description'>크루 소개</Label>
              <Textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='크루 소개글을 입력하세요'
                className='min-h-[120px]'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='instagram'>인스타그램 (선택사항)</Label>
              <Input
                id='instagram'
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder='인스타그램 계정명 입력 (@ 제외)'
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>활동 요일</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className='flex items-center space-x-2'>
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`}>{day.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>활동 장소</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex space-x-2'>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder='활동 장소 입력'
                className='flex-1'
              />
              <Button type='button' onClick={addActivityLocation}>
                추가
              </Button>
            </div>

            {activityLocations.length > 0 ? (
              <div className='space-y-2'>
                {activityLocations.map((location, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-2 bg-gray-100 rounded'
                  >
                    <span>{location}</span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => removeActivityLocation(location)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-gray-500'>등록된 활동 장소가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>연령대</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='minAge'>최소 연령</Label>
                <Input
                  id='minAge'
                  type='number'
                  min='0'
                  value={minAge}
                  onChange={(e) => setMinAge(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='maxAge'>최대 연령</Label>
                <Input
                  id='maxAge'
                  type='number'
                  min='0'
                  value={maxAge}
                  onChange={(e) => setMaxAge(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>크루 이미지</CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* 크루 로고 */}
            <div className='space-y-2'>
              <Label htmlFor='logo'>크루 로고</Label>

              <div className='flex flex-col items-start space-y-4'>
                {/* 현재 로고 표시 */}
                {crewDetails?.crew.logo_image_url && !logoPreview && (
                  <div className='mb-2'>
                    <p className='mb-2 text-sm text-gray-500'>현재 로고</p>
                    <img
                      src={crewDetails.crew.logo_image_url}
                      alt='현재 크루 로고'
                      className='object-cover w-32 h-32 border rounded-md'
                    />
                  </div>
                )}

                {/* 로고 미리보기 */}
                {logoPreview && (
                  <div className='mb-2'>
                    <p className='mb-2 text-sm text-gray-500'>
                      새 로고 미리보기
                    </p>
                    <div className='relative'>
                      <img
                        src={logoPreview}
                        alt='새 로고 미리보기'
                        className='object-cover w-32 h-32 border rounded-md'
                      />
                      <Button
                        type='button'
                        variant='destructive'
                        size='icon'
                        className='absolute w-6 h-6 rounded-full -top-2 -right-2'
                        onClick={handleRemoveLogo}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                )}

                {/* 로고 업로드 버튼 */}
                <div>
                  <Input
                    id='logo'
                    type='file'
                    accept='image/*'
                    onChange={handleLogoChange}
                    className='hidden'
                  />
                  <Label
                    htmlFor='logo'
                    className='inline-block px-4 py-2 transition-colors bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200'
                  >
                    {logoPreview ? "다른 로고 선택" : "로고 이미지 업로드"}
                  </Label>
                  <p className='mt-1 text-xs text-gray-500'>
                    권장 크기: 300x300 픽셀, 최대 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* 활동 사진 */}
            <div className='pt-4 space-y-2'>
              <Label htmlFor='activity-photos'>크루 활동 사진</Label>

              {/* 활동 사진 미리보기 */}
              {activityPhotosPreviews.length > 0 && (
                <div className='mb-4'>
                  <p className='mb-2 text-sm text-gray-500'>
                    새 활동 사진 미리보기
                  </p>
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                    {activityPhotosPreviews.map((preview, index) => (
                      <div key={index} className='relative'>
                        <img
                          src={preview}
                          alt={`활동 사진 ${index + 1}`}
                          className='object-cover w-full h-32 border rounded-md'
                        />
                        <Button
                          type='button'
                          variant='destructive'
                          size='icon'
                          className='absolute w-6 h-6 rounded-full -top-2 -right-2'
                          onClick={() => handleRemoveActivityPhoto(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 활동 사진 업로드 버튼 */}
              {activityPhotosPreviews.length < 5 && (
                <div>
                  <Input
                    id='activity-photos'
                    type='file'
                    multiple
                    accept='image/*'
                    onChange={handleActivityPhotosChange}
                    className='hidden'
                  />
                  <Label
                    htmlFor='activity-photos'
                    className='inline-block px-4 py-2 transition-colors bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200'
                  >
                    활동 사진 업로드
                  </Label>
                  <p className='mt-1 text-xs text-gray-500'>
                    최대 5장, 이미지당 최대 2MB
                  </p>
                </div>
              )}

              {activityPhotosUrls.length > 0 && (
                <div className='mb-4'>
                  <p className='mb-2 text-sm text-gray-500'>현재 활동 사진</p>
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                    {activityPhotosUrls.map((url, index) => (
                      <div key={`existing-${index}`} className='relative'>
                        <img
                          src={url}
                          alt={`기존 활동 사진 ${index + 1}`}
                          className='object-cover w-full h-32 border rounded-md'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className='flex justify-end'>
          <Button type='submit' disabled={submitting}>
            {submitting ? "제출 중..." : "수정 요청 제출"}
          </Button>
        </div>
      </form>
    </div>
  );
}
