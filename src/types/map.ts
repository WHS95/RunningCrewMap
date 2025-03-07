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

// MarkerClustering 옵션 타입 정의
interface MarkerClusteringOptions {
  minClusterSize?: number;
  maxZoom?: number;
  map: naver.maps.Map;
  markers: naver.maps.Marker[];
  disableClickZoom?: boolean;
  gridSize?: number;
  icons?: Array<{ content: string }>;
}

// MarkerClustering 클래스 타입 정의
interface MarkerClustering {
  new (options: MarkerClusteringOptions): MarkerClusteringInstance;
  setMap(map: naver.maps.Map | null): void;
}

export interface MarkerClusteringInstance {
  setMap(map: naver.maps.Map | null): void;
  getMap(): naver.maps.Map | null;
  getMarkers(): naver.maps.Marker[];
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
        visualization?: {
          MarkerClustering: MarkerClustering;
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
