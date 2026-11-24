// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { REGION_DEFS } from "@/lib/server/regions";
import { getVisibleStores } from "@/lib/server/stores";
import { getCrews } from "@/lib/server/crews";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.runhouse.club";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [stores, crews] = await Promise.all([getVisibleStores(), getCrews()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,          lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/map`,       lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/crew/list`, lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/regions`,   lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/store`,     lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${BASE_URL}/league`,    lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/notice`,    lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
    { url: `${BASE_URL}/register`,  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
  const regionRoutes: MetadataRoute.Sitemap = REGION_DEFS.map((d) => ({
    url: `${BASE_URL}/regions/${d.code}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));
  const storeRoutes: MetadataRoute.Sitemap = stores.map((s) => ({
    url: `${BASE_URL}/store/${s.id}`,
    lastModified: s.created_at ? new Date(s.created_at) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  // 크루 단독 페이지 — 공개(is_visible) 크루만. 수정 시각을 따로 읽지 않으므로 lastModified 는 넣지 않는다
  // (틀린 날짜를 주면 검색엔진이 lastmod 전체를 믿지 않는다).
  const crewRoutes: MetadataRoute.Sitemap = crews.map((c) => ({
    url: `${BASE_URL}/crew/${c.id}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [...staticRoutes, ...regionRoutes, ...crewRoutes, ...storeRoutes];
}
