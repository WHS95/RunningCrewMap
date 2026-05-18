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
 *      activity locations, age range). Logo/photo edits stay out of v1
 *      since they require file upload plumbing.
 *   4. Submit → `updateCrewByToken`. If the location coord moved, server
 *      flips is_visible=false so admin re-reviews.
 */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
import { Loader2, Plus, X, ArrowLeft } from "lucide-react";

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
  hasSession?: boolean;  // ← Task 16 will use it
}

export function CrewEditClient({ crewId, initialToken }: Props) {
  const router = useRouter();

  type LoadState =
    | { phase: "loading" }
    | { phase: "denied"; reason: string }
    | { phase: "ready"; crew: CrewForEdit; token: string };
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
    if (!token) {
      setState({ phase: "denied", reason: "no-token" });
      return;
    }

    (async () => {
      const res = await getCrewForEdit(crewId, token);
      if (!mounted) return;
      if (res.error || !res.crew) {
        setState({
          phase: "denied",
          reason: res.error || "unknown",
        });
        return;
      }
      writeStoredToken(crewId, token);
      const crew = res.crew;
      setState({ phase: "ready", crew, token });
      // Seed form
      setName(crew.name);
      setDescription(crew.description);
      setInstagram(crew.instagram ?? "");
      setDays(parseDaysString(crew.activity_day));
      setAgeRange(crew.age_range ?? "");
      setMainAddress(crew.location.main_address);
      setActivityLocations(crew.activity_locations);
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
  }, [crewId, initialToken]);

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
      };
      const res = await updateCrewByToken(crewId, state.token, payload);
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
            URL의 토큰이 유효하지 않거나 만료되었습니다. 등록 시 사용한
            인스타그램 DM으로 받으신 수정 링크를 다시 확인해주세요.
          </p>
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
              <span>저장 중…</span>
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
