export interface Crew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image?: string;
  created_at: string;
  updated_at: string;
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
