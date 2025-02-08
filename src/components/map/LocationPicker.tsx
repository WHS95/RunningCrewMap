"use client";

import { useState } from "react";
import { Search } from "lucide-react";

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
  distance: string;
}

interface GeocodeResponse {
  v2: {
    addresses: SearchResult[];
  };
}

export default function LocationPicker({
  onLocationSelect,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // 주소 검색
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !window.naver || !window.naver.maps.Service)
      return;

    setIsSearching(true);
    try {
      const response = await new Promise<GeocodeResponse>((resolve, reject) => {
        window.naver.maps.Service.geocode(
          {
            query: searchQuery,
          },
          (status: naver.maps.Service.Status, response: GeocodeResponse) => {
            if (status === window.naver.maps.Service.Status.ERROR) {
              reject(new Error("주소 검색에 실패했습니다."));
              return;
            }
            resolve(response);
          }
        );
      });

      const results = response.v2.addresses;
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search address:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAddress = (result: SearchResult) => {
    onLocationSelect({
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
      address: result.roadAddress || result.jibunAddress,
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <div className='relative'>
      {/* 검색창 */}
      <div className='relative'>
        <form onSubmit={handleSearch} className='relative'>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='도로명 주소, 지하철역, 공원 등으로 검색...'
            className='w-full px-4 py-2 pl-10 pr-4 border rounded-lg shadow-sm'
          />
          <Search className='absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground' />
          <button
            type='submit'
            disabled={isSearching}
            className='absolute text-sm transform -translate-y-1/2 right-3 top-1/2 text-primary'
          >
            {isSearching ? "검색 중..." : "검색"}
          </button>
        </form>

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <div className='absolute left-0 right-0 z-50 mt-2 overflow-y-auto bg-white border rounded-lg shadow-lg max-h-60'>
            {searchResults.map((result, index) => (
              <button
                key={index}
                className='w-full px-4 py-2 text-left transition-colors hover:bg-accent first:rounded-t-lg last:rounded-b-lg'
                onClick={() => handleSelectAddress(result)}
              >
                <div className='font-medium'>{result.roadAddress}</div>
                <div className='text-sm text-muted-foreground'>
                  {result.jibunAddress}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
