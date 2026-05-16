"use client";

/**
 * /admin/crew/edit/[id]
 *
 * Mobile-first cartographic crew editor for admin. All business logic
 * (data load, mutations, validations, upload flow) is preserved from the
 * previous version; only the JSX surface was rewritten so admin can manage
 * a crew comfortably from a phone:
 *
 *   - Single column layout, sections separated by hairline-bordered cards.
 *   - Sticky top bar with back arrow + crew name + pending badge + save.
 *   - Sticky bottom save action so the primary CTA is always reachable.
 *   - All inputs/selects/textareas share the same cartographic class string.
 *   - Day picker, activity locations, photo grid all rebuilt as chips.
 */

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { crewService } from "@/lib/services/crew.service";
import {
  ArrowLeft,
  Loader2,
  Upload,
  X,
  Plus,
  Save,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { Crew } from "@/lib/types/crew";
import { ACTIVITY_DAYS, ActivityDay } from "@/lib/types/crewInsert";
import { KickerLabel } from "@/components/design/cartographic";
import { cn } from "@/lib/utils";

const CrewLocationPickerMap = dynamic(
  () => import("@/components/map/CrewLocationPickerMap"),
  { ssr: false }
);

interface DatabaseError {
  message?: string;
  [key: string]: unknown;
}

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

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [mainAddress, setMainAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [activityLocations, setActivityLocations] = useState<string[]>([]);
  const [newActivityLocation, setNewActivityLocation] = useState("");
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);

  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);

  const [contextCrews, setContextCrews] = useState<
    Array<{ id: string; lat: number; lng: number; name?: string }>
  >([]);

  const [foundedDate, setFoundedDate] = useState("");
  const [minAge, setMinAge] = useState<number>(0);
  const [maxAge, setMaxAge] = useState<number>(100);

  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [crewPhotos, setCrewPhotos] = useState<File[]>([]);
  const [crewPhotosPreviews, setCrewPhotosPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<
    { url: string; id: string }[]
  >([]);
  const crewPhotosInputRef = useRef<HTMLInputElement>(null);

  const [openChatLink, setOpenChatLink] = useState("");
  const [useInstagramDm, setUseInstagramDm] = useState(false);
  const [useOtherJoinMethod, setUseOtherJoinMethod] = useState(false);

  // ── Data load ────────────────────────────────────────────────
  useEffect(() => {
    const loadCrew = async () => {
      try {
        setIsLoading(true);
        const crewsData = await crewService.getAdminCrews();
        const crewData = crewsData.find((c) => c.id === crewId);

        if (!crewData) {
          toast.error("크루 정보를 찾을 수 없습니다.");
          router.push("/admin/crew");
          return;
        }

        setCrew(crewData);
        setName(crewData.name);
        setDescription(crewData.description);
        setInstagram(crewData.instagram || "");
        setMainAddress(crewData.location.main_address || "");
        setDetailAddress(crewData.location.address || "");
        setIsVisible(crewData.is_visible || false);
        setActivityLocations(crewData.activity_locations || []);
        setLatitude(crewData.location.lat || 0);
        setLongitude(crewData.location.lng || 0);

        setContextCrews(
          crewsData
            .filter((c) => c.id !== crewData.id)
            .map((c) => ({
              id: c.id,
              lat: c.location.lat,
              lng: c.location.lng,
              name: c.name,
            }))
            .filter(
              (c) => typeof c.lat === "number" && typeof c.lng === "number"
            )
        );

        setFoundedDate(crewData.founded_date || "");

        if (crewData.age_range) {
          const [minAgeStr, maxAgeStr] = crewData.age_range.split("~");
          const min = parseInt(minAgeStr);
          const max = parseInt(maxAgeStr);
          if (!isNaN(min)) setMinAge(min);
          if (!isNaN(max)) setMaxAge(max);
        }

        if (crewData.activity_day) {
          const days = crewData.activity_day
            .replace("매주 ", "")
            .split(", ")
            .filter((day) =>
              ACTIVITY_DAYS.includes(day as ActivityDay)
            ) as ActivityDay[];
          setActivityDays(days);
        }

        if (crewData.join_methods && crewData.join_methods.length > 0) {
          const hasInstagramDm = crewData.join_methods.some(
            (m) => m.method_type === "instagram_dm"
          );
          if (hasInstagramDm) setUseInstagramDm(true);
          const openChatMethod = crewData.join_methods.find(
            (m) =>
              m.method_type === "open_chat" || m.method_type === "other"
          );
          if (openChatMethod && openChatMethod.link_url) {
            setOpenChatLink(openChatMethod.link_url);
            setUseOtherJoinMethod(true);
          }
        } else {
          // Legacy compat
          if (crewData.open_chat_link) {
            setOpenChatLink(crewData.open_chat_link);
            setUseOtherJoinMethod(true);
          }
          if (crewData.use_instagram_dm) setUseInstagramDm(true);
        }

        if (crewData.crew_photos && crewData.crew_photos.length > 0) {
          setExistingPhotos(
            crewData.crew_photos.map((p) => ({
              url: p.photo_url,
              id: p.id,
            }))
          );
        }
      } catch (e) {
        console.error("크루 정보 로드 실패:", e);
        toast.error("크루 정보를 불러오는데 실패했습니다.");
        router.push("/admin/crew");
      } finally {
        setIsLoading(false);
      }
    };

    loadCrew();

    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      crewPhotosPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId, router]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoImage(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCrewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxPhotos = 5;
    const availableSlots =
      maxPhotos - (existingPhotos.length + crewPhotos.length);
    if (availableSlots <= 0) {
      toast.error(`최대 ${maxPhotos}장의 사진만 업로드할 수 있습니다.`);
      return;
    }

    const newFiles = Array.from(files).slice(0, availableSlots);

    const invalidFiles = newFiles.filter(
      (f) =>
        f.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );

    if (invalidFiles.length > 0) {
      toast.error(
        "일부 파일이 너무 크거나 지원되지 않는 형식입니다. (최대 5MB, JPG/PNG/WebP)"
      );
      return;
    }

    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setCrewPhotos([...crewPhotos, ...newFiles]);
    setCrewPhotosPreviews([...crewPhotosPreviews, ...newPreviews]);
    e.target.value = "";
  };

  const removeCrewPhoto = (index: number) => {
    URL.revokeObjectURL(crewPhotosPreviews[index]);
    const photos = [...crewPhotos];
    const previews = [...crewPhotosPreviews];
    photos.splice(index, 1);
    previews.splice(index, 1);
    setCrewPhotos(photos);
    setCrewPhotosPreviews(previews);
  };

  const removeExistingPhoto = (index: number) => {
    const list = [...existingPhotos];
    list.splice(index, 1);
    setExistingPhotos(list);
  };

  const handleSelectFile = () => fileInputRef.current?.click();
  const handleSelectCrewPhotos = () => crewPhotosInputRef.current?.click();

  const handleAddActivityLocation = () => {
    const v = newActivityLocation.trim();
    if (!v) return;
    if (activityLocations.includes(v)) {
      toast.error("이미 추가된 활동 장소입니다.");
      return;
    }
    setActivityLocations([...activityLocations, v]);
    setNewActivityLocation("");
  };

  const handleRemoveActivityLocation = (location: string) => {
    setActivityLocations(activityLocations.filter((l) => l !== location));
  };

  const toggleActivityDay = (day: ActivityDay) => {
    if (activityDays.includes(day)) {
      setActivityDays(activityDays.filter((d) => d !== day));
    } else {
      setActivityDays([...activityDays, day]);
    }
  };

  const toggleInstagramDm = () => setUseInstagramDm(!useInstagramDm);
  const toggleOtherJoinMethod = () => {
    setUseOtherJoinMethod(!useOtherJoinMethod);
    if (!useOtherJoinMethod) setOpenChatLink("");
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crew) return;

    if (activityDays.length === 0) {
      toast.error("최소 하나의 활동 요일을 선택해주세요.");
      return;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("위도와 경도가 올바르지 않습니다.");
      return;
    }
    const isInKoreaRange =
      latitude >= 33 && latitude <= 39 && longitude >= 124 && longitude <= 132;
    if (!isInKoreaRange) {
      toast.warning(
        "위경도가 한국 범위를 벗어났습니다. 핀 위치를 확인해주세요."
      );
    }
    if (minAge < 0 || maxAge > 100 || minAge > maxAge) {
      toast.error("연령대를 올바르게 입력해주세요. (0~100, min ≤ max)");
      return;
    }
    if (useOtherJoinMethod && !openChatLink) {
      toast.error("오픈채팅 링크를 입력해주세요.");
      return;
    }
    if (useInstagramDm && !instagram) {
      toast.error("인스타그램 DM을 사용하려면 인스타 계정을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      let updatedImageUrl = crew?.logo_image;
      if (logoImage) {
        try {
          const url = await crewService.uploadCrewLogo(logoImage, crewId);
          if (url) updatedImageUrl = url;
        } catch (err) {
          console.error("로고 업로드 실패:", err);
          toast.error("로고 이미지 업로드에 실패했습니다.");
          setIsSaving(false);
          return;
        }
      }

      const uploadedPhotoUrls: string[] = [];
      if (crewPhotos.length > 0) {
        for (const photo of crewPhotos) {
          try {
            const url = await crewService.uploadCrewPhoto(photo, crewId);
            if (url) uploadedPhotoUrls.push(url);
          } catch (err) {
            console.error("크루 사진 업로드 실패:", err);
            toast.error("일부 크루 사진 업로드에 실패했습니다.");
          }
        }
      }

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
        age_range: { min_age: minAge, max_age: maxAge },
        logo_image_url: updatedImageUrl,
      };

      if (useInstagramDm) updateData.use_instagram_dm = true;
      if (useOtherJoinMethod && openChatLink)
        updateData.open_chat_link = openChatLink;
      if (existingPhotos.length > 0 || uploadedPhotoUrls.length > 0) {
        updateData.crew_photos = {
          existing: existingPhotos.map((p) => p.id),
          new: uploadedPhotoUrls,
        };
      }

      await crewService.updateCrew(crewId, updateData);
      await crewService.updateCrewVisibility(crewId, isVisible);

      toast.success("크루 정보가 업데이트되었습니다.");
      router.push("/admin/crew");
    } catch (err) {
      console.error("크루 정보 업데이트 실패:", err);
      if (err && typeof err === "object" && "message" in err) {
        toast.error(
          `업데이트 실패: ${(err as DatabaseError).message}`
        );
      } else {
        toast.error("크루 정보 업데이트에 실패했습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className='flex flex-col items-center justify-center min-h-screen bg-background'>
        <Loader2 className='w-6 h-6 text-[hsl(var(--lime))] animate-spin' />
        <KickerLabel tone='muted' className='mt-3 tracking-[0.2em]'>
          · LOADING CREW
        </KickerLabel>
      </main>
    );
  }

  // ── Form ─────────────────────────────────────────────────────
  return (
    <main className='min-h-screen bg-background pb-28'>
      {/* Sticky top bar — back / crew name / visibility badge */}
      <header className='sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-cart-rule'>
        <div className='flex items-center justify-between px-[18px] py-3 gap-2'>
          <button
            type='button'
            onClick={() => router.push("/admin/crew")}
            className='w-9 h-9 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center text-cart-ink active:scale-95 transition-transform flex-shrink-0'
            aria-label='크루 목록으로'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div className='flex-1 min-w-0 text-center'>
            <KickerLabel tone='lime' className='tracking-[0.22em]'>
              · CREW · EDIT
            </KickerLabel>
            <div className='font-display text-[15px] font-bold tracking-[-0.02em] text-cart-ink truncate'>
              {name || crew?.name || "—"}
            </div>
          </div>
          <div
            className={cn(
              "px-2 py-1 rounded-[4px] border font-mono text-[9px] tracking-[0.18em] font-bold uppercase flex items-center gap-1 flex-shrink-0",
              isVisible
                ? "border-[hsl(var(--lime))] text-[hsl(var(--lime))]"
                : "border-amber-400/40 text-amber-300"
            )}
          >
            {isVisible ? <Eye className='w-3 h-3' /> : <EyeOff className='w-3 h-3' />}
            {isVisible ? "LIVE" : "OFF"}
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className='px-[18px] pt-4 space-y-5'>
        {/* Visibility toggle as a top-level card — admin's most-used switch */}
        <Section
          kicker='VISIBILITY · 노출'
          title='지도에 표시'
          helper='꺼두면 사용자에게 보이지 않습니다.'
        >
          <div className='flex items-center justify-between'>
            <KickerLabel
              tone={isVisible ? "lime" : "muted"}
              className='tracking-[0.2em]'
            >
              {isVisible ? "● LIVE · 노출 중" : "○ HIDDEN · 비공개"}
            </KickerLabel>
            <Switch
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
          </div>
        </Section>

        {/* Logo */}
        <Section kicker='LOGO · 로고' title='크루 로고'>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={handleSelectFile}
              className='w-20 h-20 rounded-[4px] border border-cart-rule bg-cart-paper relative overflow-hidden active:scale-95 transition-transform flex-shrink-0'
              aria-label='로고 변경'
            >
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
                <div className='flex items-center justify-center w-full h-full font-display text-[24px] font-bold text-[hsl(var(--lime))]'>
                  {name.charAt(0) || "?"}
                </div>
              )}
            </button>

            <div className='flex-1 min-w-0 space-y-1.5'>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileChange}
                accept='image/jpeg,image/png,image/webp'
                className='hidden'
              />
              <button
                type='button'
                onClick={handleSelectFile}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform'
              >
                <Upload className='w-3 h-3' />
                {logoPreview || crew?.logo_image ? "변경" : "업로드"}
              </button>
              {logoImage && (
                <p className='text-[11px] text-cart-ink-60 font-mono truncate'>
                  ● {logoImage.name} · {Math.round(logoImage.size / 1024)}KB
                </p>
              )}
              <p className='text-[10px] text-cart-ink-40'>
                JPG · PNG · WebP / 최대 2MB
              </p>
            </div>
          </div>
        </Section>

        {/* Basic info */}
        <Section kicker='BASICS · 기본 정보' title='기본 정보'>
          <Field label='크루명' required>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={INPUT_CLS}
            />
          </Field>
          <Field label='개설일'>
            <input
              type='date'
              value={foundedDate}
              onChange={(e) => setFoundedDate(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label='인스타그램' helper='@ 제외'>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-cart-ink-60 text-[13px]'>
                @
              </span>
              <input
                type='text'
                value={instagram}
                onChange={(e) =>
                  setInstagram(e.target.value.replace(/^@/, ""))
                }
                placeholder='runhouse_official'
                className={INPUT_CLS + " pl-7"}
              />
            </div>
          </Field>
          <Field label='크루 소개' required>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
              className={
                "w-full px-3 py-2 min-h-[120px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 rounded-[4px] focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50 text-[13px]"
              }
            />
          </Field>
        </Section>

        {/* Age range */}
        <Section kicker='AGE · 연령대' title='연령대 범위'>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='최소'>
              <input
                type='number'
                min={0}
                max={100}
                value={minAge}
                onChange={(e) =>
                  setMinAge(parseInt(e.target.value) || 0)
                }
                className={INPUT_CLS}
              />
            </Field>
            <Field label='최대'>
              <input
                type='number'
                min={0}
                max={100}
                value={maxAge}
                onChange={(e) =>
                  setMaxAge(parseInt(e.target.value) || 100)
                }
                className={INPUT_CLS}
              />
            </Field>
          </div>
        </Section>

        {/* Activity days */}
        <Section
          kicker='DAYS · 활동 요일'
          title='정기 러닝 요일'
          helper='복수 선택 가능'
        >
          <div className='flex flex-wrap gap-1.5'>
            {ACTIVITY_DAYS.map((day) => {
              const active = activityDays.includes(day);
              return (
                <button
                  key={day}
                  type='button'
                  onClick={() => toggleActivityDay(day)}
                  className={cn(
                    "px-3 py-1.5 rounded-[4px] border font-mono text-[11px] tracking-[0.05em] font-semibold transition-colors active:scale-95",
                    active
                      ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
                      : "border-cart-rule text-cart-ink-60 hover:border-[hsl(var(--lime))]/40"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Location */}
        <Section
          kicker='LOCATION · 위치'
          title='지도 표시 위치'
          helper='핀을 드래그하거나 지도를 탭해서 정확한 모임 위치를 지정. 다른 크루(연한 lime 점)와 겹치지 않게.'
        >
          <Field label='대표 주소' required>
            <input
              type='text'
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              required
              className={INPUT_CLS}
              placeholder='서울특별시 …'
            />
          </Field>
          <Field label='상세 주소' helper='선택'>
            <input
              type='text'
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              className={INPUT_CLS}
              placeholder='건물명 · 층 · 미팅 포인트'
            />
          </Field>

          <CrewLocationPickerMap
            value={
              Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              (latitude !== 0 || longitude !== 0)
                ? { lat: latitude, lng: longitude }
                : null
            }
            onChange={(picked) => {
              setLatitude(picked.lat);
              setLongitude(picked.lng);
              if (picked.address && !mainAddress.trim()) {
                setMainAddress(picked.address);
              }
            }}
            otherCrews={contextCrews}
            height={280}
          />
          <KickerLabel tone='muted' className='tracking-[0.18em]'>
            ● LAT {latitude.toFixed(5)} / LNG {longitude.toFixed(5)}
          </KickerLabel>
        </Section>

        {/* Activity locations chips */}
        <Section
          kicker='SPOTS · 활동 장소'
          title='자주 만나는 장소'
          helper='최대 5개'
        >
          <div className='flex gap-2'>
            <input
              type='text'
              value={newActivityLocation}
              onChange={(e) => setNewActivityLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddActivityLocation();
                }
              }}
              placeholder='반포 한강공원'
              className={INPUT_CLS + " flex-1"}
            />
            <button
              type='button'
              onClick={handleAddActivityLocation}
              disabled={!newActivityLocation.trim()}
              className='px-3 py-1.5 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform disabled:opacity-40 flex items-center gap-1'
            >
              <Plus className='w-3 h-3' />
              추가
            </button>
          </div>
          {activityLocations.length > 0 ? (
            <div className='flex flex-wrap gap-1.5'>
              {activityLocations.map((loc) => (
                <div
                  key={loc}
                  className='flex items-center gap-1.5 px-3 py-1.5 bg-cart-paper border border-cart-rule rounded-[4px] text-[12px] text-cart-ink'
                >
                  <span>{loc}</span>
                  <button
                    type='button'
                    onClick={() => handleRemoveActivityLocation(loc)}
                    className='text-cart-ink-60 hover:text-[hsl(var(--lime))] active:scale-90 transition-transform'
                    aria-label={`${loc} 삭제`}
                  >
                    <X className='w-3 h-3' />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <KickerLabel tone='muted' className='tracking-[0.18em]'>
              · 등록된 활동 장소가 없습니다 ·
            </KickerLabel>
          )}
        </Section>

        {/* Join methods */}
        <Section
          kicker='JOIN · 가입 방식'
          title='가입 경로'
          helper='최소 1개 권장'
        >
          <div className='flex flex-wrap gap-1.5'>
            <button
              type='button'
              onClick={toggleInstagramDm}
              className={cn(
                "px-3 py-1.5 rounded-[4px] border font-mono text-[11px] tracking-[0.12em] uppercase font-semibold transition-colors active:scale-95 flex items-center gap-1.5",
                useInstagramDm
                  ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
                  : "border-cart-rule text-cart-ink-60 hover:border-[hsl(var(--lime))]/40"
              )}
            >
              {useInstagramDm && <Check className='w-3 h-3' />}
              Instagram DM
            </button>
            <button
              type='button'
              onClick={toggleOtherJoinMethod}
              className={cn(
                "px-3 py-1.5 rounded-[4px] border font-mono text-[11px] tracking-[0.12em] uppercase font-semibold transition-colors active:scale-95 flex items-center gap-1.5",
                useOtherJoinMethod
                  ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
                  : "border-cart-rule text-cart-ink-60 hover:border-[hsl(var(--lime))]/40"
              )}
            >
              {useOtherJoinMethod && <Check className='w-3 h-3' />}
              기타 / 오픈채팅
            </button>
          </div>

          {useInstagramDm && !instagram && (
            <div className='px-3 py-2 rounded-[4px] border border-amber-400/40 bg-amber-500/10'>
              <KickerLabel tone='muted' className='tracking-[0.18em] mb-1'>
                ● WARNING
              </KickerLabel>
              <p className='text-[11px] text-cart-ink-60'>
                인스타그램 DM 사용 시 위 인스타그램 계정을 먼저 입력해주세요.
              </p>
            </div>
          )}

          {useOtherJoinMethod && (
            <Field label='오픈채팅 / 기타 링크'>
              <input
                type='url'
                placeholder='https://open.kakao.com/…'
                value={openChatLink}
                onChange={(e) => setOpenChatLink(e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          )}
        </Section>

        {/* Photos */}
        <Section
          kicker='PHOTOS · 활동 사진'
          title='크루 대표 사진'
          helper={`현재 ${existingPhotos.length + crewPhotosPreviews.length}/5 · 최대 5장 · 5MB / JPG · PNG · WebP`}
        >
          <input
            type='file'
            ref={crewPhotosInputRef}
            onChange={handleCrewPhotoChange}
            accept='image/jpeg,image/png,image/webp'
            className='hidden'
            multiple
          />

          {(existingPhotos.length > 0 ||
            crewPhotosPreviews.length > 0 ||
            true) && (
            <div className='grid grid-cols-3 gap-2'>
              {existingPhotos.map((photo, index) => (
                <div
                  key={`existing-${photo.id}`}
                  className='relative aspect-square rounded-[4px] overflow-hidden border border-cart-rule bg-cart-paper'
                >
                  <Image
                    src={photo.url}
                    alt={`크루 활동 사진 ${index + 1}`}
                    fill
                    quality={20}
                    className='object-cover'
                    sizes='(max-width: 430px) 33vw, 140px'
                  />
                  <button
                    type='button'
                    onClick={() => removeExistingPhoto(index)}
                    className='absolute top-1 right-1 w-5 h-5 rounded-[4px] bg-background/90 border border-red-500/40 text-red-400 flex items-center justify-center active:scale-90 transition-transform'
                    aria-label='사진 삭제'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </div>
              ))}
              {crewPhotosPreviews.map((preview, index) => (
                <div
                  key={`new-${index}`}
                  className='relative aspect-square rounded-[4px] overflow-hidden border border-[hsl(var(--lime))]/40 bg-cart-paper'
                >
                  <Image
                    src={preview}
                    alt={`새 활동 사진 ${index + 1}`}
                    fill
                    quality={20}
                    className='object-cover'
                    sizes='(max-width: 430px) 33vw, 140px'
                  />
                  <span className='absolute top-1 left-1 font-mono text-[8px] tracking-[0.18em] font-bold uppercase px-1.5 py-0.5 rounded-[2px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))]'>
                    NEW
                  </span>
                  <button
                    type='button'
                    onClick={() => removeCrewPhoto(index)}
                    className='absolute top-1 right-1 w-5 h-5 rounded-[4px] bg-background/90 border border-red-500/40 text-red-400 flex items-center justify-center active:scale-90 transition-transform'
                    aria-label='사진 삭제'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </div>
              ))}
              {existingPhotos.length + crewPhotosPreviews.length < 5 && (
                <button
                  type='button'
                  onClick={handleSelectCrewPhotos}
                  className='aspect-square rounded-[4px] border border-dashed border-cart-rule bg-transparent text-cart-ink-60 hover:text-[hsl(var(--lime))] hover:border-[hsl(var(--lime))]/60 active:scale-95 transition-all flex flex-col items-center justify-center gap-1'
                >
                  <Upload className='w-4 h-4' />
                  <span className='font-mono text-[9px] tracking-[0.15em] uppercase font-semibold'>
                    추가
                  </span>
                </button>
              )}
            </div>
          )}
        </Section>

        {/* Spacer so sticky bottom CTA never covers the last card */}
        <div className='h-2' />
      </form>

      {/* Sticky bottom save action */}
      <div
        className='fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-background/95 backdrop-blur-md border-t border-cart-rule'
        style={{
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
          paddingTop: 12,
        }}
      >
        <div className='px-[18px] flex gap-2'>
          <button
            type='button'
            onClick={() => router.push("/admin/crew")}
            disabled={isSaving}
            className='px-4 py-3 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50'
          >
            취소
          </button>
          <button
            type='button'
            onClick={(e) => {
              const form = e.currentTarget.closest("main")?.querySelector("form");
              if (form) form.requestSubmit();
            }}
            disabled={isSaving}
            className='flex-1 py-3 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[14px] font-bold tracking-[-0.01em] active:scale-[0.98] transition-transform hover:bg-[hsl(var(--lime))]/90 disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {isSaving ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span className='font-mono text-[10px] tracking-[0.18em]'>
                  SAVING…
                </span>
              </>
            ) : (
              <>
                <Save className='w-4 h-4' />
                <span>저장</span>
                <span className='font-mono text-[10px] font-semibold tracking-[0.12em]'>
                  SAVE →
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Local presentation helpers ─────────────────────────────────────────

const INPUT_CLS =
  "px-3 py-2 w-full rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink text-[13px] placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50";

function Section({
  kicker,
  title,
  helper,
  children,
}: {
  kicker: string;
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section className='rounded-[4px] border border-cart-rule bg-cart-paper p-4 space-y-3'>
      <div className='space-y-1'>
        <KickerLabel tone='lime' className='tracking-[0.22em]'>
          · {kicker}
        </KickerLabel>
        <h2 className='font-display text-[16px] font-bold tracking-[-0.02em] text-cart-ink'>
          {title}
        </h2>
        {helper && (
          <p className='text-[11px] text-cart-ink-60 leading-relaxed'>
            {helper}
          </p>
        )}
      </div>
      <div className='space-y-3'>{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-1'>
      <label className='text-[11px] font-semibold text-cart-ink tracking-[-0.005em] flex items-center justify-between'>
        <span>
          {label}
          {required && (
            <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
          )}
        </span>
        {helper && (
          <span className='text-[10px] font-normal text-cart-ink-40'>
            {helper}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
