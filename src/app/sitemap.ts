// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { REGION_DEFS } from "@/lib/server/regions";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://running-crew-map.vercel.app";

export const revalidate = 600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,          lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/map`,       lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/crew/list`, lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/regions`,   lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/notice`,    lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
    { url: `${BASE_URL}/register`,  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
  const regionRoutes: MetadataRoute.Sitemap = REGION_DEFS.map((d) => ({
    url: `${BASE_URL}/regions/${d.code}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));
  // Week 2: /crew/[id] 단독 페이지가 생기면 visible crew URL을 추가한다.
  return [...staticRoutes, ...regionRoutes];
}
