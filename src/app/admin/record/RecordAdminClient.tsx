"use client";

/**
 * /admin/record — 기록 인증 승인큐 + 각인 주문 신청 관리.
 *
 * - 대기/승인/반려 탭: 기록증(signed URL)을 열어 공식 기록과 대조 후 승인·반려
 * - 승인 시 인증번호(RH-REC-00000) 발급 → 결과 링크 DM 문구 복사
 * - 주문 탭: 신청 → 확인(결제) → 제작 → 발송 / 취소
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, RotateCw } from "lucide-react";
import { CartographicHeader, KickerLabel } from "@/components/design/cartographic";
import {
  approveRecord,
  getCertificateUrl,
  listRecordsAdmin,
  rejectRecord,
  updateRecordOrderStatus,
} from "@/app/actions/record";
import { SKUS, TIER_BY_ID, formatSeconds } from "@/lib/record/tier";
import type {
  AdminOrderRow,
  AdminRecordRow,
  OrderStatus,
  VerificationStatus,
} from "@/lib/types/record";
import { cn } from "@/lib/utils";

type Tab = VerificationStatus | "orders";

/** timestamptz → KST 기준 YYYY.MM.DD */
function kstDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
}

const TAB_LABEL: Record<Tab, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  orders: "주문",
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  requested: "신청",
  confirmed: "결제 확인",
  in_production: "제작 중",
  shipped: "발송",
  cancelled: "취소",
};

export function RecordAdminClient() {
  const [records, setRecords] = useState<AdminRecordRow[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listRecordsAdmin();
    if (res.success) {
      setRecords(res.records);
      setOrders(res.orders);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      pending: records.filter((r) => r.status === "pending").length,
      approved: records.filter((r) => r.status === "approved").length,
      rejected: records.filter((r) => r.status === "rejected").length,
      orders: orders.filter((o) => o.status === "requested").length,
    }),
    [records, orders]
  );

  const recordById = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const visible = tab === "orders" ? [] : records.filter((r) => r.status === tab);

  const resultUrl = (r: AdminRecordRow) =>
    `${window.location.origin}/record/r/${r.id}?token=${r.purchaseToken}`;

  const openCertificate = async (id: string) => {
    // await 뒤의 window.open 은 팝업 차단에 걸리므로 클릭 시점에 창을 먼저 연다.
    const win = window.open("", "_blank");
    if (win) win.opener = null;
    const res = await getCertificateUrl(id);
    if (!res.success) {
      win?.close();
      return toast.error(res.error);
    }
    if (win) win.location.href = res.url;
    else window.location.href = res.url;
  };

  const approve = async (r: AdminRecordRow) => {
    setBusy(r.id);
    const res = await approveRecord(r.id);
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    toast.success(`승인 완료 · ${res.certNo}`);
    load();
  };

  const reject = async (id: string) => {
    setBusy(id);
    const res = await rejectRecord(id, reason);
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    setRejectFor(null);
    setReason("");
    toast.success("반려했습니다.");
    load();
  };

  const copyDm = async (r: AdminRecordRow) => {
    const tier = r.tier ? TIER_BY_ID[r.tier].label : "";
    const text =
      r.status === "approved"
        ? `안녕하세요, 런하우스입니다 🏅\n${r.raceName} ${formatSeconds(r.seconds)} 기록이 ${tier} 인증되었어요! (인증번호 ${r.certNo})\n\n아래 링크에서 역대 기록장 공개 설정과 기록 각인 액세서리 신청을 할 수 있어요. 링크는 본인 전용이니 저장해 두세요.\n${resultUrl(r)}`
        : `안녕하세요, 런하우스입니다.\n${r.raceName} 기록 인증 신청을 확인했어요. 아래 링크에서 진행 상황을 볼 수 있어요.\n${resultUrl(r)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("DM 문구를 복사했어요.");
    } catch {
      toast.error("복사 실패");
    }
  };

  const setOrderStatus = async (o: AdminOrderRow, status: OrderStatus) => {
    setBusy(o.id);
    const res = await updateRecordOrderStatus(o.id, status);
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status } : x)));
  };

  return (
    <div className="pb-28">
      <CartographicHeader
        kicker="RECORD · 기록 각인"
        title="기록 인증 관리"
        action={
          <button
            type="button"
            onClick={load}
            aria-label="새로고침"
            className="w-11 h-11 flex items-center justify-center rounded-[4px] border border-cart-rule text-cart-ink-60"
          >
            <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        }
      />

      <div className="px-[22px] flex gap-1.5 flex-wrap">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "h-9 px-3 rounded-[2px] border font-mono text-[11px] tracking-[0.06em]",
              tab === t ? "bg-cart-ink text-background border-cart-ink" : "border-cart-rule text-cart-ink-60"
            )}
          >
            {TAB_LABEL[t]} {counts[t]}
          </button>
        ))}
      </div>

      <div className="px-[22px] pt-4">
        {loading && <p className="py-8 text-center text-[13px] text-cart-ink-60">불러오는 중…</p>}

        {!loading && tab !== "orders" && visible.length === 0 && (
          <p className="py-8 text-center text-[13px] text-cart-ink-60">항목이 없습니다.</p>
        )}

        {!loading &&
          tab !== "orders" &&
          visible.map((r) => (
            <div key={r.id} className="py-4 border-t border-cart-rule flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-cart-ink">{r.runnerName}</span>
                    {r.tier && (
                      <span className="font-mono text-[9px] font-bold tracking-[0.08em] text-[hsl(var(--lime))]">
                        {TIER_BY_ID[r.tier].label}
                      </span>
                    )}
                    {r.certNo && <span className="font-mono text-[10px] text-cart-ink-60">{r.certNo}</span>}
                  </div>
                  <div className="text-[12px] text-cart-ink-60 mt-1">
                    {r.raceName} · {r.raceDate.replaceAll("-", ".")} · 배번 {r.bibNumber ?? "—"}
                  </div>
                  <div className="text-[11px] text-cart-ink-40 mt-0.5">
                    {r.crewName ?? "크루 없음"} · {r.runnerInstagram ? `@${r.runnerInstagram}` : "인스타 없음"} ·{" "}
                    {r.hallPublic ? "공개 동의" : "비공개"} · 신청 {kstDate(r.createdAt)}
                  </div>
                  {r.status === "rejected" && r.rejectedReason && (
                    <div className="text-[11px] text-[#FF9A6B] mt-0.5">사유: {r.rejectedReason}</div>
                  )}
                </div>
                <span className="font-mono text-[18px] font-bold text-cart-ink tabular-nums shrink-0">
                  {formatSeconds(r.seconds)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <AdminBtn onClick={() => openCertificate(r.id)}>
                  <ExternalLink className="w-3.5 h-3.5" /> 기록증
                </AdminBtn>
                <AdminBtn onClick={() => copyDm(r)}>
                  <Copy className="w-3.5 h-3.5" /> DM 문구
                </AdminBtn>
                {r.status !== "approved" && (
                  <AdminBtn tone="lime" disabled={busy === r.id} onClick={() => approve(r)}>
                    승인 · 인증번호 발급
                  </AdminBtn>
                )}
                {r.status !== "rejected" && (
                  <AdminBtn disabled={busy === r.id} onClick={() => setRejectFor(rejectFor === r.id ? null : r.id)}>
                    반려
                  </AdminBtn>
                )}
              </div>

              {rejectFor === r.id && (
                <div className="flex gap-1.5">
                  <label htmlFor={`reason-${r.id}`} className="sr-only">반려 사유</label>
                  <input
                    id={`reason-${r.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="반려 사유 (본인에게 보여요)"
                    className="flex-1 h-10 px-3 rounded-[4px] bg-cart-paper border border-cart-rule text-[13px] text-cart-ink outline-none"
                  />
                  <AdminBtn disabled={busy === r.id} onClick={() => reject(r.id)}>확인</AdminBtn>
                </div>
              )}
            </div>
          ))}

        {!loading && tab === "orders" && orders.length === 0 && (
          <p className="py-8 text-center text-[13px] text-cart-ink-60">주문 신청이 없습니다.</p>
        )}

        {!loading &&
          tab === "orders" &&
          orders.map((o) => {
            const rec = recordById.get(o.entryId);
            return (
              <div key={o.id} className="py-4 border-t border-cart-rule flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold text-cart-ink">
                    {SKUS.find((s) => s.id === o.sku)?.label ?? o.sku}
                  </span>
                  <KickerLabel tone={o.status === "requested" ? "lime" : "muted"}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </KickerLabel>
                </div>
                <div className="font-mono text-[12px] text-cart-ink">
                  {o.engraving.runnerName} · {o.engraving.time} · {TIER_BY_ID[o.engraving.tier].label}
                </div>
                <div className="font-mono text-[11px] text-cart-ink-60">
                  {o.engraving.raceName} · {o.engraving.raceDate} · {o.engraving.certNo}
                </div>
                <div className="text-[12px] text-cart-ink-60">
                  연락 @{o.contactInstagram} · {kstDate(o.createdAt)}
                  {rec?.runnerInstagram && rec.runnerInstagram !== o.contactInstagram && ` · 신청자 @${rec.runnerInstagram}`}
                </div>
                {o.memo && <div className="text-[12px] text-cart-ink-60">메모: {o.memo}</div>}
                <div className="flex items-center gap-2">
                  <label htmlFor={`status-${o.id}`} className="text-[11px] text-cart-ink-40">상태</label>
                  <select
                    id={`status-${o.id}`}
                    value={o.status}
                    disabled={busy === o.id}
                    onChange={(e) => setOrderStatus(o, e.target.value as OrderStatus)}
                    className="h-10 px-2 rounded-[4px] bg-cart-paper border border-cart-rule text-[13px] text-cart-ink"
                  >
                    {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function AdminBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "lime";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-10 px-3 inline-flex items-center gap-1.5 rounded-[4px] border text-[12px] font-semibold disabled:opacity-50",
        tone === "lime"
          ? "bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] border-[hsl(var(--lime))]"
          : "border-cart-rule text-cart-ink"
      )}
    >
      {children}
    </button>
  );
}
