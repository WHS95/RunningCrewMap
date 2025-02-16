import { Crew, CreateCrewInput } from "../types/crew";

export interface CrewService {
  getAllCrews(): Promise<Crew[]>;
  getCrewById(id: string): Promise<Crew | null>;
  createCrew(data: CreateCrewInput): Promise<Crew>;
  updateCrew(id: string, data: Partial<CreateCrewInput>): Promise<Crew>;
  deleteCrew(id: string): Promise<void>;
  searchCrews(query: string): Promise<Crew[]>;
}
