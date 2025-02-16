export interface Crew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CrewLocation {
  id: string;
  crew_id: string;
  main_address: string;
  detail_address?: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface CrewActivityDay {
  id: string;
  crew_id: string;
  day_of_week: string;
  created_at: string;
}

export interface CrewAgeRange {
  id: string;
  crew_id: string;
  min_age: number;
  max_age: number;
  created_at: string;
}

export interface CreateCrewInput {
  name: string;
  description: string;
  instagram?: string;
  logo_image?: File;
  location: {
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  };
  activity_days: string[];
  age_range: {
    min_age: number;
    max_age: number;
  };
}

export interface CrewWithDetails extends Crew {
  location: Omit<CrewLocation, "id" | "crew_id" | "created_at">;
  activity_days: string[];
  age_range: {
    min_age: number;
    max_age: number;
  };
}

export interface CrewFilterOptions {
  activity_day?: string;
  min_age?: number;
  max_age?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export const ACTIVITY_DAYS = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
] as const;

export type ActivityDay = (typeof ACTIVITY_DAYS)[number];
