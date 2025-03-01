export interface Crew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image?: string;
  founded_date: string;
  created_at: string;
  activity_day?: string;
  age_range?: string;
  is_visible?: boolean;
  activity_locations?: string[];
  location: {
    lat: number;
    lng: number;
    address?: string;
    main_address?: string;
  };
}

export interface CreateCrewInput {
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    main_address?: string;
  };
  instagram?: string;
  logo_image?: string;
  founded_date: string;
  activity_day?: string;
  age_range?: string;
}
