"use client";

import { useState } from "react";
import Image from "next/image";
import type { Store } from "@/lib/types/store";
import { STORE_CATEGORY_LABELS } from "@/lib/types/store";
import {
  MapPin,
  Instagram,
  Clock,
  Phone,
  ExternalLink,
  ShieldCheck,
  Gift,
  MessageSquare,
  Tag,
} from "lucide-react";
import { StoreCategoryIcon } from "./StoreCategoryIcon";

type TabType = "info" | "photos";

export function StoreDetailView({ store }: { store: Store }) {
  const [activeTab, setActiveTab] = useState<TabType>("info");

  const igHandle = store.instagram?.replace(/^@/, "");

  // 카테고리별 fallback 로고 배경색
  const categoryColorMap: Record<string, string> = {
    cafe: "bg-amber-900/40",
    restaurant: "bg-red-900/40",
    pub: "bg-purple-900/40",
    other: "bg-cart-paper",
  };
  const fallbackBg = categoryColorMap[store.category] ?? "bg-cart-paper";

  // 사진 목록: main_image_url + photos 중복 제거
  const allPhotos = [
    ...(store.main_image_url ? [store.main_image_url] : []),
    ...store.photos.filter((p) => p !== store.main_image_url),
  ];

  return (
    <div>
      {/* 헤더 */}
      <div className="relative p-4 pb-3 border-b border-cart-rule">
        <div className="flex items-center justify-between">
          {/* 왼쪽 여백 (닫기 버튼은 부모 Sheet에 있음) */}
          <div className="w-9" />
          <div className="flex-1 text-center">
            <div className="font-mono text-[9px] tracking-[0.22em] text-[hsl(var(--lime))] font-semibold uppercase mb-0.5">
              · STORE
            </div>
            <h2 className="font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink">
              {store.name}
            </h2>
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-cart-rule">
        <button
          className={`flex-1 py-3 text-center font-mono text-[10px] tracking-[0.22em] uppercase ${
            activeTab === "info"
              ? "text-[hsl(var(--lime))] border-b border-[hsl(var(--lime))] font-semibold"
              : "text-cart-ink-60"
          }`}
          onClick={() => setActiveTab("info")}
        >
          INFO · 정보
        </button>
        <button
          className={`flex-1 py-3 text-center font-mono text-[10px] tracking-[0.22em] uppercase ${
            activeTab === "photos"
              ? "text-[hsl(var(--lime))] border-b border-[hsl(var(--lime))] font-semibold"
              : "text-cart-ink-60"
          }`}
          onClick={() => setActiveTab("photos")}
        >
          PHOTOS · 사진
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="overflow-y-auto h-[calc(85vh-100px)] pb-3">
        {activeTab === "info" && (
          <div className="p-3 pb-8 space-y-4">
            {/* 매장 로고 + 인스타그램 헤더 블록 */}
            <div className="flex items-center gap-3 mb-1">
              {/* 로고: logo_url → main_image_url → 카테고리 fallback */}
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={`${store.name} 로고`}
                  width={56}
                  height={56}
                  quality={20}
                  className="object-cover rounded-[4px] w-14 h-14 border border-cart-rule"
                  style={{ width: "56px", height: "56px" }}
                />
              ) : store.main_image_url ? (
                <Image
                  src={store.main_image_url}
                  alt={`${store.name} 대표 이미지`}
                  width={56}
                  height={56}
                  quality={20}
                  className="object-cover rounded-[4px] w-14 h-14 border border-cart-rule"
                  style={{ width: "56px", height: "56px" }}
                />
              ) : (
                <div
                  className={`flex items-center justify-center rounded-[4px] w-14 h-14 border border-cart-rule ${fallbackBg}`}
                >
                  <StoreCategoryIcon
                    category={store.category}
                    className="w-6 h-6 text-[hsl(var(--lime))]"
                  />
                </div>
              )}

              <div className="flex flex-col justify-center h-14 gap-1">
                {/* 카테고리 칩 */}
                <span className="inline-flex items-center gap-1 rounded-full border border-cart-rule px-2 py-0.5 text-xs text-cart-ink-60 w-fit">
                  <StoreCategoryIcon
                    category={store.category}
                    className="h-3 w-3"
                  />
                  {STORE_CATEGORY_LABELS[store.category]}
                </span>

                {/* 인스타그램 링크 */}
                {igHandle && (
                  <a
                    href={`https://www.instagram.com/${igHandle}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-1.5 text-blue-600 hover:underline"
                  >
                    <Instagram className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">@{igHandle}</span>
                  </a>
                )}
              </div>
            </div>

            {/* 정보 카드 목록 */}
            <div className="grid grid-cols-1 gap-2">
              {/* 위치 */}
              <div className="flex items-start gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="mr-1 text-xs font-medium">위치</p>
                  <p className="text-xs text-muted-foreground">
                    {store.location.address}
                  </p>
                </div>
              </div>

              {/* 영업시간 */}
              {store.business_hours && (
                <div className="flex items-start gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="mr-1 text-xs font-medium">영업시간</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {store.business_hours}
                    </p>
                  </div>
                </div>
              )}

              {/* 인증 방법 */}
              {store.verification_method && (
                <div className="flex items-start gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="mr-1 text-xs font-medium">인증 방법</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {store.verification_method}
                    </p>
                  </div>
                </div>
              )}

              {/* 혜택 */}
              {store.reward_description && (
                <div className="flex items-start gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule">
                  <Gift className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="mr-1 text-xs font-medium">혜택</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {store.reward_description}
                    </p>
                  </div>
                </div>
              )}

              {/* 연락처 */}
              {store.contact && (
                <div className="flex items-center gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="mr-1 text-xs font-medium">연락처</p>
                    <p className="text-xs text-muted-foreground">
                      {store.contact}
                    </p>
                  </div>
                </div>
              )}

              {/* 사장님 한마디 */}
              {store.owner_message && (
                <div className="flex items-start gap-2 p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule">
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="mr-1 text-xs font-medium">사장님 한마디</p>
                    <p className="text-xs text-muted-foreground italic">
                      {store.owner_message}
                    </p>
                  </div>
                </div>
              )}

              {/* 링크 (네이버지도 / 이벤트글 / 인스타) */}
              {(store.naver_map_url || store.event_post_url || igHandle) && (
                <div className="p-2.5 rounded-[4px] bg-cart-paper border border-cart-rule">
                  <h3 className="mb-1.5 text-xs font-medium flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    링크
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {store.naver_map_url && (
                      <a
                        href={store.naver_map_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase font-semibold px-3.5 py-2 rounded-[4px] bg-cart-paper border border-cart-rule text-cart-ink hover:border-[hsl(var(--lime))]/40 active:scale-95 transition-transform"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        네이버지도
                      </a>
                    )}
                    {store.event_post_url && (
                      <a
                        href={store.event_post_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase font-semibold px-3.5 py-2 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] active:scale-95 transition-transform"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        이벤트 글
                      </a>
                    )}
                    {igHandle && (
                      <a
                        href={`https://www.instagram.com/${igHandle}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase font-semibold px-3.5 py-2 rounded-[4px] bg-cart-paper border border-cart-rule text-cart-ink hover:border-[hsl(var(--lime))]/40 active:scale-95 transition-transform"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        인스타그램
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 소개글 */}
            {store.description && (
              <div className="p-2 mb-3 rounded-[4px] bg-cart-paper border border-cart-rule">
                <h3 className="mb-1 text-sm font-medium">소개글</h3>
                <div className="max-h-[35vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-accent-foreground/40">
                  <p className="pb-1 text-xs whitespace-pre-wrap text-muted-foreground">
                    {store.description}
                  </p>
                </div>
              </div>
            )}

            {/* 하단 여백 */}
            <div className="h-4" />
          </div>
        )}

        {activeTab === "photos" && (
          <div className="p-4 pb-8">
            <div className="mb-4">
              <div className="font-mono text-[9px] tracking-[0.22em] text-[hsl(var(--lime))] font-semibold mb-1">
                · STORE · PHOTOS
              </div>
              <h3 className="font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink">
                매장 사진
              </h3>
            </div>

            {allPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {allPhotos.map((url, i) => (
                  <div
                    key={url}
                    className={`relative overflow-hidden rounded-[4px] border border-cart-rule bg-cart-paper ${
                      i === 0 && allPhotos.length > 1
                        ? "col-span-2 aspect-video"
                        : "aspect-square"
                    }`}
                  >
                    <Image
                      src={url}
                      alt={i === 0 ? `${store.name} 대표 사진` : `${store.name} 사진 ${i + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 430px"
                      className="object-cover"
                      quality={70}
                      priority={i === 0}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative w-full overflow-hidden rounded-[4px] border border-cart-rule bg-cart-paper aspect-square">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-cart-ink-60 uppercase">
                    · 사진 준비 중 ·
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
