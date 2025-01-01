"use client";

import { Crew } from "@/lib/types/crew";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Instagram, MapPin, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CrewDetailSheetProps {
  crew: Crew | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CrewDetailSheet({
  crew,
  isOpen,
  onClose,
}: CrewDetailSheetProps) {
  if (!crew) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side='bottom' className='h-[50vh] rounded-t-[10px] z-[100]'>
        <SheetHeader className='relative pb-4'>
          <SheetTitle className='text-xl font-bold'>{crew.name}</SheetTitle>
          <SheetClose className='absolute right-0 top-0' />
        </SheetHeader>

        <div className='space-y-4'>
          <p className='text-sm text-muted-foreground'>{crew.description}</p>

          {crew.instagram && (
            <div className='flex items-center space-x-2'>
              <Instagram className='h-4 w-4' />
              <a
                href={`https://instagram.com/${crew.instagram}`}
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-blue-600 hover:underline'
              >
                {crew.instagram}
              </a>
            </div>
          )}

          <div className='flex items-center space-x-2'>
            <Calendar className='h-4 w-4' />
            <span className='text-sm'>
              크루 생성일: {formatDate(crew.created_at)}
            </span>
          </div>

          {crew.location.address && (
            <div className='flex items-center space-x-2'>
              <MapPin className='h-4 w-4' />
              <span className='text-sm'>{crew.location.address}</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
