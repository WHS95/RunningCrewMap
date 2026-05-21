import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CartographicHeader, KickerLabel } from "@/components/design/cartographic";
import { RegionCrewRow } from "@/components/regions/RegionCrewRow";
import {
  getAllRegionCodes,
  getCrewsByRegion,
  getRegionDef,
  type RegionCode,
} from "@/lib/server/regions";
import { CSS_VARIABLES } from "@/lib/constants";

export const revalidate = 600;

export async function generateStaticParams() {
  return getAllRegionCodes().map((code) => ({ code }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> }
): Promise<Metadata> {
  const { code } = await params;
  const def = getRegionDef(code);
  if (!def) return {};
  const crews = await getCrewsByRegion(code as RegionCode);
  const title = `${def.name} 러닝크루 ${crews.length}곳`;
  const description = `${def.name}에서 활동 중인 러닝크루를 한눈에. ${def.blurb}.`;
  return {
    title,
    description,
    alternates: { canonical: `/regions/${code}` },
    openGraph: {
      title: `${title} | 런하우스`,
      description,
      url: `/regions/${code}`,
      type: "website",
    },
  };
}

export default async function RegionDetailPage(
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const def = getRegionDef(code);
  if (!def) notFound();

  const crews = await getCrewsByRegion(code as RegionCode);

  return (
    <div
      className="flex flex-col min-h-screen bg-background"
      style={{ paddingTop: CSS_VARIABLES.HEADER_PADDING }}
    >
      <div className="px-[18px] pt-4 pb-3">
        <Link
          href="/regions"
          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] text-cart-ink-60 hover:text-[hsl(var(--lime))] mb-2"
        >
          <ChevronLeft className="w-3 h-3" /> ALL REGIONS
        </Link>
        {/* kicker: leading · 는 CartographicHeader가 자동으로 붙이므로 생략 */}
        <CartographicHeader
          kicker={`REGION · ${def.name.toUpperCase()}`}
          title={`${def.name} 러닝크루 ${crews.length}곳`}
        />
        <KickerLabel tone="muted" className="tracking-[0.18em] mt-2">
          {def.blurb}
        </KickerLabel>
      </div>

      {crews.length === 0 ? (
        <div className="px-[18px] py-10 text-center">
          <KickerLabel tone="muted" className="tracking-[0.18em]">
            · 등록된 크루가 없습니다 ·
          </KickerLabel>
          <div className="mt-4">
            {/* LimeCTA는 button 전용이므로 Link로 감싸 CTA 스타일 구현 */}
            <Link
              href="/register"
              className="w-full flex items-center justify-between px-5 py-4 bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] rounded-[4px] active:scale-[0.98] transition-transform"
            >
              <span className="font-display text-[15px] font-bold">우리 크루 등록하기</span>
              <span className="font-mono text-[10px] font-semibold tracking-[0.12em]">
                REGISTER →
              </span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="border-t border-b border-cart-rule">
          {crews.map((crew, i) => (
            <RegionCrewRow
              key={crew.id}
              crew={crew}
              rank={i + 1}
              regionCode={code as RegionCode}
            />
          ))}
        </div>
      )}

      <div className="px-[18px] py-6 text-[11px] text-cart-ink-60 leading-relaxed">
        주소의 시·도 표기를 기준으로 자동 분류합니다. 본인 크루의 분류가 잘못되어 있으면{" "}
        <Link href="/register" className="underline text-[hsl(var(--lime))]">
          등록 페이지
        </Link>
        에서 정확한 주소로 수정 요청을 보낼 수 있습니다.
      </div>
    </div>
  );
}
