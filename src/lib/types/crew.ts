export interface Crew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  created_at: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
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
