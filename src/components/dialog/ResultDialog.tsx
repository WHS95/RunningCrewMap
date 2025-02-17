"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle } from "lucide-react";

interface ResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  isSuccess?: boolean;
}

export function ResultDialog({
  isOpen,
  onClose,
  title,
  description,
  isSuccess = true,
}: ResultDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            {isSuccess ? (
              <CheckCircle2 className='w-6 h-6 text-green-500' />
            ) : (
              <XCircle className='w-6 h-6 text-red-500' />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
