"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// 로그인 폼 검증 스키마
const loginSchema = z.object({
  username: z.string().min(1, "크루 아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export default function CrewLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 입력 값 검증
      const result = loginSchema.safeParse(formData);
      if (!result.success) {
        setError(result.error.errors[0].message);
        setLoading(false);
        return;
      }

      // API 로그인 엔드포인트 호출
      const response = await fetch("/api/crew/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("크루 계정으로 로그인되었습니다.");
        // 크루 관리 페이지로 리다이렉트
        router.push("/crew/dashboard");
        router.refresh(); // 리다이렉트 페이지를 새로고침하여 미들웨어가 작동하도록 함
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
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <div className='w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold'>크루 로그인</h1>
          <p className='mt-2 text-gray-600'>
            크루 정보 관리를 위해 로그인이 필요합니다.
          </p>
        </div>

        {error && (
          <div className='p-3 text-sm text-red-800 bg-red-100 rounded-md'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='username'>크루 아이디</Label>
              <Input
                id='username'
                name='username'
                type='text'
                value={formData.username}
                onChange={handleChange}
                placeholder='크루 아이디를 입력하세요'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>비밀번호</Label>
              <Input
                id='password'
                name='password'
                type='password'
                value={formData.password}
                onChange={handleChange}
                placeholder='비밀번호를 입력하세요'
                required
              />
            </div>
          </div>

          <Button type='submit' className='w-full' disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  );
}
