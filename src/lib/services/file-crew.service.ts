import { CrewWithDetails, CreateCrewInput } from "../types/crew";
import { CrewService } from "./crew.interface";

export class FileCrewService implements CrewService {
  async getAllCrews(): Promise<CrewWithDetails[]> {
    const response = await fetch("/api/crews");
    if (!response.ok) throw new Error("Failed to fetch crews");
    return response.json();
  }

  async getCrewById(id: string): Promise<CrewWithDetails | null> {
    const crews = await this.getAllCrews();
    return crews.find((c) => c.id === id) || null;
  }

  async createCrew(data: CreateCrewInput): Promise<CrewWithDetails> {
    const response = await fetch("/api/crews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("Failed to create crew");
    return response.json();
  }

  async searchCrews(query: string): Promise<CrewWithDetails[]> {
    const crews = await this.getAllCrews();
    const lowercaseQuery = query.toLowerCase();
    return crews.filter(
      (crew) =>
        crew.name.toLowerCase().includes(lowercaseQuery) ||
        crew.description.toLowerCase().includes(lowercaseQuery) ||
        crew.location.main_address.toLowerCase().includes(lowercaseQuery)
    );
  }
}

// ||
//         crew.location.address?.toLowerCase().includes(lowercaseQuery)
