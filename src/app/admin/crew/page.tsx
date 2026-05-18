"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import type { Crew } from "@/lib/types/crew";
import { crewService } from "@/lib/services/crew.service";
import { rotateCrewEditToken } from "@/app/actions/crew";
import { clearCrewPinAdmin } from "@/app/actions/crewAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Pencil,
  Trash2,
  AlertTriangle,
  Search,
  ArrowLeft,
  Link2,
  RotateCw,
  KeyRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";
import { cn } from "@/lib/utils";

interface AdminCrew extends Crew {
  is_visible: boolean;
}

type FilterTab = "all" | "visible" | "hidden";

export default function AdminCrewPage() {
  const router = useRouter();
  const [crews, setCrews] = useState<AdminCrew[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [crewToDelete, setCrewToDelete] = useState<AdminCrew | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [rotatingTokenFor, setRotatingTokenFor] = useState<string | null>(null);
  const [resettingPinFor, setResettingPinFor] = useState<string | null>(null);

  useEffect(() => {
    fetchCrews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the search query so we don't run the filter on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filteredCrews = useMemo(() => {
    let filtered = [...crews];
    if (activeTab === "visible") {
      filtered = filtered.filter((c) => c.is_visible);
    } else if (activeTab === "hidden") {
      filtered = filtered.filter((c) => !c.is_visible);
    }
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((c) => {
        const name = c.name.toLowerCase();
        const ig = c.instagram?.toLowerCase() || "";
        const addr = c.location.main_address?.toLowerCase() || "";
        return name.includes(q) || ig.includes(q) || addr.includes(q);
      });
    }
    return filtered;
  }, [crews, activeTab, debouncedSearchQuery]);

  const fetchCrews = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await crewService.getAdminCrews();
      setCrews(data);
    } catch (e) {
      console.error("크루 목록 조회 실패:", e);
      toast.error("크루 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleCrewVisibility = useCallback(
    async (crewId: string, newValue: boolean) => {
      try {
        await crewService.updateCrewVisibility(crewId, newValue);
        let crewName = "";
        setCrews((prev) =>
          prev.map((c) => {
            if (c.id === crewId) {
              crewName = c.name;
              return { ...c, is_visible: newValue };
            }
            return c;
          })
        );
        toast.success(
          `${crewName} 크루가 ${newValue ? "표시" : "숨김"} 처리되었습니다.`
        );
      } catch (e) {
        console.error("크루 표시 상태 변경 실패:", e);
        toast.error("크루 표시 상태 변경에 실패했습니다.");
      }
    },
    []
  );

  const handleCrewClick = useCallback(async (crew: AdminCrew) => {
    try {
      const detailed = await crewService.getCrewDetail(crew.id);
      setSelectedCrew(detailed || crew);
    } catch (e) {
      console.error("크루 상세 정보 조회 실패:", e);
      setSelectedCrew(crew);
    }
    setIsDetailOpen(true);
  }, []);

  const handleEditCrew = useCallback(
    (crew: AdminCrew) => router.push(`/admin/crew/edit/${crew.id}`),
    [router]
  );

  const handleDeleteClick = useCallback(
    (crew: AdminCrew, e: React.MouseEvent) => {
      e.stopPropagation();
      setCrewToDelete(crew);
      setIsDeleteDialogOpen(true);
    },
    []
  );

  const handleDeleteCrew = useCallback(async () => {
    if (!crewToDelete) return;
    try {
      setIsDeleting(true);
      await crewService.deleteCrew(crewToDelete.id);
      toast.success(`${crewToDelete.name} 크루가 삭제되었습니다.`);
      setCrews((prev) => prev.filter((c) => c.id !== crewToDelete.id));
      setIsDeleteDialogOpen(false);
      setCrewToDelete(null);
    } catch (e) {
      console.error("크루 삭제 실패:", e);
      toast.error("크루 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [crewToDelete]);

  // Rotate the edit token + copy the new self-edit URL to clipboard so the
  // admin can DM it on Instagram. Used when a previously-shared link is
  // suspected to have leaked.
  const handleRotateToken = useCallback(async (crew: AdminCrew) => {
    setRotatingTokenFor(crew.id);
    try {
      const res = await rotateCrewEditToken(crew.id);
      if (!res.success || !res.newToken) {
        toast.error(res.error || "토큰 재발급에 실패했습니다.");
        return;
      }
      const url = `${window.location.origin}/crew/edit/${crew.id}?token=${res.newToken}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("새 자가-편집 URL이 클립보드에 복사되었습니다.");
      } catch {
        toast.success(`새 URL: ${url}`);
      }
    } catch (e) {
      console.error("rotateCrewEditToken failed:", e);
      toast.error("토큰 재발급 중 오류가 발생했습니다.");
    } finally {
      setRotatingTokenFor(null);
    }
  }, []);

  // Admin-only: clear the crew's PIN, rotate edit_token, invalidate sessions.
  // Used when crew leader requests PIN reset via Instagram DM.
  const handleClearPin = useCallback(async (crew: AdminCrew) => {
    const ok = window.confirm(
      `'${crew.name}' 크루의 PIN을 초기화하시겠어요?\n새 수정 링크가 발급되며 기존 세션은 모두 만료됩니다.`
    );
    if (!ok) return;
    setResettingPinFor(crew.id);
    try {
      const res = await clearCrewPinAdmin(crew.id);
      if (!res.ok) {
        toast.error(
          res.reason === "unauthorized"
            ? "권한이 없습니다."
            : "PIN 초기화에 실패했습니다."
        );
        return;
      }
      const url = `${window.location.origin}/crew/edit/${crew.id}?token=${res.newEditToken}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("PIN 초기화 완료. 새 수정 링크가 클립보드에 복사되었습니다.");
      } catch {
        toast.success(`PIN 초기화 완료. 새 URL: ${url}`);
      }
    } catch (e) {
      console.error("clearCrewPinAdmin failed:", e);
      toast.error("PIN 초기화 중 오류가 발생했습니다.");
    } finally {
      setResettingPinFor(null);
    }
  }, []);

  const counts = useMemo(
    () => ({
      all: crews.length,
      visible: crews.filter((c) => c.is_visible).length,
      hidden: crews.filter((c) => !c.is_visible).length,
    }),
    [crews]
  );

  return (
    <main className='min-h-screen bg-background pb-16'>
      {/* Top bar */}
      <div className='flex items-center justify-between px-[22px] pt-6'>
        <button
          type='button'
          onClick={() => router.push("/admin")}
          className='w-9 h-9 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center text-cart-ink active:scale-95 transition-transform'
          aria-label='관리자 대시보드로'
        >
          <ArrowLeft className='w-4 h-4' />
        </button>
        <KickerLabel tone='muted' className='tracking-[0.22em]'>
          TOTAL · {counts.all.toString().padStart(3, "0")}
        </KickerLabel>
      </div>

      <CartographicHeader
        kicker={`ADMIN · CREWS · ${counts.all.toString().padStart(3, "0")} REGISTERED`}
        title='크루 관리'
      />

      {/* Tabs + search */}
      <div className='sticky top-0 z-10 px-[22px] pb-3 bg-background/95 backdrop-blur-md border-b border-cart-rule'>
        {/* Compact pill tabs — fit comfortably in the mobile frame and
            keep the count visible inline with the label. */}
        <div className='flex gap-1.5 mb-3'>
          {(
            [
              { value: "all", en: "ALL", n: counts.all },
              { value: "visible", en: "LIVE", n: counts.visible },
              { value: "hidden", en: "PENDING", n: counts.hidden },
            ] as const
          ).map((t) => {
            const active = activeTab === t.value;
            return (
              <button
                key={t.value}
                type='button'
                onClick={() => setActiveTab(t.value as FilterTab)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-[4px] border font-mono text-[10px] tracking-[0.1em] uppercase font-semibold transition-colors active:scale-95 inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
                  active
                    ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
                    : "border-cart-rule text-cart-ink-60 hover:border-[hsl(var(--lime))]/40"
                )}
              >
                <span>{t.en}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    active ? "opacity-80" : "text-cart-ink-40"
                  )}
                >
                  {t.n.toString().padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cart-ink-60' />
          <input
            type='text'
            placeholder='크루명 · 인스타 · 주소'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-9 pr-9 py-2 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors text-[13px]'
          />
          {searchQuery && (
            <button
              type='button'
              onClick={() => setSearchQuery("")}
              className='absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-[2px] flex items-center justify-center text-cart-ink-60 hover:text-cart-ink'
              aria-label='검색어 지우기'
            >
              <X className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className='px-[22px]'>
        {isLoading ? (
          <KickerLabel
            tone='muted'
            className='text-center py-12 tracking-[0.2em]'
          >
            · LOADING CREWS ·
          </KickerLabel>
        ) : filteredCrews.length === 0 ? (
          <KickerLabel
            tone='muted'
            className='text-center py-12 tracking-[0.2em]'
          >
            · NO CREWS MATCHED ·
          </KickerLabel>
        ) : (
          <div>
            {filteredCrews.map((crew, idx) => (
              <div
                key={crew.id}
                className={cn(
                  "py-3.5",
                  idx > 0 && "border-t border-cart-rule"
                )}
              >
                {/* Row 1 — info: rank + logo + name + meta, no buttons.
                    Crew name + addr + instagram get the full row width. */}
                <div
                  className='flex items-start gap-3 cursor-pointer'
                  onClick={() => handleCrewClick(crew)}
                >
                  <div className='w-7 pt-1 font-mono text-[11px] tracking-[0.05em] text-cart-ink-60 tabular-nums flex-shrink-0'>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  {crew.logo_image ? (
                    <Image
                      src={crew.logo_image}
                      alt={`${crew.name} 로고`}
                      width={44}
                      height={44}
                      quality={20}
                      className='object-cover w-11 h-11 rounded-[4px] border border-cart-rule flex-shrink-0'
                      style={{ width: "44px", height: "44px" }}
                    />
                  ) : (
                    <div className='flex justify-center items-center w-11 h-11 rounded-[4px] bg-cart-paper border border-cart-rule font-display text-[15px] font-bold text-[hsl(var(--lime))] flex-shrink-0'>
                      {crew.name.charAt(0)}
                    </div>
                  )}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <span className='text-[14px] font-semibold text-cart-ink break-keep'>
                        {crew.name}
                      </span>
                      {!crew.is_visible && (
                        <span className='font-mono text-[8px] tracking-[0.15em] font-bold uppercase px-1.5 py-0.5 rounded-[2px] border border-amber-400/40 text-amber-300 flex-shrink-0'>
                          PENDING
                        </span>
                      )}
                    </div>
                    <div className='font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 truncate mt-0.5'>
                      {crew.location.main_address || "—"}
                    </div>
                    {crew.instagram && (
                      <div className='font-mono text-[10px] tracking-[0.04em] text-[hsl(var(--lime))] truncate'>
                        @{crew.instagram}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2 — actions: full-width strip below the info, no
                    competing for horizontal space with the name. */}
                <div className='flex items-center gap-1.5 mt-2.5 pl-[40px]'>
                  <button
                    type='button'
                    onClick={() => handleRotateToken(crew)}
                    disabled={rotatingTokenFor === crew.id}
                    title='수정 URL 재발급 + 복사'
                    className='flex-1 h-8 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center gap-1 text-cart-ink-60 hover:text-[hsl(var(--lime))] active:scale-95 transition-all disabled:opacity-50'
                  >
                    {rotatingTokenFor === crew.id ? (
                      <RotateCw className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <Link2 className='w-3.5 h-3.5' />
                    )}
                    <span className='font-mono text-[9px] tracking-[0.15em] uppercase font-semibold'>
                      URL
                    </span>
                  </button>
                  <button
                    type='button'
                    onClick={() => handleClearPin(crew)}
                    disabled={resettingPinFor === crew.id}
                    title='PIN 초기화 + 새 URL 발급'
                    className='flex-1 h-8 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center gap-1 text-cart-ink-60 hover:text-[hsl(var(--lime))] active:scale-95 transition-all disabled:opacity-50'
                  >
                    {resettingPinFor === crew.id ? (
                      <RotateCw className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <KeyRound className='w-3.5 h-3.5' />
                    )}
                    <span className='font-mono text-[9px] tracking-[0.15em] uppercase font-semibold'>
                      PIN
                    </span>
                  </button>
                  <button
                    type='button'
                    onClick={() => handleEditCrew(crew)}
                    title='크루 정보 수정'
                    className='flex-1 h-8 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center gap-1 text-cart-ink-60 hover:text-cart-ink active:scale-95 transition-all'
                  >
                    <Pencil className='w-3.5 h-3.5' />
                    <span className='font-mono text-[9px] tracking-[0.15em] uppercase font-semibold'>
                      EDIT
                    </span>
                  </button>
                  <button
                    type='button'
                    onClick={(e) => handleDeleteClick(crew, e)}
                    title='크루 삭제'
                    className='flex-1 h-8 rounded-[4px] border border-red-500/40 bg-cart-paper flex items-center justify-center gap-1 text-red-400 hover:bg-red-500/10 active:scale-95 transition-all'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    <span className='font-mono text-[9px] tracking-[0.15em] uppercase font-semibold'>
                      DEL
                    </span>
                  </button>
                  {/* Visibility toggle — kept compact with a tiny mono label
                      so admin can tell at a glance what it controls. */}
                  <div className='flex items-center gap-1.5 h-8 px-2 rounded-[4px] border border-cart-rule bg-cart-paper'>
                    <span
                      className={cn(
                        "font-mono text-[9px] tracking-[0.15em] uppercase font-semibold",
                        crew.is_visible
                          ? "text-[hsl(var(--lime))]"
                          : "text-cart-ink-40"
                      )}
                    >
                      {crew.is_visible ? "LIVE" : "OFF"}
                    </span>
                    <Switch
                      checked={crew.is_visible}
                      onCheckedChange={(checked) =>
                        toggleCrewVisibility(crew.id, checked)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {isDetailOpen && selectedCrew && (
        <CrewDetailView
          crew={selectedCrew}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedCrew(null);
          }}
        />
      )}

      {/* Delete dialog — cartographic */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className='bg-cart-paper border border-cart-rule rounded-[4px] p-0 overflow-hidden'>
          <DialogHeader className='px-5 pt-5 pb-3 border-b border-cart-rule'>
            <KickerLabel tone='muted' className='mb-1.5 tracking-[0.22em]'>
              ● DESTRUCTIVE · CANNOT UNDO
            </KickerLabel>
            <DialogTitle className='flex gap-2 items-center font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink'>
              <AlertTriangle className='w-4 h-4 text-red-400' />
              크루 삭제 확인
            </DialogTitle>
            <DialogDescription className='text-[12px] text-cart-ink-60 mt-1.5'>
              이 작업은 되돌릴 수 없습니다. 정말로{" "}
              <strong className='text-cart-ink'>{crewToDelete?.name}</strong>{" "}
              크루를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 px-5 py-4'>
            <button
              type='button'
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className='flex-1 px-3 py-2.5 rounded-[4px] border border-cart-rule bg-background text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50'
            >
              취소 · CANCEL
            </button>
            <button
              type='button'
              onClick={handleDeleteCrew}
              disabled={isDeleting}
              className='flex-1 px-3 py-2.5 rounded-[4px] bg-red-500 text-white font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50'
            >
              {isDeleting ? "DELETING…" : "삭제 · DELETE"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
