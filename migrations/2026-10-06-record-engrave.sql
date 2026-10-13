-- 2026-10-06 — 기록 각인(RECORD) : 인증 · 역대 기록장 · 각인 주문 신청
--
-- 기존 hall_of_fame_entries(서브3 명예의 전당, 0건)를 기록 인증 테이블로 확장한다.
-- 모든 문은 재실행해도 안전하도록(idempotent) 작성했다.
--
-- 티어(풀코스 넷 타임): sub3 < 3:00:00 · single < 3:10:00 · sub4 < 4:00:00 · sub5 < 5:00:00
-- 승인 흐름: verification_status = pending → approved | rejected (관리자)
-- 공개 기록장: verification_status = 'approved' AND hall_public = true

-- 1) hall_of_fame_entries 확장 ------------------------------------------------
alter table public.hall_of_fame_entries
  add column if not exists tier text,
  add column if not exists bib_number text,
  add column if not exists runner_instagram text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists rejected_reason text,
  add column if not exists verified_at timestamptz,
  add column if not exists cert_no text,
  add column if not exists purchase_token uuid not null default gen_random_uuid(),
  add column if not exists hall_public boolean not null default true,
  add column if not exists name_masked boolean not null default true;

-- 기존 폼은 출생년도를 필수로 받았지만, 기록 인증에는 필요 없다.
alter table public.hall_of_fame_entries alter column birth_year drop not null;
-- 승인 전 노출 금지 (기존 기본값 true 였음). 공개 여부는 verification_status + hall_public 으로 판단.
alter table public.hall_of_fame_entries alter column is_visible set default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hall_of_fame_entries_tier_check') then
    alter table public.hall_of_fame_entries
      add constraint hall_of_fame_entries_tier_check
      check (tier is null or tier in ('sub3', 'single', 'sub4', 'sub5'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hall_of_fame_entries_verification_status_check') then
    alter table public.hall_of_fame_entries
      add constraint hall_of_fame_entries_verification_status_check
      check (verification_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create unique index if not exists hall_of_fame_entries_cert_no_key
  on public.hall_of_fame_entries (cert_no) where cert_no is not null;
create unique index if not exists hall_of_fame_entries_purchase_token_key
  on public.hall_of_fame_entries (purchase_token);
create index if not exists hall_of_fame_entries_public_idx
  on public.hall_of_fame_entries (verification_status, hall_public, race_time);

-- 2) 인증번호 발급 함수 -------------------------------------------------------
-- 승인 시 서버(service role)만 호출한다. RH-REC-00001 형식, 이미 있으면 그대로 반환.
create sequence if not exists public.record_cert_seq start 1;
revoke all on sequence public.record_cert_seq from public, anon, authenticated;
grant usage, select on sequence public.record_cert_seq to service_role;

create or replace function public.assign_record_cert_no(entry_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert text;
begin
  select cert_no into v_cert from public.hall_of_fame_entries where id = entry_id;
  if v_cert is not null then
    return v_cert;
  end if;
  v_cert := 'RH-REC-' || lpad(nextval('public.record_cert_seq')::text, 5, '0');
  update public.hall_of_fame_entries set cert_no = v_cert where id = entry_id and cert_no is null;
  return v_cert;
end;
$$;

-- PostgREST 가 public 함수를 anon 키에 노출하므로 실행 권한을 service role 로 제한한다.
revoke execute on function public.assign_record_cert_no(uuid) from public, anon, authenticated;
grant execute on function public.assign_record_cert_no(uuid) to service_role;

-- 3) 각인 주문 신청 -----------------------------------------------------------
-- 결제 연동 전 단계: 주문 "신청"만 받고 관리자가 인스타 DM 으로 결제·배송을 안내한다.
create table if not exists public.record_orders (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.hall_of_fame_entries (id) on delete cascade,
  sku text not null check (sku in ('tag', 'lace', 'plate')),
  -- 승인된 기록에서 서버가 만든 각인 문구 스냅샷. 클라이언트 입력은 쓰지 않는다.
  engraving jsonb not null,
  contact_instagram text not null,
  memo text,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'in_production', 'shipped', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists record_orders_entry_idx on public.record_orders (entry_id);
create index if not exists record_orders_status_idx on public.record_orders (status, created_at desc);

-- 4) RLS: 정책 없이 활성화 → anon/authenticated 접근 차단, service role 만 사용 ----
alter table public.hall_of_fame_entries enable row level security;
alter table public.record_orders enable row level security;

-- 5) 기록증 이미지 비공개 버킷 -----------------------------------------------
-- 기록증에는 실명·배번이 담긴다. 공개 URL 없이 관리자 화면에서 signed URL 로만 연다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordCertificates', 'recordCertificates', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
