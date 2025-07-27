"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FormLayout } from "@/components/layout/FormLayout";
import { CrewDetailView } from "@/components/map/CrewDetailView";
import type { Crew } from "@/lib/types/crew";
import { crewService } from "@/lib/services/crew.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Trash2, AlertTriangle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  useEffect(() => {
    fetchCrews();
  }, []);

  // 검색어 debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // useMemo를 사용한 필터링 결과 메모이제이션
  const filteredCrews = useMemo(() => {
    // 탭에 따른 필터링
    let filtered = [...crews];

    if (activeTab === "visible") {
      filtered = filtered.filter((crew) => crew.is_visible);
    } else if (activeTab === "hidden") {
      filtered = filtered.filter((crew) => !crew.is_visible);
    }

    // 검색어에 따른 필터링 (크루명, 인스타, 주소)
    const trimmedQuery = debouncedSearchQuery.trim();
    if (trimmedQuery) {
      const lowercaseQuery = trimmedQuery.toLowerCase();
      filtered = filtered.filter((crew) => {
        // 문자열 비교를 한 번씩만 수행하도록 최적화
        const crewName = crew.name.toLowerCase();
        const crewInstagram = crew.instagram?.toLowerCase() || "";
        const crewAddress = crew.location.main_address?.toLowerCase() || "";

        return (
          crewName.includes(lowercaseQuery) ||
          crewInstagram.includes(lowercaseQuery) ||
          crewAddress.includes(lowercaseQuery)
        );
      });
    }

    return filtered;
  }, [crews, activeTab, debouncedSearchQuery]);

  const fetchCrews = useCallback(async () => {
    try {
      setIsLoading(true);
      // crewService의 getCrews 메서드를 사용하여 모든 크루 데이터 가져오기
      const crewsData = await crewService.getAdminCrews();
      setCrews(crewsData);
    } catch (error) {
      console.error("크루 목록 조회 실패:", error);
      toast.error("크루 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleCrewVisibility = useCallback(
    async (crewId: string, newValue: boolean) => {
      try {
        // crewService의 메서드를 사용하여 크루 표시 상태 변경
        await crewService.updateCrewVisibility(crewId, newValue);

        // 로컬 상태 업데이트 및 크루 이름 가져오기
        let crewName = "";
        setCrews((prev) =>
          prev.map((crew) => {
            if (crew.id === crewId) {
              crewName = crew.name;
              return { ...crew, is_visible: newValue };
            }
            return crew;
          })
        );

        toast.success(
          `${crewName} 크루가 ${newValue ? "표시" : "숨김"} 처리되었습니다.`
        );
      } catch (error) {
        console.error("크루 표시 상태 변경 실패:", error);
        toast.error("크루 표시 상태 변경에 실패했습니다.");
      }
    },
    []
  );

  const handleCrewClick = useCallback(async (crew: AdminCrew) => {
    try {
      // crewService.getCrewDetail을 사용하여 상세 정보 가져오기
      const detailedCrew = await crewService.getCrewDetail(crew.id);
      setSelectedCrew(detailedCrew || crew); // 실패 시 기존 데이터 사용
    } catch (error) {
      console.error("크루 상세 정보 조회 실패:", error);
      setSelectedCrew(crew); // 에러 발생 시 기본 정보 사용
    }
    setIsDetailOpen(true);
  }, []);

  const handleEditCrew = useCallback(
    (crew: AdminCrew) => {
      // 수정 페이지로 이동
      router.push(`/admin/crew/edit/${crew.id}`);
    },
    [router]
  );

  const handleDeleteClick = useCallback(
    (crew: AdminCrew, e: React.MouseEvent) => {
      e.stopPropagation(); // 이벤트 버블링 방지
      setCrewToDelete(crew);
      setIsDeleteDialogOpen(true);
    },
    []
  );

  const handleDeleteCrew = useCallback(async () => {
    if (!crewToDelete) return;

    try {
      setIsDeleting(true);
      // 크루 삭제 API 호출
      await crewService.deleteCrew(crewToDelete.id);

      toast.success(`${crewToDelete.name} 크루가 삭제되었습니다.`);

      // 로컬 상태에서 삭제된 크루 제거
      setCrews((prev) => prev.filter((crew) => crew.id !== crewToDelete.id));

      // 삭제 다이얼로그 닫기
      setIsDeleteDialogOpen(false);
      setCrewToDelete(null);
    } catch (error) {
      console.error("크루 삭제 실패:", error);
      toast.error("크루 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [crewToDelete]);

  if (isLoading) {
    return (
      <FormLayout title='크루 관리'>
        <div className='flex flex-1 justify-center items-center'>
          <div className='text-lg'>로딩 중...</div>
        </div>
      </FormLayout>
    );
  }

  return (
    <FormLayout title='크루 관리'>
      <div className='space-y-4'>
        {/* 필터링 및 검색 UI */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as FilterTab)}
            className='w-full sm:w-auto'
          >
            <TabsList className='grid grid-cols-3 w-full sm:w-auto'>
              <TabsTrigger value='all'>
                전체{" "}
                <span className='ml-1.5 text-xs rounded-full bg-muted px-1.5 py-0.5'>
                  {crews.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value='visible'>
                표시{" "}
                <span className='ml-1.5 text-xs rounded-full bg-muted px-1.5 py-0.5'>
                  {crews.filter((crew) => crew.is_visible).length}
                </span>
              </TabsTrigger>
              <TabsTrigger value='hidden'>
                숨김{" "}
                <span className='ml-1.5 text-xs rounded-full bg-muted px-1.5 py-0.5'>
                  {crews.filter((crew) => !crew.is_visible).length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='relative w-full sm:w-72'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='크루명, 인스타, 주소 검색'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
            />
          </div>
        </div>

        {/* 검색 결과가 없을 때 */}
        {filteredCrews.length === 0 && (
          <div className='p-8 text-center rounded-lg border'>
            <p className='text-muted-foreground'>검색 결과가 없습니다.</p>
          </div>
        )}

        {/* 크루 목록 */}
        {filteredCrews.map((crew) => (
          <div
            key={crew.id}
            className='flex flex-col p-4 rounded-lg border sm:flex-row sm:items-center'
          >
            <div
              className='flex flex-1 gap-3 items-start cursor-pointer'
              onClick={() => handleCrewClick(crew)}
            >
              {/* 크루 로고 */}
              {crew.logo_image ? (
                <Image
                  src={crew.logo_image}
                  alt={`${crew.name} 로고`}
                  width={48}
                  height={48}
                  quality={20}
                  className='object-cover w-10 h-10 rounded-full sm:w-12 sm:h-12'
                  style={{ width: "40px", height: "40px" }}
                />
              ) : (
                <div className='flex justify-center items-center w-10 h-10 text-lg font-medium rounded-full bg-muted sm:w-12 sm:h-12 sm:text-xl'>
                  {crew.name.charAt(0)}
                </div>
              )}

              {/* 크루 정보 */}
              <div className='overflow-hidden flex-1 min-w-0'>
                <h2 className='pr-1 text-base font-medium break-all sm:break-normal line-clamp-2'>
                  {crew.name}
                </h2>
                <p className='text-sm truncate text-muted-foreground'>
                  {crew.location.main_address}
                </p>
                {crew.instagram && (
                  <p className='text-xs text-blue-500 truncate'>
                    @{crew.instagram}
                  </p>
                )}
              </div>
            </div>

            {/* 관리 버튼 그룹 */}
            <div
              className='flex flex-shrink-0 gap-2 justify-end items-center mt-3 sm:mt-0 sm:ml-2'
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant='ghost'
                size='icon'
                onClick={() => handleEditCrew(crew)}
                title='크루 정보 수정'
                className='w-8 h-8 sm:h-9 sm:w-9'
              >
                <Pencil className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              </Button>

              <Button
                variant='ghost'
                size='icon'
                onClick={(e) => handleDeleteClick(crew, e)}
                className='w-8 h-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive/90 hover:bg-destructive/10'
                title='크루 삭제'
              >
                <Trash2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              </Button>

              <Switch
                checked={crew.is_visible}
                onCheckedChange={(checked) =>
                  toggleCrewVisibility(crew.id, checked)
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* 크루 상세 정보 팝업 */}
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

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex gap-2 items-center'>
              <AlertTriangle className='w-5 h-5 text-destructive' />
              크루 삭제 확인
            </DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 정말로{" "}
              <strong>{crewToDelete?.name}</strong> 크루를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:justify-end'>
            <Button
              variant='outline'
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteCrew}
              disabled={isDeleting}
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormLayout>
  );
}
