"use client";

/**
 * CrewApprovalDmDialog — 크루를 숨김 → 표시(승인)로 넘긴 직후 뜨는 다이얼로그.
 *
 * 승인 순간이 어드민이 크루장과 처음 연락하는 지점이라, 매번 환영 인사와 안내를
 * 새로 타이핑하지 않도록 인스타 DM 에 그대로 붙여넣을 전문을 만들어준다.
 * PIN 초기화 다이얼로그(`/admin/crew`)의 "안내문 복사"와 같은 결.
 *
 * 자가-수정 링크는 기본으로 넣지 않는다 — `rotateCrewEditToken` 이 edit_token 을
 * 새로 발급하면서 등록 알림 때 Discord 로 나간 기존 링크를 무효화하기 때문에,
 * 어드민이 "수정 링크 추가"를 누른 경우에만 발급해 문구에 덧붙인다.
 */

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { KickerLabel } from "@/components/design/cartographic";
import { rotateCrewEditToken } from "@/app/actions/crew";

export interface CrewApprovalTarget {
  crewId: string;
  crewName: string;
  instagram: string | null;
}

/** 폴백 오리진 — 서버 렌더 시점에는 window 가 없다. */
const FALLBACK_ORIGIN = "https://www.runhouse.club";

/**
 * 인스타 DM 은 마크다운을 렌더링하지 않는다.
 * 기호와 줄바꿈만으로 구조를 잡고, 링크는 전체 URL 을 그대로 노출한다.
 */
export function buildApprovalMessage(
  target: CrewApprovalTarget,
  origin: string,
  editUrl: string | null
): string {
  const lines = [
    `안녕하세요, ${target.crewName} 운영진님! 🎉`,
    "전국 러닝크루 지도 '런하우스'입니다.",
    "",
    `신청해주신 ${target.crewName} 크루가 검토를 마치고 런하우스 지도에 정식으로 등록되었습니다.`,
    "이제 누구나 지도와 크루 목록에서 크루를 찾아볼 수 있어요.",
    "",
    `· 지도에서 보기 → ${origin}/map`,
    `· 크루 목록 → ${origin}/crew/list`,
    "",
    "─────────────",
    "■ 크루 정보는 운영진이 직접 수정할 수 있어요",
    "",
    "크루 소개, 대표 사진, 정기 러닝 요일, 모임 장소를 언제든 직접 바꾸실 수 있습니다.",
    `수정 페이지 → ${origin}/crew/edit/login`,
    `(인스타그램 아이디${
      target.instagram ? ` '${target.instagram}'` : ""
    } + 수정 PIN 으로 로그인)`,
    "",
  ];

  if (editUrl) {
    lines.push(
      "처음이시라면 아래 링크에서 수정 PIN 부터 설정해주세요.",
      editUrl,
      "※ 이 링크로 크루 정보를 수정할 수 있으니 외부에 공유하지 말아주세요.",
      ""
    );
  } else {
    lines.push(
      "아직 수정 PIN 을 설정하지 않으셨다면, PIN 설정용 링크를 보내드릴게요.",
      "이 DM 으로 답장만 주시면 바로 전달해드립니다. (PIN 을 잊으신 경우에도 동일합니다)",
      ""
    );
  }

  lines.push(
    "─────────────",
    "■ 러닝크루 운영진을 위해 이런 것들도 만들고 있어요",
    "",
    "· 크루 전용 마라톤 기록증 — 완주 기록을 크루 브랜드로 디자인, 인쇄용 PDF 지원",
    "  https://running-crew-certification-maker.vercel.app/",
    "· 커스텀 러닝 제품 제작 — 크루 로고를 넣은 모자 · 깃발 · 의류",
    "  https://runhouse-custom.vercel.app/",
    `· 전국 마라톤 대회 일정 캘린더 → ${origin}/events`,
    "",
    "필요하신 기능이나 잘못된 정보가 보이면 언제든 편하게 DM 주세요.",
    "앞으로 잘 부탁드립니다. 좋은 러닝 되세요! 🏃",
    "",
    "— 런하우스 드림",
    origin
  );

  return lines.join("\n");
}

interface Props {
  /** null 이면 닫힌 상태 */
  target: CrewApprovalTarget | null;
  onClose: () => void;
}

export function CrewApprovalDmDialog({ target, onClose }: Props) {
  const [editUrl, setEditUrl] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const message = useMemo(() => {
    if (!target) return "";
    const origin =
      typeof window === "undefined" ? FALLBACK_ORIGIN : window.location.origin;
    return buildApprovalMessage(target, origin, editUrl);
  }, [target, editUrl]);

  const issueEditUrl = useCallback(async () => {
    if (!target) return;
    setIssuing(true);
    try {
      const res = await rotateCrewEditToken(target.crewId);
      if (!res.success || !res.newToken) {
        toast.error(res.error || "수정 링크 발급에 실패했습니다.");
        return;
      }
      setEditUrl(
        `${window.location.origin}/crew/edit/${target.crewId}?token=${res.newToken}`
      );
      toast.success("수정 링크를 안내문에 넣었습니다.");
    } catch (e) {
      console.error("rotateCrewEditToken failed:", e);
      toast.error("수정 링크 발급 중 오류가 발생했습니다.");
    } finally {
      setIssuing(false);
    }
  }, [target]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("안내문 복사 완료");
    } catch {
      toast.error("복사에 실패했어요. 직접 선택해 복사해주세요.");
    }
  }, [message]);

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          setEditUrl(null);
          onClose();
        }
      }}
    >
      <DialogContent className='bg-cart-paper border border-cart-rule rounded-[4px] p-0 overflow-hidden max-h-[85vh] flex flex-col'>
        <DialogHeader className='px-5 pt-5 pb-3 border-b border-cart-rule shrink-0'>
          <KickerLabel tone='muted' className='mb-1.5 tracking-[0.22em]'>
            ● CREW · APPROVED · DM DRAFT
          </KickerLabel>
          <DialogTitle className='flex gap-2 items-center font-display text-[18px] font-bold tracking-[-0.02em] text-cart-ink'>
            <PartyPopper className='w-4 h-4 text-[hsl(var(--lime))]' />
            지도에 공개되었습니다
          </DialogTitle>
          <DialogDescription className='text-[12px] text-cart-ink-60 mt-1.5'>
            <strong className='text-cart-ink'>{target?.crewName}</strong> 크루장에게
            보낼 안내문이에요.{" "}
            {target?.instagram ? (
              <>
                인스타{" "}
                <span className='font-mono text-cart-ink'>
                  {target.instagram}
                </span>{" "}
                로 DM 보내주세요.
              </>
            ) : (
              "등록된 인스타그램으로 DM 보내주세요."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='px-5 py-4 overflow-y-auto min-h-0'>
          <pre className='rounded-[4px] border border-cart-rule bg-background px-3 py-3 text-[11px] leading-relaxed text-cart-ink-60 whitespace-pre-wrap break-words'>
            {message}
          </pre>
        </div>

        <DialogFooter className='gap-2 px-5 py-4 border-t border-cart-rule shrink-0'>
          <button
            type='button'
            onClick={issueEditUrl}
            disabled={issuing || editUrl !== null}
            title='edit_token을 새로 발급해 수정 링크를 안내문에 넣습니다 (기존 링크는 무효화)'
            className='flex-1 px-3 py-2.5 rounded-[4px] border border-cart-rule bg-background text-cart-ink-60 hover:text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all disabled:opacity-50'
          >
            {editUrl ? "링크 포함됨" : issuing ? "발급 중…" : "수정 링크 추가"}
          </button>
          <button
            type='button'
            onClick={copy}
            className='flex-1 px-3 py-2.5 rounded-[4px] bg-[hsl(var(--lime))] text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-all'
          >
            안내문 복사
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
