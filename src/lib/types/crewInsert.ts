export interface Crew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image_url?: string;
  founded_date: string;
  created_at: string;
  updated_at: string;
}

export interface JoinMethod {
  method_type: "instagram_dm" | "open_chat" | "other";
  link_url?: string;
  description?: string;
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

export interface CrewPhoto {
  id: string;
  crew_id: string;
  photo_url: string;
  display_order: number;
  created_at: string;
}

export interface CreateCrewInput {
  name: string;
  description: string;
  instagram?: string;
  logo_image?: File;
  founded_date: string;
  location: {
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  };
  activity_days: ActivityDay[];
  age_range: {
    min_age: number;
    max_age: number;
  };
  activity_locations?: string[];
  join_methods?: JoinMethod[];
  photos?: File[];
}

export interface CrewWithDetails extends Crew {
  location: Omit<CrewLocation, "id" | "crew_id" | "created_at">;
  activity_days: ActivityDay[];
  age_range: {
    min_age: number;
    max_age: number;
  };
  activity_locations?: string[];
  join_methods?: JoinMethod[];
  photos?: string[];
}

export interface CrewFilterOptions {
  activity_day?: ActivityDay;
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
