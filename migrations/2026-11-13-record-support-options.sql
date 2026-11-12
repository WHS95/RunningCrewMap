-- 2026-11-13 — 커피챗 후원 금액 3종(1,500 · 3,000 · 5,000원). 재실행 안전.
-- option_id 는 코드의 SUPPORT_OPTIONS id(mega · cafe · starbucks), amount 는 고른 금액(결제 전 의도값).
-- 실제 결제 금액은 웹훅이 paid_amount 에 적는다.
alter table public.record_supports
  add column if not exists option_id text,
  add column if not exists amount integer;
