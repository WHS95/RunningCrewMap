export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[hsl(220,15%,4%)] text-white p-8">
      <div className="w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="text-xl font-bold mb-2">오프라인 상태입니다</h1>
      <p className="text-gray-400 text-center text-sm">인터넷 연결을 확인하고 다시 시도해주세요.</p>
    </div>
  );
}
