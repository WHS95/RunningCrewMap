"use client";

import { Crew } from "@/lib/types/crew";
import { ArrowUpRight } from "lucide-react";

interface CrewListProps {
  crews: Crew[];
  onSelect?: (crew: Crew) => void;
}

export const CrewList = ({ crews, onSelect }: CrewListProps) => {
  return (
    <div className='h-full p-4 overflow-auto'>
      <div className='mb-4'>
        <h2 className='text-lg font-semibold'>러닝 크루 목록</h2>
        <p className='text-sm text-muted-foreground'>
          총 {crews.length}개의 크루
        </p>
      </div>
      <div className='space-y-4'>
        {crews.map((crew) => (
          <div
            key={crew.id}
            className='p-4 border rounded-lg cursor-pointer hover:bg-accent'
            onClick={() => onSelect?.(crew)}
          >
            <div className='flex items-center justify-between'>
              <h3 className='font-semibold truncate'>{crew.name}</h3>
              <ArrowUpRight className='w-4 h-4 text-muted-foreground' />
            </div>
            <p className='text-sm text-muted-foreground line-clamp-2'>
              {crew.description}
            </p>
            {crew.instagram && (
              <p className='mt-2 text-sm text-blue-600'>{crew.instagram}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
