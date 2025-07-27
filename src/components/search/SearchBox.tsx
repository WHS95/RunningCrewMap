"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Crew } from "@/lib/types/crew";

interface SearchBoxProps {
  crews: Crew[];
  onSelect: (crew: Crew) => void;
}

export function SearchBox({ crews, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Crew[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        const filtered = crews.filter((crew) => {
          const searchQuery = query.toLowerCase();
          return (
            crew.name.toLowerCase().includes(searchQuery) ||
            (crew.location.address &&
              crew.location.address.toLowerCase().includes(searchQuery))
          );
        });
        // .slice(0, 3); // 최대 3개까지만 표시
        setResults(filtered);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, crews]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className='relative mx-auto w-full max-w-sm'>
      <div className='relative px-4'>
        <Search className='absolute left-7 top-1/2 w-4 h-4 text-gray-500 transform -translate-y-1/2' />
        <Input
          type='text'
          placeholder='크루명 또는 주소 검색...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className='pr-4 pl-9 text-gray-800 bg-white rounded-lg transition-shadow focus:outline-none focus:ring-1 placeholder:text-gray-400'
        />
      </div>

      {isOpen && results.length > 0 && (
        <div
          className='fixed z-[10000]  rounded-lg shadow-lg bg-white max-h-60 overflow-y-auto mt-1'
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left + 16}px`,
            width: `${dropdownPosition.width - 32}px`,
          }}
        >
          {results.map((crew) => (
            <div
              key={crew.id}
              className={cn(
                "px-4 py-3 text-gray-800 border-b border-gray-200 cursor-pointer hover:bg-gray-100 last:border-b-0",
                "first:rounded-t-lg last:rounded-b-lg"
              )}
              onClick={() => {
                onSelect(crew);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <div className='font-medium'>{crew.name}</div>
              {crew.location.address && (
                <div className='text-sm text-gray-500'>
                  {crew.location.address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div
          className='fixed z-[10000] p-4 text-center rounded-lg shadow-lg bg-white text-gray-500 mt-1'
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left + 16}px`,
            width: `${dropdownPosition.width - 32}px`,
          }}
        >
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}
