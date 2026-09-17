"use client";

/**
 * CrewEditClient — token-gated crew self-edit form.
 *
 * Flow:
 *   1. Token resolution: URL ?token=... first, then localStorage fallback.
 *   2. Server validation via `getCrewForEdit`. On success, persist the
 *      token to localStorage so the user can return on the same device.
 *      On failure, show a friendly "권한 없음" wall with a contact hint.
 *   3. Render a cartographic edit form scoped to user-editable fields
 *      (name, description, instagram, days, address, location pin,
 *      activity locations, age range, 대표 사진/활동 사진).
 *      사진은 브라우저에서 압축·WebP 변환 후 anon 클라이언트로 Storage에
 *      올리고(등록·어드민과 동일 경로), 얻은 URL만 서버 액션에 넘겨
 *      토큰 검증 뒤 DB에 반영한다. 교체로 밀려난 파일은 서버가 지운다.
 *   4. Submit → `updateCrewByToken`. If the location coord moved, server
 *      flips is_visible=false so admin re-reviews.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCrewForEdit,
  updateCrewByToken,
  type CrewForEdit,
  type CrewEditPayload,
} from "@/app/actions/crew";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";
import { CSS_VARIABLES } from "@/lib/constants";
import { Loader2, Plus, X, ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { crewService } from "@/lib/services/crew.service";
import { LogoCropDialog } from "@/components/dialog/LogoCropDialog";
import { CrewLogoPreview } from "@/components/crew/CrewLogoPreview";

/** 활동 사진 최대 장수 — 어드민 수정 페이지와 동일하게 맞춘다. */
const MAX_PHOTOS = 5;
const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp";
/** 활동 사진 원본 상한. 초과분은 업로드 단계에서 압축된다. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const CrewLocationPickerMap = dynamic(
  () => import("@/components/map/CrewLocationPickerMap"),
  { ssr: false }
);

const ACTIVITY_DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
type Day = (typeof ACTIVITY_DAYS)[number];

const TOKEN_LS_PREFIX = "crew_edit_token_";

function readStoredToken(id: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_LS_PREFIX + id);
  } catch {
    return null;
  }
}
function clearStoredToken(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_LS_PREFIX + id);
  } catch {
    /* quota / privacy mode — ignore */
  }
}
function writeStoredToken(id: string, token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_LS_PREFIX + id, token);
  } catch {
    /* quota / privacy mode — ignore */
  }
}

// Parse "20-39" / "10대~30대" style ranges into editable selects. We keep
// the raw string in state to avoid translation lossy round-tripping.
function parseDaysString(s: string | null): Day[] {
  if (!s) return [];
  const found: Day[] = [];
  ACTIVITY_DAYS.forEach((d) => {
    if (s.includes(d)) found.push(d);
  });
  return found;
}
function formatDaysString(days: Day[]): string {
  if (days.length === 0) return "";
  return days.map((d) => `${d}요일`).join(", ");
}

interface Props {
  crewId: string;
  initialToken: string | null;
  hasSession?: boolean;
}

export function CrewEditClient({ crewId, initialToken, hasSession = false }: Props) {
  const router = useRouter();

  type LoadState =
    | { phase: "loading" }
    | { phase: "denied"; reason: string }
    | { phase: "ready"; crew: CrewForEdit; token: string | null };
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  // Form state — initialized from the loaded crew below.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [ageRange, setAgeRange] = useState("");
  const [mainAddress, setMainAddress] = useState("");
  const [pickedLocation, setPickedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [activityLocations, setActivityLocations] = useState<string[]>([]);
  const [newActivityLocation, setNewActivityLocation] = useState("");

  // ── 사진 상태 ──
  // 로고: 새로 고른 파일이 있으면 그것을 업로드하고, 없으면 기존 URL 유지.
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // 활동 사진: 서버에 이미 있는 것(existingPhotos)과 새로 고른 것(newPhotos)을 분리.
  const [existingPhotos, setExistingPhotos] = useState<
    { id: string; photo_url: string }[]
  >([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  // ── Token resolution + initial fetch ──────────────────────────────
  useEffect(() => {
    let mounted = true;
    const token = initialToken || readStoredToken(crewId);

    // If we have neither token nor session, deny upfront.
    if (!token && !hasSession) {
      setState({ phase: "denied", reason: "no-token" });
      return;
    }

    (async () => {
      // token may be null when session-auth path is used
      const res = await getCrewForEdit(crewId, token);
      if (!mounted) return;
      if (res.error || !res.crew) {
        // 무효 토큰은 정리 — 다음 방문 때 PIN 세션 경로로 붙을 수 있게.
        if (res.error === "invalid-token") clearStoredToken(crewId);
        setState({
          phase: "denied",
          reason: res.error || "unknown",
        });
        return;
      }
      // 토큰이 낡았지만 PIN 세션으로 통과한 경우: 저장된 토큰을 버리고
      // 이후 저장 요청도 세션 경로(token=null)로 보낸다.
      const effectiveToken = res.tokenStale ? null : token;
      if (res.tokenStale) clearStoredToken(crewId);
      else if (token) writeStoredToken(crewId, token);
      const crew = res.crew;
      setState({ phase: "ready", crew, token: effectiveToken ?? null });
      // Seed form
      setName(crew.name);
      setDescription(crew.description);
      setInstagram(crew.instagram ?? "");
      setDays(parseDaysString(crew.activity_day));
      setAgeRange(crew.age_range ?? "");
      setMainAddress(crew.location.main_address);
      setActivityLocations(crew.activity_locations);
      setLogoPreview(crew.logo_image_url);
      setExistingPhotos(
        crew.photos.map((ph) => ({ id: ph.id, photo_url: ph.photo_url }))
      );
      if (crew.location.latitude && crew.location.longitude) {
        setPickedLocation({
          lat: crew.location.latitude,
          lng: crew.location.longitude,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [crewId, initialToken, hasSession]);

  // Existing pin moved? Compare to original to know if we should warn.
  const locationMoved = useMemo(() => {
    if (state.phase !== "ready" || !pickedLocation) return false;
    const orig = state.crew.location;
    return (
      Math.abs(pickedLocation.lat - orig.latitude) > 1e-6 ||
      Math.abs(pickedLocation.lng - orig.longitude) > 1e-6
    );
  }, [state, pickedLocation]);

  const toggleDay = (d: Day) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const addActivityLocation = () => {
    const v = newActivityLocation.trim();
    if (!v) return;
    if (activityLocations.includes(v)) return;
    setActivityLocations((prev) => [...prev, v]);
    setNewActivityLocation("");
  };
  const removeActivityLocation = (i: number) =>
    setActivityLocations((prev) => prev.filter((_, idx) => idx !== i));

  // ── 사진 핸들러 ────────────────────────────────────────────────
  // 로고는 등록 페이지와 같이 크롭 다이얼로그를 거친다(정사각 썸네일 품질).
  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setFeedback({ kind: "error", message: "대표 사진은 5MB 이하만 올릴 수 있어요." });
      return;
    }
    setPendingLogoFile(file);
  };
  const handleLogoCropped = (cropped: File) => {
    setPendingLogoFile(null);
    setLogoFile(cropped);
    setLogoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(cropped);
    });
  };
  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const totalPhotoCount = existingPhotos.length + newPhotos.length;
  const handlePhotosPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const room = MAX_PHOTOS - totalPhotoCount;
    if (room <= 0) {
      setFeedback({
        kind: "error",
        message: `활동 사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`,
      });
      return;
    }
    const accepted: File[] = [];
    for (const f of files.slice(0, room)) {
      if (f.size > MAX_PHOTO_BYTES) {
        setFeedback({ kind: "error", message: `${f.name}은(는) 5MB를 넘어요.` });
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    setNewPhotos((prev) => [...prev, ...accepted]);
    setNewPhotoPreviews((prev) => [
      ...prev,
      ...accepted.map((f) => URL.createObjectURL(f)),
    ]);
  };
  const removeExistingPhoto = (id: string) =>
    setExistingPhotos((prev) => prev.filter((ph) => ph.id !== id));
  const removeNewPhoto = (i: number) => {
    setNewPhotoPreviews((prev) => {
      const url = prev[i];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, idx) => idx !== i);
    });
    setNewPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  // 언마운트 시 objectURL 정리 (누수 방지)
  useEffect(() => {
    return () => {
      newPhotoPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newPhotoPreviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.phase !== "ready") return;
    if (isSaving) return;
    setFeedback(null);

    // Light client validation
    if (!name.trim()) {
      setFeedback({ kind: "error", message: "크루명을 입력해주세요." });
      return;
    }
    if (!mainAddress.trim()) {
      setFeedback({
        kind: "error",
        message: "지도 표시 위치(주소)를 입력해주세요.",
      });
      return;
    }
    if (!pickedLocation) {
      setFeedback({
        kind: "error",
        message: "지도에서 핀 위치를 지정해주세요.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // 사진은 먼저 Storage에 올리고 URL만 서버 액션에 넘긴다.
      // (압축·WebP 변환이 브라우저 전용이라 서버로 못 옮긴다)
      let logoPayload: CrewEditPayload["logo"];
      if (logoFile) {
        setUploadingLabel("대표 사진 업로드 중…");
        const uploaded = await crewService.uploadCrewLogo(logoFile, crewId);
        if (!uploaded) {
          setFeedback({
            kind: "error",
            message: "대표 사진 업로드에 실패했어요. 잠시 후 다시 시도해주세요.",
          });
          return;
        }
        logoPayload = {
          image_url: uploaded.logo_image,
          thumb_url: uploaded.logo_thumb_url ?? null,
        };
      } else if (state.crew.logo_image_url && logoPreview === null) {
        // 기존 로고를 지운 경우
        logoPayload = null;
      }

      let photosPayload: CrewEditPayload["photos"];
      const photosTouched =
        newPhotos.length > 0 ||
        existingPhotos.length !== state.crew.photos.length;
      if (photosTouched) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < newPhotos.length; i++) {
          setUploadingLabel(
            `활동 사진 업로드 중… (${i + 1}/${newPhotos.length})`
          );
          const url = await crewService.uploadCrewPhoto(newPhotos[i], crewId);
          if (url) uploadedUrls.push(url);
        }
        if (uploadedUrls.length < newPhotos.length) {
          setFeedback({
            kind: "error",
            message: "일부 활동 사진 업로드에 실패했어요. 다시 시도해주세요.",
          });
          return;
        }
        photosPayload = {
          existing: existingPhotos.map((ph) => ph.id),
          new: uploadedUrls,
        };
      }
      setUploadingLabel(null);

      const payload: CrewEditPayload = {
        name: name.trim(),
        description: description.trim(),
        instagram: instagram.trim() || null,
        activity_day: formatDaysString(days) || null,
        age_range: ageRange.trim() || null,
        activity_locations: activityLocations,
        location: {
          main_address: mainAddress.trim(),
          latitude: pickedLocation.lat,
          longitude: pickedLocation.lng,
        },
        ...(logoPayload !== undefined ? { logo: logoPayload } : {}),
        ...(photosPayload ? { photos: photosPayload } : {}),
      };
      const res = await updateCrewByToken(crewId, state.token || null, payload);
      if (!res.success) {
        setFeedback({
          kind: "error",
          message: `저장 실패: ${res.error || "알 수 없는 오류"}`,
        });
        return;
      }
      if ((res.changedFields?.length ?? 0) === 0) {
        setFeedback({
          kind: "success",
          message: "변경된 내용이 없습니다.",
        });
      } else {
        // 업로드가 반영됐으니 로컬 대기 목록을 비워 재저장 시 중복 업로드를 막는다.
        setLogoFile(null);
        setNewPhotos([]);
        setNewPhotoPreviews((prev) => {
          prev.forEach((u) => URL.revokeObjectURL(u));
          return [];
        });
        // 저장 직후 서버 상태를 다시 읽어 사진 id를 최신화한다.
        // 이걸 건너뛰면 방금 추가한 사진이 existing 목록에 없어서,
        // 이어서 한 번 더 저장할 때 서버가 그 사진을 지워버린다.
        const refreshed = await getCrewForEdit(crewId, state.token || null);
        if (refreshed.crew) {
          const fresh = refreshed.crew;
          setState({ phase: "ready", crew: fresh, token: state.token ?? null });
          setExistingPhotos(
            fresh.photos.map((ph) => ({ id: ph.id, photo_url: ph.photo_url }))
          );
          setLogoPreview((prev) => {
            if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
            return fresh.logo_image_url;
          });
        }
        setFeedback({
          kind: "success",
          message: res.visibilityReset
            ? "저장되었습니다. 위치가 변경되어 관리자 재승인 후 다시 노출됩니다."
            : `저장되었습니다 · ${res.changedFields?.join(", ")}`,
        });
      }
    } catch (err) {
      console.error("updateCrewByToken threw:", err);
      setFeedback({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "저장 중 오류가 발생했습니다.",
      });
    } finally {
      setUploadingLabel(null);
      setIsSaving(false);
    }
  };

  if (state.phase === "loading") {
    return (
      <div
        className='flex flex-col items-center justify-center min-h-screen bg-background'
        style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}
      >
        <Loader2 className='w-6 h-6 text-[hsl(var(--lime))] animate-spin' />
        <KickerLabel tone='muted' className='mt-3 tracking-[0.2em]'>
          · LOADING CREW
        </KickerLabel>
      </div>
    );
  }

  if (state.phase === "denied") {
    return (
      <div
        className='flex flex-col items-center justify-center min-h-screen bg-background px-6'
        style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}
      >
        <div className='w-full max-w-sm bg-cart-paper border border-cart-rule rounded-[4px] p-6 text-center'>
          <KickerLabel tone='lime' className='mb-2'>
            · ACCESS · DENIED
          </KickerLabel>
          <h1 className='font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink mb-1.5'>
            수정 권한이 없습니다
          </h1>
          <p className='text-[12px] text-cart-ink-60 leading-relaxed mb-5'>
            다시 로그인하시거나 등록 시 받으신 수정 링크를 확인해주세요.
          </p>
          <Link
            href='/crew/edit/login'
            className='block w-full py-2.5 rounded-[4px] bg-lime text-lime-foreground font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all mb-2'
          >
            로그인
          </Link>
          <button
            onClick={() => router.push("/")}
            className='w-full py-2.5 rounded-[4px] border border-cart-rule bg-background text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all'
          >
            지도로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // state.phase === "ready"
  const crew = state.crew;

  return (
    <main
      className='flex flex-col min-h-screen bg-background'
      style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING, paddingBottom: 80 }}
    >
      <div className='px-[18px] pt-2 flex items-center justify-between'>
        <button
          type='button'
          onClick={() => router.back()}
          className='w-9 h-9 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center text-cart-ink active:scale-95 transition-transform'
          aria-label='뒤로'
        >
          <ArrowLeft className='w-4 h-4' />
        </button>
        {!crew.is_visible && (
          <KickerLabel tone='muted' className='tracking-[0.2em]'>
            ● PENDING APPROVAL
          </KickerLabel>
        )}
      </div>

      <CartographicHeader
        kicker={`CREW · SELF-EDIT · ${crewId.slice(0, 6).toUpperCase()}`}
        title={crew.name}
      />

      <form onSubmit={handleSubmit} className='px-[22px] space-y-6'>
        {/* Crew name */}
        <FormSection label='크루명' required>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            className={INPUT_CLS}
            placeholder='크루 이름'
          />
        </FormSection>

        {/* Instagram */}
        <FormSection label='인스타그램' helper='@ 제외하고 아이디만'>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-cart-ink-60 text-[13px]'>
              @
            </span>
            <input
              type='text'
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
              disabled={isSaving}
              className={INPUT_CLS + " pl-7"}
              placeholder='runhouse_official'
            />
          </div>
        </FormSection>

        {/* Description */}
        <FormSection label='크루 소개'>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
            className={
              "w-full px-3 py-2 min-h-[120px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 rounded-[4px] focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50"
            }
            placeholder='크루 소개를 자유롭게 작성해주세요.'
          />
        </FormSection>

        {/* 대표 사진 (로고) */}
        <FormSection
          label='대표 사진'
          helper='지도 마커와 목록에 쓰이는 사진이에요 · 5MB 이하 · JPG/PNG/WebP'
        >
          <div className='flex items-center gap-3'>
            <div className='relative w-[76px] h-[76px] shrink-0 rounded-[4px] overflow-hidden border border-cart-rule bg-cart-paper'>
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt='대표 사진 미리보기'
                  fill
                  sizes='76px'
                  unoptimized
                  className='object-cover'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center text-cart-ink-40'>
                  <ImagePlus className='w-5 h-5' />
                </div>
              )}
            </div>
            <div className='flex flex-col gap-1.5'>
              <button
                type='button'
                onClick={() => logoInputRef.current?.click()}
                disabled={isSaving}
                className='px-3 py-1.5 rounded-[4px] border border-cart-rule text-[13px] text-cart-ink hover:border-[hsl(var(--lime))] transition-colors disabled:opacity-50'
              >
                {logoPreview ? "다른 사진으로 변경" : "사진 선택"}
              </button>
              {logoPreview && (
                <button
                  type='button'
                  onClick={clearLogo}
                  disabled={isSaving}
                  className='px-3 py-1.5 rounded-[4px] text-[12px] text-cart-ink-60 hover:text-cart-ink transition-colors disabled:opacity-50 text-left'
                >
                  사진 삭제
                </button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type='file'
              accept={ACCEPT_IMAGE}
              onChange={handleLogoPick}
              className='hidden'
            />
          </div>

          {/* 고른 사진이 지도 마커·크루 목록에서 실제로 어떻게 보이는지 */}
          <div className='pt-1'>
            <CrewLogoPreview logoUrl={logoPreview} crewName={name} />
          </div>
        </FormSection>

        {/* 활동 사진 */}
        <FormSection
          label='활동 사진'
          helper={`크루 상세에 보여요 · ${totalPhotoCount}/${MAX_PHOTOS}장 · 5MB 이하`}
        >
          <div className='grid grid-cols-3 gap-2'>
            {existingPhotos.map((ph) => (
              <div
                key={ph.id}
                className='relative aspect-square rounded-[4px] overflow-hidden border border-cart-rule'
              >
                <Image
                  src={ph.photo_url}
                  alt='활동 사진'
                  fill
                  sizes='(max-width: 430px) 33vw, 120px'
                  unoptimized
                  className='object-cover'
                />
                <button
                  type='button'
                  onClick={() => removeExistingPhoto(ph.id)}
                  disabled={isSaving}
                  aria-label='사진 삭제'
                  className='absolute top-1 right-1 w-6 h-6 rounded-[3px] bg-black/70 text-white flex items-center justify-center disabled:opacity-50'
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              </div>
            ))}
            {newPhotoPreviews.map((url, i) => (
              <div
                key={url}
                className='relative aspect-square rounded-[4px] overflow-hidden border border-[hsl(var(--lime))]'
              >
                <Image
                  src={url}
                  alt='추가한 활동 사진'
                  fill
                  sizes='(max-width: 430px) 33vw, 120px'
                  unoptimized
                  className='object-cover'
                />
                <span className='absolute bottom-1 left-1 px-1 py-0.5 rounded-[2px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-mono text-[9px] font-bold tracking-[0.08em]'>
                  NEW
                </span>
                <button
                  type='button'
                  onClick={() => removeNewPhoto(i)}
                  disabled={isSaving}
                  aria-label='사진 삭제'
                  className='absolute top-1 right-1 w-6 h-6 rounded-[3px] bg-black/70 text-white flex items-center justify-center disabled:opacity-50'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            ))}
            {totalPhotoCount < MAX_PHOTOS && (
              <button
                type='button'
                onClick={() => photosInputRef.current?.click()}
                disabled={isSaving}
                className='aspect-square rounded-[4px] border border-dashed border-cart-rule flex flex-col items-center justify-center gap-1 text-cart-ink-40 hover:border-[hsl(var(--lime))] hover:text-cart-ink transition-colors disabled:opacity-50'
              >
                <Plus className='w-4 h-4' />
                <span className='font-mono text-[10px] tracking-[0.08em]'>
                  ADD
                </span>
              </button>
            )}
          </div>
          <input
            ref={photosInputRef}
            type='file'
            accept={ACCEPT_IMAGE}
            multiple
            onChange={handlePhotosPick}
            className='hidden'
          />
        </FormSection>

        {/* Activity days */}
        <FormSection label='정기 러닝 요일'>
          <div className='flex flex-wrap gap-1.5'>
            {ACTIVITY_DAYS.map((d) => {
              const active = days.includes(d);
              return (
                <button
                  key={d}
                  type='button'
                  onClick={() => toggleDay(d)}
                  disabled={isSaving}
                  className={`px-3 py-1.5 rounded-[4px] border font-mono text-[11px] tracking-[0.05em] font-semibold transition-colors active:scale-95 ${
                    active
                      ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
                      : "border-cart-rule text-cart-ink-60 hover:border-[hsl(var(--lime))]/40"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </FormSection>

        {/* Age range */}
        <FormSection label='연령대' helper='예: 20~30대, 자유'>
          <input
            type='text'
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            disabled={isSaving}
            className={INPUT_CLS}
            placeholder='20~30대'
          />
        </FormSection>

        {/* Map location */}
        <FormSection
          label='지도 표시 위치'
          required
          helper='지도를 탭하거나 핀을 끌어 정확한 모임 위치를 지정해주세요.'
        >
          <CrewLocationPickerMap
            value={pickedLocation}
            onChange={(picked) => {
              setPickedLocation(picked);
              if (picked.address && !mainAddress.trim()) {
                setMainAddress(picked.address);
              }
            }}
          />
          <input
            type='text'
            value={mainAddress}
            onChange={(e) => setMainAddress(e.target.value)}
            disabled={isSaving}
            placeholder='서울특별시 ...'
            className={INPUT_CLS + " mt-3"}
          />
          {pickedLocation && (
            <KickerLabel
              tone={locationMoved ? "lime" : "muted"}
              className='tracking-[0.18em] mt-2'
            >
              {locationMoved
                ? `● 위치 이동됨 · 저장 시 재승인 필요 · LAT ${pickedLocation.lat.toFixed(5)} / LNG ${pickedLocation.lng.toFixed(5)}`
                : `· 현재 위치 · LAT ${pickedLocation.lat.toFixed(5)} / LNG ${pickedLocation.lng.toFixed(5)}`}
            </KickerLabel>
          )}
        </FormSection>

        {/* Activity locations (chips) */}
        <FormSection label='활동 장소' helper='최대 5개'>
          <div className='flex gap-2'>
            <input
              type='text'
              value={newActivityLocation}
              onChange={(e) => setNewActivityLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addActivityLocation();
                }
              }}
              disabled={isSaving || activityLocations.length >= 5}
              placeholder='반포 한강공원'
              className={INPUT_CLS + " flex-1"}
            />
            <button
              type='button'
              onClick={addActivityLocation}
              disabled={
                isSaving ||
                !newActivityLocation.trim() ||
                activityLocations.length >= 5
              }
              className='px-3 py-1.5 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-mono text-[10px] tracking-[0.18em] uppercase font-semibold active:scale-95 transition-transform disabled:opacity-40 flex items-center gap-1'
            >
              <Plus className='w-3 h-3' />
              추가
            </button>
          </div>
          {activityLocations.length > 0 && (
            <div className='flex flex-wrap gap-1.5 mt-3'>
              {activityLocations.map((loc, idx) => (
                <div
                  key={idx}
                  className='flex items-center gap-1.5 px-3 py-1.5 bg-cart-paper border border-cart-rule rounded-[4px] text-[12px] text-cart-ink'
                >
                  <span>{loc}</span>
                  <button
                    type='button'
                    onClick={() => removeActivityLocation(idx)}
                    disabled={isSaving}
                    className='text-cart-ink-60 hover:text-[hsl(var(--lime))] active:scale-90 transition-transform'
                    aria-label={`${loc} 삭제`}
                  >
                    <X className='w-3 h-3' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        {/* Feedback */}
        {feedback && (
          <div
            className={`rounded-[4px] border px-3 py-2.5 ${
              feedback.kind === "success"
                ? "border-[hsl(var(--lime))]/40 bg-[hsl(var(--lime))]/10"
                : "border-red-500/40 bg-red-500/10"
            }`}
          >
            <KickerLabel
              tone={feedback.kind === "success" ? "lime" : "muted"}
              className='tracking-[0.18em] mb-1'
            >
              {feedback.kind === "success" ? "● SAVED" : "● ERROR"}
            </KickerLabel>
            <p className='text-[12px] text-cart-ink'>{feedback.message}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type='submit'
          disabled={isSaving}
          className='w-full py-3.5 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[15px] font-bold tracking-[-0.01em] active:scale-[0.98] transition-transform hover:bg-[hsl(var(--lime))]/90 disabled:opacity-50 flex items-center justify-center gap-2'
        >
          {isSaving ? (
            <>
              <Loader2 className='w-4 h-4 animate-spin' />
              <span>{uploadingLabel ?? "저장 중…"}</span>
            </>
          ) : (
            <>
              <span>수정사항 저장하기</span>
              <span className='font-mono text-[10px] font-semibold tracking-[0.12em]'>
                SAVE →
              </span>
            </>
          )}
        </button>

        <KickerLabel tone='muted' className='text-center tracking-[0.18em]'>
          · 위치를 옮기면 자동으로 재승인 대기로 전환됩니다 ·
        </KickerLabel>
      </form>

      {pendingLogoFile && (
        <LogoCropDialog
          file={pendingLogoFile}
          onCancel={() => setPendingLogoFile(null)}
          onConfirm={handleLogoCropped}
        />
      )}
    </main>
  );
}

// ── Local helpers ───────────────────────────────────────────────────────

const INPUT_CLS =
  "px-3 py-2 w-full rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50";

function FormSection({
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
    <div className='space-y-2'>
      <label className='text-[13px] font-semibold text-cart-ink tracking-[-0.005em]'>
        {label}
        {required && (
          <span className='ml-1 text-[hsl(var(--lime))]'>*</span>
        )}
      </label>
      {helper && <p className='text-[11px] text-cart-ink-60'>{helper}</p>}
      {children}
    </div>
  );
}
