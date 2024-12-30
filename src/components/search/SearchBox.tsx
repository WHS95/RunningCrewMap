"use client";

import { useState } from "react";
import { Crew } from "@/lib/types/crew";

interface SearchBoxProps {
  crews: Crew[];
  onSearch: (crew: Crew) => void;
}

const SearchBox = ({ crews, onSearch }: SearchBoxProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const filteredCrews = crews.filter(
    (crew) =>
      crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className='absolute top-4 left-4 z-10 w-72'>
      <div className='relative'>
        <input
          type='text'
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          placeholder='크루 이름 또는 위치 검색...'
          className='w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500'
        />
        {showResults && searchTerm && (
          <div className='absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg'>
            {filteredCrews.length > 0 ? (
              filteredCrews.map((crew) => (
                <div
                  key={crew.id}
                  className='px-4 py-2 hover:bg-gray-100 cursor-pointer'
                  onClick={() => {
                    onSearch(crew);
                    setSearchTerm("");
                    setShowResults(false);
                  }}
                >
                  <div className='font-semibold'>{crew.name}</div>
                  <div className='text-sm text-gray-600'>
                    {crew.description}
                  </div>
                </div>
              ))
            ) : (
              <div className='px-4 py-2 text-gray-500'>
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBox;
