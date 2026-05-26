"use client";

import {
  PlusCircle,
  MessageCircle,
  MapPin,
  ChevronRight,
  Calculator,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CSS_VARIABLES } from "@/lib/constants";
import {
  CartographicHeader,
  KickerLabel,
} from "@/components/design/cartographic";

interface MenuLinkRow {
  title: string;
  en: string;
  path: string;
  isExternal?: boolean;
  href?: string;
}

const PRIMARY_LINKS: MenuLinkRow[] = [
  { title: "크루 등록", en: "REGISTER", path: "/register" },
  { title: "내 크루 정보 수정", en: "EDIT MY CREW", path: "/crew/edit/login" },
  { title: "지역별 보기", en: "REGIONS", path: "/regions" },
  { title: "러닝 인증 매장", en: "STORES", path: "/store" },
  { title: "매장 등록", en: "STORE REGISTER", path: "/store/register" },
  { title: "내 매장 수정", en: "STORE EDIT", path: "/store/edit/login" },
  { title: "러닝 계산기", en: "CALCULATORS", path: "/calculator" },
  {
    title: "문의 및 건의",
    en: "CONTACT",
    path: "https://open.kakao.com/me/runhouse",
    isExternal: true,
  },
];

export default function MenuPage() {
  const router = useRouter();

  const handleClick = (item: MenuLinkRow) => {
    if (item.isExternal) {
      window.open(item.path, "_blank");
    } else {
      router.push(item.path);
    }
  };

  return (
    <div
      className='flex flex-col bg-background'
      style={{
        height: CSS_VARIABLES.CONTENT_HEIGHT_MOBILE,
        paddingTop: CSS_VARIABLES.HEADER_PADDING,
      }}
    >
      <CartographicHeader
        kicker={`MENU · ${PRIMARY_LINKS.length} ITEMS`}
        title='메뉴'
      />

      {/* Primary actions */}
      <section className='px-[22px]'>
        <KickerLabel tone='muted' className='py-2 tracking-[0.18em]'>
          ACTIONS
        </KickerLabel>
        <div>
          {PRIMARY_LINKS.map((item, idx) => (
            <button
              key={item.path}
              onClick={() => handleClick(item)}
              className={`flex items-center gap-3 w-full py-3.5 text-left transition-transform active:scale-[0.99] ${
                idx === 0 ? "" : "border-t border-cart-rule"
              }`}
            >
              <div className='w-9 h-9 rounded-[4px] bg-cart-paper border border-cart-rule flex items-center justify-center flex-shrink-0'>
                {item.en === "REGISTER" ? (
                  <PlusCircle
                    className='w-4 h-4 text-[hsl(var(--lime))]'
                    strokeWidth={1.6}
                  />
                ) : item.en === "REGIONS" ? (
                  <MapPin
                    className='w-4 h-4 text-[hsl(var(--lime))]'
                    strokeWidth={1.6}
                  />
                ) : item.en === "CALCULATORS" ? (
                  <Calculator
                    className='w-4 h-4 text-[hsl(var(--lime))]'
                    strokeWidth={1.6}
                  />
                ) : (
                  <MessageCircle
                    className='w-4 h-4 text-[hsl(var(--lime))]'
                    strokeWidth={1.6}
                  />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-[14px] font-semibold text-cart-ink'>
                  {item.title}
                </div>
                <KickerLabel tone='muted' className='mt-0.5 tracking-[0.18em]'>
                  · {item.en}
                </KickerLabel>
              </div>
              <ChevronRight className='w-4 h-4 text-cart-ink-40' />
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
