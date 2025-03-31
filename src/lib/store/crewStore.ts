import { create } from 'zustand';
import { crewService } from '@/lib/services/crew.service';
import type { Crew } from '@/lib/types/crew';
import { toast } from 'sonner';
import { ErrorCode, AppError } from '@/lib/types/error';
import { filterCrewsByRegion as filterCrewsByRegionUtil } from '@/lib/utils/region-utils';

interface CrewState {
  // 크루 데이터 관련 상태
  crews: Crew[];
  isLoading: boolean;
  filteredCrews: Crew[];
  
  // 크루 상세 정보 관련 상태
  selectedCrew: Crew | null;
  isDetailOpen: boolean;
  
  // 액션
  loadCrews: () => Promise<void>;
  invalidateCache: () => Promise<void>;
  filterCrewsByRegion: (region: string) => void;
  setSelectedCrew: (crew: Crew) => void;
  closeDetail: () => void;
}

export const useCrewStore = create<CrewState>((set, get) => ({
  // 초기 상태
  crews: [],
  isLoading: false,
  filteredCrews: [],
  selectedCrew: null,
  isDetailOpen: false,
  
  // 크루 데이터 로드
  loadCrews: async () => {
    // 이미 데이터가 있으면 다시 로드하지 않음
    if (get().crews.length > 0) {
      return;
    }
    
    try {
      set({ isLoading: true });
      const data = await crewService.getCrews();
      set({ 
        crews: data, 
        filteredCrews: data,
        isLoading: false 
      });
    } catch (err: unknown) {
      console.error("크루 데이터 로딩 실패:", err);
      set({ isLoading: false });

      // 에러 처리
      const error = err as Error;
      const appError = err as AppError;

      if ("code" in error) {
        switch (appError.code) {
          case ErrorCode.NETWORK_ERROR:
            toast.error("네트워크 연결을 확인해주세요.");
            break;
          case ErrorCode.SERVER_ERROR:
            toast.error(
              "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
            );
            break;
          default:
            toast.error(
              "크루 정보를 불러오는데 실패했습니다. 다시 시도해주세요."
            );
        }
      } else {
        toast.error(
          "알 수 없는 오류가 발생했습니다. 페이지를 새로고침 해주세요."
        );
      }
    }
  },
  
  // 캐시 무효화 및 데이터 재로드
  invalidateCache: async () => {
    set({ crews: [], filteredCrews: [] });
    await get().loadCrews();
  },
  
  // 지역별 크루 필터링
  filterCrewsByRegion: (region) => {
    const { crews } = get();
    const filtered = filterCrewsByRegionUtil(crews, region);
    set({ filteredCrews: filtered });
  },
  
  // 크루 선택 및 상세 정보 표시
  setSelectedCrew: (crew) => {
    set({ 
      selectedCrew: crew,
      isDetailOpen: true 
    });
  },
  
  // 상세 정보 닫기
  closeDetail: () => {
    set({ 
      isDetailOpen: false,
      selectedCrew: null
    });
  }
})); 