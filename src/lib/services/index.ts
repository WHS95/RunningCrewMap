import { FileCrewService } from "./file-crew.service";

// 싱글톤 인스턴스 생성
export const crewService = new FileCrewService();

// 나중에 Supabase로 전환할 때는 아래와 같이 변경하면 됩니다:
// export const crewService = new SupabaseCrewService();
