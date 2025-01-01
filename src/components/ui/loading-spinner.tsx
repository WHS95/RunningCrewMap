"use client";

export function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className='flex items-center justify-center h-screen flex-col'>
      <div className='w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin'></div>
      <span className='mt-4 text-lg'>{message}</span>
    </div>
  );
}
