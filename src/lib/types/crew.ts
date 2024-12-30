export interface Crew {
  id: string;
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  instagram?: string;
  logo_image?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCrewInput {
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  instagram?: string;
  logo_image?: string;
}
