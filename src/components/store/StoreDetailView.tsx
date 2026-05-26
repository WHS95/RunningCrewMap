"use client";

import Image from "next/image";
import type { Store } from "@/lib/types/store";
import { CartographicHeader, HairlineRow } from "@/components/design/cartographic";
import { StoreCategoryChip } from "./StoreCategoryChip";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <HairlineRow className="px-3">
      <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-cart-ink-60">
        {label}
      </span>
      <span className="flex-1 break-words text-sm text-cart-ink">{children}</span>
    </HairlineRow>
  );
}

export function StoreDetailView({ store }: { store: Store }) {
  const igHandle = store.instagram?.replace(/^@/, "");
  return (
    <div className="space-y-4">
      <CartographicHeader
        kicker={`STORE · ${store.category.toUpperCase()}`}
        title={store.name}
      />
      <div className="space-y-1 px-[22px]">
        <StoreCategoryChip category={store.category} />
      </div>
      {store.main_image_url && (
        <div className="relative aspect-video w-full overflow-hidden bg-cart-paper">
          <Image
            src={store.main_image_url}
            alt={store.name}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="space-y-4 px-[22px]">
        {store.description && (
          <p className="whitespace-pre-wrap text-sm text-cart-ink">
            {store.description}
          </p>
        )}
        {store.verification_method && (
          <section>
            <h2 className="mb-1 text-xs font-medium text-cart-ink-60">
              러닝 인증 방식
            </h2>
            <p className="whitespace-pre-wrap text-sm text-cart-ink">
              {store.verification_method}
            </p>
          </section>
        )}
        {store.reward_description && (
          <section>
            <h2 className="mb-1 text-xs font-medium text-cart-ink-60">혜택</h2>
            <p className="whitespace-pre-wrap text-sm text-cart-ink">
              {store.reward_description}
            </p>
          </section>
        )}
        {store.owner_message && (
          <section>
            <h2 className="mb-1 text-xs font-medium text-cart-ink-60">
              사장님 한말씀
            </h2>
            <p className="text-sm italic text-cart-ink">{store.owner_message}</p>
          </section>
        )}
        <div className="rounded-md border border-cart-rule">
          <Row label="위치">{store.location.address}</Row>
          {store.business_hours && (
            <Row label="영업시간">{store.business_hours}</Row>
          )}
          {store.contact && <Row label="연락처">{store.contact}</Row>}
          {igHandle && (
            <Row label="인스타">
              <a
                href={`https://instagram.com/${igHandle}`}
                target="_blank"
                rel="noreferrer"
                className="text-[hsl(var(--lime))] underline-offset-2 hover:underline"
              >
                @{igHandle}
              </a>
            </Row>
          )}
          {store.naver_map_url && (
            <Row label="네이버지도">
              <a
                href={store.naver_map_url}
                target="_blank"
                rel="noreferrer"
                className="text-[hsl(var(--lime))] underline-offset-2 hover:underline"
              >
                열기 ↗
              </a>
            </Row>
          )}
          {store.event_post_url && (
            <Row label="이벤트 글">
              <a
                href={store.event_post_url}
                target="_blank"
                rel="noreferrer"
                className="text-[hsl(var(--lime))] underline-offset-2 hover:underline"
              >
                열기 ↗
              </a>
            </Row>
          )}
        </div>
        {store.photos.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-medium text-cart-ink-60">사진</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {store.photos.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-md bg-cart-paper"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
