import { CrewWithDetails, CreateCrewInput } from "../types/crew";

export interface CrewService {
  getAllCrews(): Promise<CrewWithDetails[]>;
  getCrewById(id: string): Promise<CrewWithDetails | null>;
  createCrew(data: CreateCrewInput): Promise<CrewWithDetails>;
  //   updateCrew(id: string, data: Partial<CreateCrewInput>): Promise<Crew>;
  //   deleteCrew(id: string): Promise<void>;
  searchCrews(query: string): Promise<CrewWithDetails[]>;
}
