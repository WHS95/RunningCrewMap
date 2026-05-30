// src/app/store/register/page.tsx
import type { Metadata } from "next";
import { StoreRegisterForm } from "@/components/store/StoreRegisterForm";

export const metadata: Metadata = {
  title: "매장 등록 — 런하우스",
  description: "러닝 인증 매장 자가 등록",
};

export default function StoreRegisterPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">매장 등록</h1>
      <p className="mb-6 text-sm text-cart-muted">
        등록 후 어드민 승인을 거쳐 공개됩니다. PIN을 잘 기억해 주세요.
      </p>
      <StoreRegisterForm />
    </main>
  );
}
