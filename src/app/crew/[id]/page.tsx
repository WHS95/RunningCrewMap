// src/app/crew/[id]/page.tsx — 크루 단독 페이지(검색 유입용).
//
// 크루 정보는 그동안 지도·목록의 시트(클라이언트 렌더)로만 열려서 검색엔진이 읽을 주소가 없었다.
// 이 페이지는 서버에서 크루 이름·지역·소개·활동 정보를 그대로 HTML 로 내보내고,
// 크루마다 고유한 title · description · canonical · 구조화 데이터(JSON-LD)를 붙인다.
// 데이터는 공개 목록 캐시(getCrews, tag `crews`)에서 찾는다 — 비공개 크루는 404.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ArrowUpRight } from "lucide-react";
import { CartographicHeader, KickerLabel } from "@/components/design/cartographic";
import { getCrews } from "@/lib/server/crews";
import { getCrewsByRegion, getRegionDef, regionCodeForCrew } from "@/lib/server/regions";
import { CSS_VARIABLES } from "@/lib/constants";
import type { Crew } from "@/lib/types/crew";

export const revalidate = 600;

// 빌드 때 300여 장을 미리 만들지 않는다 — 처음 열릴 때 만들어 두고 캐시한다(ISR).
export async function generateStaticParams() {
  return [];
}

const SITE_URL = "https://www.runhouse.club";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RELATED_LIMIT = 12;

interface Props {
  params: Promise<{ id: string }>;
}

async function findCrew(id: string): Promise<Crew | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const crews = await getCrews();
  return crews.find((c) => c.id === id) ?? null;
}

/** "경기 군포시 …" → "경기 군포시". 주소가 없으면 빈 문자열. */
function shortArea(crew: Crew): string {
  const address = crew.location.main_address || crew.location.address || "";
  return address.split(" ").slice(0, 2).join(" ").trim();
}

/** 이름에 이미 '크루'가 들어 있으면 '러닝크루'를 덧붙이지 않는다(예: "두루미 러닝크루 러닝크루" 방지). */
function crewLabel(name: string): string {
  return /크루|crew/i.test(name) ? name : `${name} 러닝크루`;
}

function instagramHandle(raw?: string): string | null {
  const handle = raw?.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "");
  return handle ? handle : null;
}

function foundedYear(crew: Crew): string | null {
  const year = crew.founded_date?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : null;
}

function buildDescription(crew: Crew): string {
  const area = shortArea(crew);
  const facts = [
    area ? `${area}에서 활동하는 러닝크루` : "러닝크루",
    crew.activity_day,
    crew.age_range,
  ].filter(Boolean);
  const intro = crew.description.replace(/\s+/g, " ").trim();
  return `${crew.name} — ${facts.join(" · ")}. ${intro}`.slice(0, 155);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const crew = await findCrew(id);
  if (!crew) return { title: "러닝크루", robots: { index: false, follow: true } };

  const area = shortArea(crew);
  const title = area ? `${crewLabel(crew.name)} · ${area}` : crewLabel(crew.name);
  const description = buildDescription(crew);
  const image = crew.logo_image || "/android-chrome-512x512.png";
  return {
    // 루트 템플릿은 "| 러닝크루맵" 을 붙인다 — 크루 페이지는 브랜드명(런하우스)으로 고정한다.
    title: { absolute: `${title} | 런하우스` },
    description,
    keywords: [crew.name, `${crew.name} 러닝크루`, `${crew.name} 가입`, area && `${area} 러닝크루`, "러닝크루"].filter(
      (k): k is string => Boolean(k)
    ),
    alternates: { canonical: `/crew/${crew.id}` },
    openGraph: {
      title: `${title} | 런하우스`,
      description,
      url: `/crew/${crew.id}`,
      type: "profile",
      images: [{ url: image, alt: `${crew.name} 로고` }],
    },
    twitter: { card: "summary", title: `${title} | 런하우스`, description, images: [image] },
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-t border-cart-rule first:border-t-0">
      <dt className="w-[72px] shrink-0 font-mono text-[10px] tracking-[0.12em] text-cart-ink-60 pt-0.5">{label}</dt>
      <dd className="flex-1 min-w-0 text-[14px] leading-[1.6] text-cart-ink break-keep">{children}</dd>
    </div>
  );
}

export default async function CrewPage({ params }: Props) {
  const { id } = await params;
  const crew = await findCrew(id);
  if (!crew) notFound();

  const area = shortArea(crew);
  const regionCode = regionCodeForCrew(crew);
  const region = regionCode ? getRegionDef(regionCode) : undefined;
  const related = regionCode
    ? (await getCrewsByRegion(regionCode)).filter((c) => c.id !== crew.id).slice(0, RELATED_LIMIT)
    : [];
  const handle = instagramHandle(crew.instagram);
  const year = foundedYear(crew);
  const openChat = crew.open_chat_link && /^https?:\/\//i.test(crew.open_chat_link) ? crew.open_chat_link : null;
  const photos = (crew.photos ?? []).slice(0, 6);
  const url = `${SITE_URL}/crew/${crew.id}`;

  // 구조화 데이터 — 화면에 실제로 보이는 값만 넣는다.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SportsOrganization",
      "@id": url,
      name: crew.name,
      alternateName: crewLabel(crew.name) === crew.name ? undefined : crewLabel(crew.name),
      description: crew.description.replace(/\s+/g, " ").trim(),
      sport: "Running",
      url,
      logo: crew.logo_image || undefined,
      image: photos.length > 0 ? photos : crew.logo_image || undefined,
      foundingDate: year ?? undefined,
      sameAs: handle ? [`https://www.instagram.com/${handle}/`] : undefined,
      address: area
        ? { "@type": "PostalAddress", addressCountry: "KR", streetAddress: crew.location.main_address || area }
        : undefined,
      location: {
        "@type": "Place",
        name: crew.location.main_address || area || crew.name,
        geo: { "@type": "GeoCoordinates", latitude: crew.location.lat, longitude: crew.location.lng },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "런하우스", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "지역별 러닝크루", item: `${SITE_URL}/regions` },
        ...(region
          ? [{ "@type": "ListItem", position: 3, name: `${region.name} 러닝크루`, item: `${SITE_URL}/regions/${region.code}` }]
          : []),
        { "@type": "ListItem", position: region ? 4 : 3, name: crew.name, item: url },
      ],
    },
  ];

  return (
    <article className="flex flex-col min-h-screen bg-background" style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}>
      <script
        type="application/ld+json"
        // "<" 를 이스케이프해 소개 글에 </script> 가 들어 있어도 태그가 닫히지 않게 한다.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="px-[18px] pt-4">
        <Link
          href={region ? `/regions/${region.code}` : "/regions"}
          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] text-cart-ink-60 hover:text-[hsl(var(--lime))]"
        >
          <ChevronLeft className="w-3 h-3" /> {region ? `${region.name} 러닝크루` : "지역별 러닝크루"}
        </Link>
      </div>

      <div className="flex items-center gap-4 px-[18px] pt-4">
        {crew.logo_image ? (
          <div className="relative shrink-0 w-[72px] h-[72px] rounded-[4px] overflow-hidden border border-cart-rule bg-cart-paper">
            <Image
              src={crew.logo_image}
              alt={`${crew.name} 로고`}
              width={72}
              height={72}
              className="object-cover w-full h-full"
              sizes="72px"
              priority
              unoptimized
            />
          </div>
        ) : (
          <div className="flex shrink-0 justify-center items-center w-[72px] h-[72px] rounded-[4px] bg-cart-paper border border-cart-rule font-display text-[28px] font-semibold text-[hsl(var(--lime))]">
            {crew.name.charAt(0)}
          </div>
        )}
        <CartographicHeader
          className="px-0 pt-0 pb-0 min-w-0"
          kicker={area ? `러닝크루 · ${area}` : "러닝크루"}
          title={crew.name}
        />
      </div>

      <section className="px-[18px] pt-6" aria-labelledby="crew-about">
        <KickerLabel tone="lime" className="mb-2">
          <h2 id="crew-about" className="inline">· {crew.name} 소개</h2>
        </KickerLabel>
        <p className="text-[15px] leading-[1.75] text-cart-ink whitespace-pre-line break-keep">{crew.description}</p>
      </section>

      <section className="px-[18px] pt-6" aria-labelledby="crew-facts">
        <KickerLabel tone="lime" className="mb-1">
          <h2 id="crew-facts" className="inline">· 활동 정보</h2>
        </KickerLabel>
        <dl className="border-t border-b border-cart-rule">
          {crew.location.main_address && <Fact label="활동 지역">{crew.location.main_address}</Fact>}
          {crew.activity_locations && crew.activity_locations.length > 0 && (
            <Fact label="모이는 곳">{crew.activity_locations.join(", ")}</Fact>
          )}
          {crew.activity_day && <Fact label="정기 러닝">{crew.activity_day}</Fact>}
          {crew.age_range && <Fact label="연령대">{crew.age_range}</Fact>}
          {year && <Fact label="창단">{year}년</Fact>}
          {handle && (
            <Fact label="인스타그램">
              <a
                href={`https://www.instagram.com/${handle}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[hsl(var(--lime))] underline underline-offset-2"
              >
                @{handle} <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
              </a>
            </Fact>
          )}
        </dl>
      </section>

      {(handle || openChat) && (
        <section className="px-[18px] pt-6" aria-labelledby="crew-join">
          <KickerLabel tone="lime" className="mb-2">
            <h2 id="crew-join" className="inline">· {crew.name} 가입 방법</h2>
          </KickerLabel>
          <div className="flex flex-col gap-2.5">
            {handle && crew.use_instagram_dm && (
              <a
                href={`https://www.instagram.com/${handle}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-4 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] transition-transform"
              >
                <span className="font-display text-[15px] font-bold">인스타그램 DM으로 가입 문의</span>
                <span className="font-mono text-[10px] font-semibold tracking-[0.12em]">DM →</span>
              </a>
            )}
            {openChat && (
              <a
                href={openChat}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center justify-between px-5 py-4 border border-cart-rule text-cart-ink rounded-[4px] active:scale-[0.98] transition-transform"
              >
                <span className="font-display text-[15px] font-bold">오픈채팅 · 가입 링크 열기</span>
                <span className="font-mono text-[10px] font-semibold tracking-[0.12em]">OPEN →</span>
              </a>
            )}
            {handle && !crew.use_instagram_dm && !openChat && (
              <p className="text-[14px] leading-[1.6] text-cart-ink-60">
                가입 방법은 크루 인스타그램 @{handle} 에서 확인해 주세요.
              </p>
            )}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section className="px-[18px] pt-6" aria-labelledby="crew-photos">
          <KickerLabel tone="lime" className="mb-2">
            <h2 id="crew-photos" className="inline">· 활동 사진</h2>
          </KickerLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-[4px] border border-cart-rule bg-cart-paper">
                <Image
                  src={src}
                  alt={`${crew.name} 활동 사진 ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 140px, 33vw"
                  loading="lazy"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="px-[18px] pt-6">
        <Link
          href="/map"
          className="flex items-center justify-between px-5 py-4 border border-cart-rule text-cart-ink rounded-[4px] active:scale-[0.98] transition-transform"
        >
          <span className="font-display text-[15px] font-bold">지도에서 주변 크루 보기</span>
          <span className="font-mono text-[10px] font-semibold tracking-[0.12em]">MAP →</span>
        </Link>
      </div>

      {related.length > 0 && region && (
        <nav className="pt-8" aria-labelledby="crew-related">
          <KickerLabel tone="lime" className="px-[18px] mb-2">
            <h2 id="crew-related" className="inline">· {region.name}의 다른 러닝크루</h2>
          </KickerLabel>
          <ul className="border-t border-b border-cart-rule">
            {related.map((c) => (
              <li key={c.id} className="border-t border-cart-rule first:border-t-0">
                <Link href={`/crew/${c.id}`} className="flex items-baseline gap-3 px-[18px] py-3 active:bg-white/[0.02]">
                  <span className="text-[14px] font-semibold text-cart-ink truncate">{c.name}</span>
                  <span className="font-mono text-[10px] tracking-[0.04em] text-cart-ink-60 truncate">{shortArea(c)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/regions/${region.code}`}
            className="block px-[18px] py-4 font-mono text-[10px] tracking-[0.18em] text-[hsl(var(--lime))]"
          >
            {region.name} 러닝크루 모두 보기 →
          </Link>
        </nav>
      )}

      <p className="px-[18px] pt-2 pb-28 text-[11px] leading-relaxed text-cart-ink-60">
        크루가 직접 등록한 정보예요. 내용이 다르면{" "}
        <Link href="/crew/edit/login" className="underline text-[hsl(var(--lime))]">
          크루 정보 수정
        </Link>
        에서 고칠 수 있어요.
      </p>
    </article>
  );
}
