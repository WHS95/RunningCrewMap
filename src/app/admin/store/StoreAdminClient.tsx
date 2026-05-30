"use client";

/**
 * /admin/store
 *
 * 매장 도메인 어드민. /admin/crew 패턴을 1:1로 미러.
 *
 * - 가시성 토글(LIVE / PENDING) + ALL 탭
 * - 행별 액션: URL 재발급 · PIN 초기화 · 편집 · 삭제 · 가시성 스위치
 * - 가시성·삭제·토큰 회수·PIN 초기화는 서버 액션(`@/app/actions/store`).
 *   목록 조회는 클라이언트 서비스 (`storeService.getStoreListAdmin`).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Link2,
  Pencil,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";
import { cn } from "@/lib/utils";
import { storeService } from "@/lib/services/store.service";
import {
  clearStorePinAdmin,
  revalidateStoresCache,
  rotateStoreEditToken,
  updateStoreVisibility,
} from "@/app/actions/store";
import {
  STORE_CATEGORY_LABELS,
  type StoreAdmin,
} from "@/lib/types/store";

type FilterTab = "all" | "live" | "pending";

export function StoreAdminClient() {
  const router = useRouter();

  const [stores, setStores] = useState<StoreAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [rotatingTokenFor, setRotatingTokenFor] = useState<string | null>(null);
  const [resettingPinFor, setResettingPinFor] = useState<string | null>(null);

  // Delete dialog state — mirror crew admin
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<StoreAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStores = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await storeService.getStoreListAdmin();
      setStores(data);
    } catch (e) {
      console.error("매장 목록 조회 실패:", e);
      toast.error("매장 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filteredStores = useMemo(() => {
    let list = [...stores];
    if (activeTab === "live") list = list.filter((s) => s.is_visible);
    else if (activeTab === "pending") list = list.filter((s) => !s.is_visible);

    const q = debouncedSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const name = s.name.toLowerCase();
        const ig = s.instagram?.toLowerCase() ?? "";
        const addr = s.location.main_address?.toLowerCase() ?? "";
        return name.includes(q) || ig.includes(q) || addr.includes(q);
      });
    }
    return list;
  }, [stores, activeTab, debouncedSearchQuery]);

  const counts = useMemo(
    () => ({
      all: stores.length,
      live: stores.filter((s) => s.is_visible).length,
      pending: stores.filter((s) => !s.is_visible).length,
    }),
    [stores]
  );

  const toggleVisibility = useCallback(
    async (storeId: string, newValue: boolean) => {
      try {
        const res = await updateStoreVisibility(storeId, newValue);
        if (!res.success) {
          toast.error(res.error || "가시성 변경에 실패했습니다.");
          return;
        }
        let name = "";
        setStores((prev) =>
          prev.map((s) => {
            if (s.id === storeId) {
              name = s.name;
              return { ...s, is_visible: newValue };
            }
            return s;
          })
        );
        toast.success(
          `${name} 매장이 ${newValue ? "표시" : "숨김"} 처리되었습니다.`
        );
      } catch (e) {
        console.error("매장 가시성 변경 실패:", e);
        toast.error("매장 가시성 변경에 실패했습니다.");
      }
    },
    []
  );

  const handleRotateToken = useCallback(async (store: StoreAdmin) => {
    setRotatingTokenFor(store.id);
    try {
      const res = await rotateStoreEditToken(store.id);
      if (!res.success || !res.token) {
        toast.error(res.error || "토큰 재발급에 실패했습니다.");
        return;
      }
      const url = `${window.location.origin}/store/edit/${store.id}?token=${res.token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("새 자가-편집 URL이 클립보드에 복사되었습니다.");
      } catch {
        toast.success(`새 URL: ${url}`);
      }
    } catch (e) {
      console.error("rotateStoreEditToken failed:", e);
      toast.error("토큰 재발급 중 오류가 발생했습니다.");
    } finally {
      setRotatingTokenFor(null);
    }
  }, []);

  const handleClearPin = useCallback(async (store: StoreAdmin) => {
    const ok = window.confirm(
      `'${store.name}' 매장의 PIN을 초기화하시겠어요?\n기존 세션은 모두 만료됩니다.`
    );
    if (!ok) return;
    setResettingPinFor(store.id);
    try {
      const res = await clearStorePinAdmin(store.id);
      if (!res.success) {
        toast.error(res.error || "PIN 초기화에 실패했습니다.");
        return;
      }
      toast.success("PIN이 초기화되었습니다. 자가-편집 URL을 재발급해 전달해주세요.");
    } catch (e) {
      console.error("clearStorePinAdmin failed:", e);
      toast.error("PIN 초기화 중 오류가 발생했습니다.");
    } finally {
      setResettingPinFor(null);
    }
  }, []);

  const handleEdit = useCallback(
    (store: StoreAdmin) => router.push(`/admin/store/edit/${store.id}`),
    [router]
  );

  const handleDeleteClick = useCallback(
    (store: StoreAdmin, e: React.MouseEvent) => {
      e.stopPropagation();
      setStoreToDelete(store);
      setIsDeleteDialogOpen(true);
    },
    []
  );

  const handleDeleteStore = useCallback(async () => {
    if (!storeToDelete) return;
    try {
      setIsDeleting(true);
      // 사진 파일 정리는 클라이언트 서비스가 처리. 이후 캐시 무효화는 서버 액션.
      await storeService.deleteStore(storeToDelete.id);
      await revalidateStoresCache();
      toast.success(`${storeToDelete.name} 매장이 삭제되었습니다.`);
      setStores((prev) => prev.filter((s) => s.id !== storeToDelete.id));
      setIsDeleteDialogOpen(false);
      setStoreToDelete(null);
    } catch (e) {
      console.error("매장 삭제 실패:", e);
      toast.error("매장 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [storeToDelete]);

  return (
    <div className="-mx-4 -my-6">
      <main className="min-h-screen bg-background pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between px-[22px] pt-6">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="w-9 h-9 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center text-cart-ink active:scale-95 transition-transform"
            aria-label="관리자 대시보드로"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <KickerLabel tone="muted" className="tracking-[0.22em]">
            TOTAL · {counts.all.toString().padStart(3, "0")}
          </KickerLabel>
        </div>

        <CartographicHeader
          kicker={`ADMIN · STORES · ${counts.all
            .toString()
            .padStart(3, "0")} REGISTERED`}
          title="매장 관리"
        />

        {/* Tabs + search */}
        <div className="sticky top-0 z-10 px-[22px] pb-3 bg-background/95 backdrop-blur-md border-b border-cart-rule">
          <div className="flex gap-1.5 mb-3">
            {(
              [
                { value: "all", en: "ALL", n: counts.all },
                { value: "live", en: "LIVE", n: counts.live },
                { value: "pending", en: "PENDING", n: counts.pending },
              ] as const
            ).map((t) => {
              const active = activeTab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cart-ink-60" />
            <input
              type="text"
              placeholder="매장명 · 인스타 · 주소"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors text-[13px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-[2px] flex items-center justify-center text-cart-ink-60 hover:text-cart-ink"
                aria-label="검색어 지우기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="px-[22px]">
          {isLoading ? (
            <KickerLabel
              tone="muted"
              className="text-center py-12 tracking-[0.2em]"
            >
              · LOADING STORES ·
            </KickerLabel>
          ) : filteredStores.length === 0 ? (
            <KickerLabel
              tone="muted"
              className="text-center py-12 tracking-[0.2em]"
            >
              · NO STORES MATCHED ·
            </KickerLabel>
          ) : (
            <div>
              {filteredStores.map((store, idx) => (
                <div
                  key={store.id}
                  className={cn(
                    "py-3.5",
                    idx > 0 && "border-t border-cart-rule"
                  )}
                >
                  {/* Row 1 — info */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 pt-1 font-mono text-[11px] tracking-[0.05em] text-cart-ink-60 tabular-nums flex-shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    {store.main_image_url ? (
                      <Image
                        src={store.main_image_url}
                        alt={`${store.name} 대표 사진`}
                        width={44}
                        height={44}
                        quality={20}
                        className="object-cover w-11 h-11 rounded-[4px] border border-cart-rule flex-shrink-0"
                        style={{ width: "44px", height: "44px" }}
                      />
                    ) : (
                      <div className="flex justify-center items-center w-11 h-11 rounded-[4px] bg-cart-paper border border-cart-rule font-display text-[15px] font-bold text-[hsl(var(--lime))] flex-shrink-0">
                        {store.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[14px] font-semibold text-cart-ink break-keep">
                          {store.name}
                        </span>
                        <span className="font-mono text-[8px] tracking-[0.15em] font-bold uppercase px-1.5 py-0.5 rounded-[2px] border border-cart-rule text-cart-ink-60 flex-shrink-0">
                          {STORE_CATEGORY_LABELS[store.category]}
                        </span>
                        {!store.is_visible && (
                          <span className="font-mono text-[8px] tracking-[0.15em] font-bold uppercase px-1.5 py-0.5 rounded-[2px] border border-amber-400/40 text-amber-300 flex-shrink-0">
                            PENDING
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 truncate mt-0.5">
                        {store.location.main_address || "—"}
                      </div>
                      {store.instagram && (
                        <div className="font-mono text-[10px] tracking-[0.04em] text-[hsl(var(--lime))] truncate">
                          @{store.instagram}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2 — actions */}
                  <div className="flex items-center gap-1.5 mt-2.5 pl-[40px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleRotateToken(store)}
                      disabled={rotatingTokenFor === store.id}
                      title="수정 URL 재발급 + 복사"
                      className="flex-1 h-8 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center gap-1 text-cart-ink-60 hover:text-[hsl(var(--lime))] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {rotatingTokenFor === store.id ? (
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      <span className="font-mono text-[9px] tracking-[0.15em] uppercase font-semibold">
                        URL
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearPin(store)}
                      disabled={resettingPinFor === store.id}
                      title="PIN 초기화"
                      className="flex-1 h-8 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center gap-1 text-cart-ink-60 hover:text-[hsl(var(--lime))] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {resettingPinFor === store.id ? (
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5" />
                      )}
                      <span className="font-mono text-[9px] tracking-[0.15em] uppercase font-semibold">
                        PIN
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(store)}
                      title="매장 정보 수정"
                      className="flex-1 h-8 rounded-[4px] border border-cart-rule bg-cart-paper flex items-center justify-center gap-1 text-cart-ink-60 hover:text-cart-ink active:scale-95 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="font-mono text-[9px] tracking-[0.15em] uppercase font-semibold">
                        EDIT
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(store, e)}
                      title="매장 삭제"
                      className="flex-1 h-8 rounded-[4px] border border-red-500/40 bg-cart-paper flex items-center justify-center gap-1 text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="font-mono text-[9px] tracking-[0.15em] uppercase font-semibold">
                        DEL
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 h-8 px-2 rounded-[4px] border border-cart-rule bg-cart-paper">
                      <span
                        className={cn(
                          "font-mono text-[9px] tracking-[0.15em] uppercase font-semibold",
                          store.is_visible
                            ? "text-[hsl(var(--lime))]"
                            : "text-cart-ink-40"
                        )}
                      >
                        {store.is_visible ? "LIVE" : "OFF"}
                      </span>
                      <Switch
                        checked={store.is_visible}
                        onCheckedChange={(checked) =>
                          toggleVisibility(store.id, checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete dialog */}
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <DialogContent className="bg-cart-paper border border-cart-rule rounded-[4px] p-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-cart-rule">
              <KickerLabel tone="muted" className="mb-1.5 tracking-[0.22em]">
                ● DESTRUCTIVE · CANNOT UNDO
              </KickerLabel>
              <DialogTitle className="flex gap-2 items-center font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                매장 삭제 확인
              </DialogTitle>
              <DialogDescription className="text-[12px] text-cart-ink-60 mt-1.5">
                이 작업은 되돌릴 수 없습니다. 정말로{" "}
                <strong className="text-cart-ink">
                  {storeToDelete?.name}
                </strong>{" "}
                매장을 삭제하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-3 py-2.5 rounded-[4px] border border-cart-rule bg-background text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
              >
                취소 · CANCEL
              </button>
              <button
                type="button"
                onClick={handleDeleteStore}
                disabled={isDeleting}
                className="flex-1 px-3 py-2.5 rounded-[4px] bg-red-500 text-white font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isDeleting ? "DELETING…" : "삭제 · DELETE"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
