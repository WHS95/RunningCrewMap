// src/app/api/webhooks/groble/route.ts
// Groble 결제 웹훅. 서명(HMAC-SHA256 of "{timestamp}.{raw_body}") 검증 → 멱등 키로 중복 차단 →
// payment.completed 면 sellerReference(= 우리 주문 id)로 record_orders 를 결제 완료 처리한다.
// 가이드: https://www.groble.im/help/guides/webhook
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { serverSupabase } from "@/lib/server/supabase";
import { RECORDS_CACHE_TAG, isUuid } from "@/lib/server/records";

export const runtime = "nodejs";

const SKEW_SECS = 5 * 60;

function verify(raw: string, sig: string | null, ts: string | null, secret: string): boolean {
  if (!sig || !ts) return false;
  const now = Math.floor(Date.now() / 1000);
  const tsNum = Number(ts.length > 10 ? Math.floor(Number(ts) / 1000) : ts);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > SKEW_SECS) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig.trim().toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface GroblePayload {
  eventType?: string;
  type?: string;
  event?: string;
  data?: GroblePayment;
  [k: string]: unknown;
}
interface GroblePayment {
  merchantUid?: string;
  sellerReference?: string;
  buyer?: { displayName?: string; phoneNumber?: string; email?: string };
  pricing?: { finalAmount?: number; shippingFee?: number };
  shipping?: { address?: string; streetAddress?: string; detailAddress?: string; deliveryRequest?: string };
  payment?: { purchasedAt?: string };
}

export async function POST(req: NextRequest) {
  const secret = (process.env.GROBLE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    console.error("[groble] GROBLE_WEBHOOK_SECRET not set");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const raw = await req.text();
  const ok = verify(
    raw,
    req.headers.get("x-groble-signature"),
    req.headers.get("x-groble-timestamp"),
    secret
  );
  if (!ok) return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });

  let body: GroblePayload;
  try {
    body = JSON.parse(raw) as GroblePayload;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const eventType = String(body.eventType ?? body.type ?? body.event ?? "");
  const idem = req.headers.get("x-groble-idempotency-key") ?? `${eventType}:${crypto.createHash("sha256").update(raw).digest("hex")}`;

  // 멱등: 이미 처리한 이벤트면 200 으로 끝낸다(재시도 중단).
  const { error: idemErr } = await serverSupabase
    .from("groble_webhook_events")
    .insert({ idempotency_key: idem, event_type: eventType });
  if (idemErr) {
    if (idemErr.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    console.error("[groble] idempotency insert failed:", idemErr);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const d: GroblePayment = (body.data ?? (body as unknown as GroblePayment)) ?? {};
  const ref = typeof d.sellerReference === "string" ? d.sellerReference : null;

  if (eventType === "payment.completed") {
    if (!ref || !isUuid(ref)) {
      // ref 가 없으면 우리 주문과 못 잇는다. 운영자가 웹에서 수동 매칭할 수 있게 로그만 남긴다.
      console.warn("[groble] payment.completed without usable ref", d.merchantUid);
      return NextResponse.json({ ok: true, unmatched: true });
    }
    const patch: Record<string, unknown> = {
      payment_status: "paid",
      status: "confirmed",
      groble_merchant_uid: d.merchantUid ?? null,
      paid_amount: d.pricing?.finalAmount ?? null,
      paid_at: d.payment?.purchasedAt ?? new Date().toISOString(),
      payment_raw: d,
      updated_at: new Date().toISOString(),
    };
    // 그로블 결제창에서 받은 배송지가 있으면 우선한다(구매자가 결제 시점에 최종 확인한 값).
    if (d.shipping?.address || d.shipping?.streetAddress) {
      patch.shipping_address = d.shipping.streetAddress ?? d.shipping.address;
      if (d.shipping.detailAddress) patch.shipping_detail = d.shipping.detailAddress;
      if (d.shipping.deliveryRequest) patch.delivery_request = d.shipping.deliveryRequest;
    }
    if (d.buyer?.phoneNumber) patch.buyer_phone = d.buyer.phoneNumber.replace(/\D/g, "");
    if (d.buyer?.displayName) patch.buyer_name = d.buyer.displayName;

    const { data, error } = await serverSupabase
      .from("record_orders")
      .update(patch)
      .eq("id", ref)
      .select("id");
    if (error) {
      console.error("[groble] order update failed:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    if (!data?.length) return NextResponse.json({ ok: true, unmatched: true });
    revalidateTag(RECORDS_CACHE_TAG);
    revalidatePath("/record");
    revalidatePath("/record/hall");
    return NextResponse.json({ ok: true });
  }

  if (eventType === "payment.cancel_requested" || eventType === "payment.refunded") {
    if (ref && isUuid(ref)) {
      await serverSupabase
        .from("record_orders")
        .update({
          payment_status: eventType === "payment.refunded" ? "refunded" : "cancel_requested",
          ...(eventType === "payment.refunded" ? { status: "cancelled" } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ref);
      revalidateTag(RECORDS_CACHE_TAG);
      revalidatePath("/record");
      revalidatePath("/record/hall");
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: eventType });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
