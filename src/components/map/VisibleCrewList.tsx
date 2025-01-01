"use client";

import { Crew } from "@/lib/types/crew";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  //   SheetClose,
} from "@/components/ui/sheet";
import { MapPin, Instagram } from "lucide-react";

interface VisibleCrewListProps {
  crews: Crew[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (crew: Crew) => void;
}

export function VisibleCrewList({
  crews,
  isOpen,
  onClose,
  onSelect,
}: VisibleCrewListProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side='bottom'
        className='h-[50vh] p-0 rounded-t-[10px] z-[10000]'
      >
        <SheetHeader className='p-6 pb-0'>
          <SheetTitle>현재 화면의 크루 목록</SheetTitle>
          {/* <p className='text-sm text-muted-foreground'>
            총 {crews.length}개의 크루가 있습니다
          </p> */}
        </SheetHeader>
        <div className='overflow-y-auto h-[calc(50vh-80px)] pb-3'>
          {crews.map((crew) => (
            <div
              key={crew.id}
              className='p-6 border-b hover:bg-accent cursor-pointer transition-colors'
              onClick={() => onSelect(crew)}
            >
              <h3 className='font-semibold mb-2'>{crew.name}</h3>
              <p className='text-sm text-muted-foreground mb-3'>
                {crew.description}
              </p>
              <div className='flex flex-col gap-2 text-sm'>
                {crew.location.address && (
                  <div className='flex items-center gap-2'>
                    <MapPin className='h-4 w-4' />
                    <span>{crew.location.address}</span>
                  </div>
                )}
                {crew.instagram && (
                  <div className='flex items-center gap-2'>
                    <Instagram className='h-4 w-4' />
                    <a
                      href={`https://instagram.com/${crew.instagram}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:underline'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {crew.instagram}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
