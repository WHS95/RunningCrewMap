// src/app/join/[code]/page.tsx — 런하우스 리그 크루 초대 랜딩
//
// 리그 앱에서 공유한 초대 링크(runhouse.club/join/RH-XXXX?n=<크루명>)를 받은 사람이 보는 화면.
// 앱 설치 → 크루 찾기에서 코드 입력 흐름을 안내한다.
// 크루 이름은 링크의 `?n=` 값을 그대로 쓴다 — league 스키마를 웹에서 읽지 않는다(코드 조회 오라클 방지).
// 코드 자체의 유효성은 앱이 가입할 때 검증한다.
import type { Metadata } from "next";
import { KickerLabel, RunHouseWordmark } from "@/components/design/cartographic";
import { JoinActions } from "@/components/league/JoinActions";
import { normalizeInviteCode, sanitizeCrewNameHint } from "@/lib/league/invite";

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveInvite({ params, searchParams }: PageProps) {
  const [{ code: rawCode }, sp] = await Promise.all([params, searchParams]);
  const code = normalizeInviteCode(rawCode);
  // 코드 모양이 아니면 이름도 보여 주지 않는다(주소로 아무 글이나 띄우지 않게).
  return { code, crewName: code ? sanitizeCrewNameHint(sp.n) : null };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { crewName } = await resolveInvite(props);
  const title = crewName ? `${crewName} 초대 · 런하우스 리그` : "크루 초대 · 런하우스 리그";
  const ogTitle = crewName ? `「${crewName}」에 초대받았어요` : "런하우스 리그 크루에 초대받았어요";
  const description = "초대 코드를 넣으면 바로 크루원이 돼요. 런하우스 리그 — 러닝 크루 리그";
  const image = { url: "/league/join-og.png", width: 1200, height: 630, alt: "런하우스 리그 크루 초대" };

  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "런하우스 리그",
      title: ogTitle,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: [image.url] },
  };
}

export default async function JoinInvitePage(props: PageProps) {
  const { code, crewName } = await resolveInvite(props);

  return (
    <div
      className="min-h-[100dvh] flex flex-col px-[22px]"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)",
      }}
    >
      <div className="flex items-center justify-between">
        <RunHouseWordmark />
        <KickerLabel tone="muted">LEAGUE</KickerLabel>
      </div>

      <section className="pt-12 flex flex-col gap-4">
        <KickerLabel tone="lime" className="text-[10px]">
          ● CREW INVITE
        </KickerLabel>
        <h1 className="text-[30px] leading-[1.3] font-extrabold tracking-[-0.02em] text-cart-ink break-keep">
          {code ? (
            <>
              {crewName ? `「${crewName}」에` : "런하우스 리그 크루에"}
              <br />
              초대받았어요
            </>
          ) : (
            "초대 코드를 찾지 못했어요"
          )}
        </h1>
      </section>

      <JoinActions
        code={code}
        description={
          code
            ? "앱을 설치하고 크루 찾기에서 초대 코드를 넣으면 바로 크루원이 돼요."
            : "받은 링크가 잘렸을 수 있어요. 크루에 다시 요청해 주세요. 앱에서는 크루 찾기로 크루를 둘러볼 수 있어요."
        }
      />

      <p className="mt-4 text-center font-mono text-[10px] tracking-[0.18em] text-cart-ink-40">
        RUNHOUSE LEAGUE · 러닝 크루 리그
      </p>
    </div>
  );
}
