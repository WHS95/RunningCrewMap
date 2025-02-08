"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddressSearchDialogProps {
  onSelect: (location: {
    title: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
}

interface SearchResult {
  roadAddress: string;
  jibunAddress: string;
  x: string;
  y: string;
}

export function AddressSearchDialog({ onSelect }: AddressSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // 주소 검색
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "주소 검색에 실패했습니다.");
      }
      console.log("data", data);

      setSearchResults(data.addresses);
    } catch (error) {
      console.error("주소 검색 실패:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // 주소 선택
  const handleAddressSelect = (result: SearchResult) => {
    onSelect({
      title: result.roadAddress || result.jibunAddress,
      address: result.jibunAddress,
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
    });
    setQuery("");
    setSearchResults([]);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className='justify-start w-full font-normal text-left'
        >
          <Search className='w-4 h-4 mr-2' />
          <span className='text-muted-foreground'>
            메인 활동 장소를 검색하세요
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>메인 활동 장소 검색</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Search className='absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground' />
              <Input
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder='도로명 주소, 지하철역, 공원 등으로 검색...'
                className='pl-10'
                autoFocus
              />
            </div>
            <Button type='button' onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "검색 중..." : "검색"}
            </Button>
          </div>

          <div className='border rounded-lg divide-y max-h-[400px] overflow-y-auto'>
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <button
                  key={index}
                  className='w-full px-4 py-3 text-left transition-colors hover:bg-accent'
                  onClick={() => handleAddressSelect(result)}
                >
                  <div className='font-medium'>
                    {result.roadAddress || result.jibunAddress}
                  </div>
                  {result.roadAddress && result.jibunAddress && (
                    <div className='text-sm text-muted-foreground mt-0.5'>
                      {result.jibunAddress}
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className='px-4 py-8 text-center text-muted-foreground'>
                검색어를 입력하고 검색 버튼을 클릭하세요
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
