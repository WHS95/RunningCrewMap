import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "매장 자가수정 로그인 — 런하우스",
};

export default function StoreEditLoginPage() {
  return <LoginForm />;
}
