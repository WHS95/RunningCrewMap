import Link from "next/link";

export default function ForgotPinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm bg-cart-paper border border-cart-rule rounded-[4px] p-6">
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[hsl(var(--lime))] mb-2">
          · PIN · RESET
        </div>
        <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink mb-3">
          PIN을 잊으셨나요?
        </h1>
        <p className="text-[12px] text-cart-ink-60 leading-relaxed mb-5">
          인스타그램{" "}
          <a
            href="https://www.instagram.com/run_house_club/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            @run_house_club
          </a>
          로 크루명과 함께 &quot;PIN 초기화 요청&quot; 메시지를 보내주세요.
          admin이 확인 후 재설정 링크를 보내드립니다.
        </p>
        <Link
          href="/crew/edit/login"
          className="block text-center w-full py-2.5 rounded-[4px] border border-cart-rule bg-background text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold"
        >
          로그인으로 돌아가기
        </Link>
        <Link
          href="/"
          className="block text-center w-full mt-2 py-2.5 rounded-[4px] text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
