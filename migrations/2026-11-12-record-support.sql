-- 2026-11-12 — 커피챗 후원 (3,000원, Groble 결제창). 재실행 안전.
-- 후원은 기록(hall_of_fame_entries)에 선택적으로 연결되며, 결제 완료 시 기록장에 SUPPORTER 표시가 붙는다.

create table if not exists public.record_supports (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.hall_of_fame_entries(id) on delete set null,
  supporter_name text,
  message text,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'cancel_requested', 'refunded')),
  groble_merchant_uid text,
  paid_amount integer,
  paid_at timestamptz,
  payment_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists record_supports_groble_uid_key
  on public.record_supports (groble_merchant_uid) where groble_merchant_uid is not null;
create index if not exists record_supports_entry_idx
  on public.record_supports (entry_id, payment_status);
create index if not exists record_supports_paid_idx
  on public.record_supports (payment_status, paid_at desc);

-- service role 전용 (정책 없음)
alter table public.record_supports enable row level security;
