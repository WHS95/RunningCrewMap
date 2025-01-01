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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        const filtered = crews
          .filter((crew) => {
            const searchQuery = query.toLowerCase();
            return (
              crew.name.toLowerCase().includes(searchQuery) ||
              (crew.location.address &&
                crew.location.address.toLowerCase().includes(searchQuery))
            );
          })
          .slice(0, 3); // 최대 3개까지만 표시
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
    <div ref={searchRef} className='relative w-full max-w-sm mx-auto px-4'>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          type='text'
          placeholder='크루명 또는 주소 검색...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className='pl-9 pr-4'
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className='absolute mt-1 w-full bg-background rounded-md border shadow-lg z-50'>
          {results.map((crew) => (
            <div
              key={crew.id}
              className={cn(
                "px-4 py-2 cursor-pointer hover:bg-accent",
                "first:rounded-t-md last:rounded-b-md"
              )}
              onClick={() => {
                onSelect(crew);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <div className='font-medium'>{crew.name}</div>
              {crew.location.address && (
                <div className='text-sm text-muted-foreground'>
                  {crew.location.address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
