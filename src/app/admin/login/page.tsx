"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { KickerLabel } from "@/components/design/cartographic";
import { Lock, User, Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

// localStorage keys — only the *username* and *remember preference* are
// persisted client-side. The password and session live in an httpOnly
// cookie set by the API.
const LS_USERNAME = "admin_last_username";
const LS_REMEMBER = "admin_remember_pref";

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hydrate last-used username + remember preference from localStorage so
  // the admin only needs to type the password on returning visits.
  useEffect(() => {
    try {
      const u = window.localStorage.getItem(LS_USERNAME);
      const r = window.localStorage.getItem(LS_REMEMBER);
      if (u) setFormData((prev) => ({ ...prev, username: u }));
      if (r === "1") setRemember(true);
    } catch {
      /* ignore quota / privacy mode */
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = loginSchema.safeParse(formData);
      if (!result.success) {
        setError(result.error.errors[0].message);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, remember }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Persist last-username and remember preference for next visit.
        // Password is never persisted — the auth cookie does that work.
        try {
          window.localStorage.setItem(LS_USERNAME, formData.username);
          window.localStorage.setItem(LS_REMEMBER, remember ? "1" : "0");
        } catch {
          /* ignore */
        }

        toast.success(
          remember
            ? "관리자로 로그인되었습니다 · 30일간 자동 로그인 유지"
            : "관리자로 로그인되었습니다"
        );
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error || "로그인에 실패했습니다.");
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-background px-4'>
      <div className='w-full max-w-sm bg-cart-paper border border-cart-rule rounded-[4px] p-6'>
        {/* Header */}
        <div className='text-center mb-7'>
          <KickerLabel tone='lime' className='mb-2'>
            · ADMIN · CONSOLE
          </KickerLabel>
          <h1 className='font-display text-[24px] font-bold tracking-[-0.025em] text-cart-ink'>
            관리자 로그인
          </h1>
          <p className='mt-1.5 text-[12px] text-cart-ink-60'>
            관리자 페이지에 접근하려면 로그인이 필요합니다.
          </p>
        </div>

        {error && (
          <div className='mb-4 px-3 py-2.5 rounded-[4px] border border-red-500/40 bg-red-500/10'>
            <KickerLabel tone='muted' className='tracking-[0.18em] mb-1'>
              ● AUTH ERROR
            </KickerLabel>
            <p className='text-[12px] text-cart-ink'>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Username */}
          <div className='space-y-1.5'>
            <label
              htmlFor='username'
              className='text-[12px] font-semibold text-cart-ink tracking-[-0.005em]'
            >
              아이디
            </label>
            <div className='relative'>
              <User className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cart-ink-60' />
              <input
                id='username'
                name='username'
                type='text'
                value={formData.username}
                onChange={handleChange}
                placeholder='아이디'
                autoComplete='username'
                required
                className='w-full pl-9 pr-3 py-2 rounded-[4px] border border-cart-rule bg-background text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50'
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className='space-y-1.5'>
            <label
              htmlFor='password'
              className='text-[12px] font-semibold text-cart-ink tracking-[-0.005em]'
            >
              비밀번호
            </label>
            <div className='relative'>
              <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cart-ink-60' />
              <input
                id='password'
                name='password'
                type='password'
                value={formData.password}
                onChange={handleChange}
                placeholder='비밀번호'
                autoComplete={remember ? "current-password" : "off"}
                required
                className='w-full pl-9 pr-3 py-2 rounded-[4px] border border-cart-rule bg-background text-cart-ink placeholder:text-cart-ink-40 focus:outline-none focus:border-[hsl(var(--lime))] transition-colors disabled:opacity-50'
                disabled={loading}
              />
            </div>
          </div>

          {/* Remember me — extends the cookie to 30 days */}
          <label className='flex items-center gap-2.5 cursor-pointer select-none group'>
            <span className='relative'>
              <input
                type='checkbox'
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className='peer sr-only'
                disabled={loading}
              />
              <span
                className='block w-4 h-4 rounded-[2px] border border-cart-rule bg-background transition-colors
                            peer-checked:bg-[hsl(var(--lime))] peer-checked:border-[hsl(var(--lime))]
                            peer-focus-visible:ring-2 peer-focus-visible:ring-[hsl(var(--lime))]/40'
              />
              {remember && (
                <svg
                  viewBox='0 0 10 8'
                  className='absolute inset-0 m-auto w-2.5 h-2 pointer-events-none'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  style={{ color: "hsl(var(--lime-foreground))" }}
                >
                  <path d='M1 4l3 3 5-6' />
                </svg>
              )}
            </span>
            <span className='text-[12px] text-cart-ink'>
              30일간 자동 로그인 유지
            </span>
            <span className='ml-auto font-mono text-[9px] tracking-[0.18em] text-cart-ink-40 uppercase'>
              {remember ? "30D" : "2H"}
            </span>
          </label>

          <button
            type='submit'
            disabled={loading}
            className='w-full py-3 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[14px] font-bold tracking-[-0.01em] active:scale-[0.98] transition-transform hover:bg-[hsl(var(--lime))]/90 disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {loading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span className='font-mono text-[10px] tracking-[0.18em]'>
                  AUTHENTICATING…
                </span>
              </>
            ) : (
              <>
                <span>로그인</span>
                <span className='font-mono text-[10px] font-semibold tracking-[0.12em]'>
                  SIGN IN →
                </span>
              </>
            )}
          </button>
        </form>

        <KickerLabel
          tone='muted'
          className='text-center tracking-[0.18em] mt-5'
        >
          · 비밀번호는 저장되지 않습니다 ·
        </KickerLabel>
      </div>
    </div>
  );
}
