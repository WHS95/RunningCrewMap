-- 2026-11-11 — 기록 각인 결제 연동 (Groble 결제창) + 배송 정보 + 단일 상품(아크릴 키링·NFC)
-- 모든 문은 재실행해도 안전하다.

-- 1) 상품: 아크릴 키링 1종 (keyring). 기존 tag/lace/plate 는 시안 단계 값이라 허용은 유지한다.
alter table public.record_orders drop constraint if exists record_orders_sku_check;
alter table public.record_orders
  add constraint record_orders_sku_check check (sku in ('keyring', 'tag', 'lace', 'plate'));

-- 2) 주문자·배송지 (우리 폼에서 받는다. Groble 웹훅의 shipping 블록이 오면 덮어쓴다)
alter table public.record_orders
  add column if not exists buyer_name text,
  add column if not exists buyer_phone text,
  add column if not exists shipping_postcode text,
  add column if not exists shipping_address text,
  add column if not exists shipping_detail text,
  add column if not exists delivery_request text,
  -- 3) 결제 (Groble)
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists groble_merchant_uid text,
  add column if not exists paid_amount integer,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_raw jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'record_orders_payment_status_check') then
    alter table public.record_orders
      add constraint record_orders_payment_status_check
      check (payment_status in ('unpaid', 'paid', 'cancel_requested', 'refunded'));
  end if;
end $$;

create unique index if not exists record_orders_groble_uid_key
  on public.record_orders (groble_merchant_uid) where groble_merchant_uid is not null;
create index if not exists record_orders_payment_idx
  on public.record_orders (payment_status, created_at desc);

-- 4) 웹훅 멱등 처리: 같은 이벤트를 두 번 받아도 한 번만 반영
create table if not exists public.groble_webhook_events (
  idempotency_key text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);
alter table public.groble_webhook_events enable row level security;
