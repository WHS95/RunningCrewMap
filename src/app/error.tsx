"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen gap-4 p-4'>
      <div className='text-center'>
        <h2 className='mb-2 text-xl font-bold text-gray-900'>
          문제가 발생했습니다
        </h2>
        <p className='mb-4 text-sm text-gray-600'>
          {error.message || "예상치 못한 오류가 발생했습니다."}
        </p>
      </div>
      <button
        onClick={reset}
        className='px-6 py-2 text-sm font-medium text-white transition-colors bg-black rounded-lg hover:bg-gray-800'
      >
        다시 시도
      </button>
    </div>
  );
}
