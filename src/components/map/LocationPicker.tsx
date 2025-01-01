"use client";

import { useEffect, useRef, useState } from "react";

interface LocationPickerProps {
  initialLocation: {
    lat: number;
    lng: number;
  };
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    address?: string;
  }) => void;
}

interface SearchResult {
  roadAddress: string;
  jibunAddress: string;
  x: string;
  y: string;
}

const LocationPicker = ({
  initialLocation,
  onLocationSelect,
}: LocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<naver.maps.Map | null>(null);
  const markerInstance = useRef<naver.maps.Marker | null>(null);

  const [address, setAddress] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const searchAddress = async () => {
    if (!address) return;

    try {
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(address)}`
      );

      const data = await response.json();

      if (data.addresses && data.addresses.length > 0) {
        setSearchResults(data.addresses);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error("주소 검색 실패:", error);
      setSearchResults([]);
      setShowResults(true);
    }
  };

  const handleLocationSelect = (result: SearchResult) => {
    const location = {
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
      address: result.roadAddress || result.jibunAddress,
    };

    console.log("[LocationPicker] 선택된 위치:", location);

    onLocationSelect(location);
    if (mapInstance.current && markerInstance.current) {
      const position = new window.naver.maps.LatLng(location.lat, location.lng);
      mapInstance.current.setCenter(position);
      mapInstance.current.setZoom(15);
      markerInstance.current.setPosition(position);
    }
    setShowResults(false);
    setAddress(location.address);
  };

  useEffect(() => {
    if (!mapRef.current || !isClient) return;

    const initMap = () => {
      const mapOptions = {
        center: new window.naver.maps.LatLng(
          initialLocation.lat,
          initialLocation.lng
        ),
        zoom: 13,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
      };

      mapInstance.current = new window.naver.maps.Map(
        mapRef.current!,
        mapOptions
      );

      markerInstance.current = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(
          initialLocation.lat,
          initialLocation.lng
        ),
        map: mapInstance.current,
        draggable: true,
      });

      window.naver.maps.Event.addListener(
        markerInstance.current,
        "dragend",
        () => {
          if (!markerInstance.current) return;

          const position = markerInstance.current.getPosition();
          onLocationSelect({
            lat: position.y,
            lng: position.x,
          });
        }
      );

      window.naver.maps.Event.addListener(mapInstance.current, "click", (e) => {
        if (!markerInstance.current) return;

        const clickedLocation = {
          lat: e.coord.y(),
          lng: e.coord.x(),
        };

        markerInstance.current.setPosition(
          new window.naver.maps.LatLng(clickedLocation.lat, clickedLocation.lng)
        );
        onLocationSelect(clickedLocation);
      });
    };

    if (window.naver && window.naver.maps) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}`;
      script.onload = initMap;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [initialLocation, onLocationSelect, isClient]);

  if (!isClient) {
    return <div className='h-[400px] bg-gray-100 rounded-lg' />;
  }

  return (
    <div className='space-y-2'>
      <div className='relative'>
        <div className='flex gap-2'>
          <input
            type='text'
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder='주소를 입력하세요'
            className='flex-1 px-3 py-2 border border-gray-300 rounded-md text-black'
            onKeyPress={(e) => e.key === "Enter" && searchAddress()}
          />
          <button
            type='button'
            onClick={searchAddress}
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
          >
            검색
          </button>
        </div>
        {showResults && (
          <div className='absolute w-full mt-1 bg-white rounded-lg shadow-lg z-10 max-h-60 overflow-auto'>
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <div
                  key={index}
                  className='p-2 hover:bg-gray-100 cursor-pointer'
                  onClick={() => handleLocationSelect(result)}
                >
                  <div className='font-semibold text-black'>
                    {result.roadAddress}
                  </div>
                  <div className='text-sm text-gray-800'>
                    {result.jibunAddress}
                  </div>
                </div>
              ))
            ) : (
              <div className='p-2 text-gray-800'>검색 결과가 없습니다.</div>
            )}
          </div>
        )}
      </div>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default LocationPicker;
