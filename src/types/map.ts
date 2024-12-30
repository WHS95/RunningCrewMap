export interface CrewLocation {
  id: number;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  description: string;
}

interface MapOptions {
  center: naver.maps.LatLng;
  zoom: number;
  zoomControl?: boolean;
  zoomControlOptions?: {
    position: naver.maps.Position;
  };
}

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (element: HTMLElement, options: MapOptions) => naver.maps.Map;
        LatLng: new (lat: number, lng: number) => naver.maps.LatLng;
        Position: {
          TOP_RIGHT: naver.maps.Position;
        };
      };
    };
  }
}

export interface NaverMapProps {
  width: string;
  height: string;
  initialCenter: {
    lat: number;
    lng: number;
  };
  initialZoom: number;
}
