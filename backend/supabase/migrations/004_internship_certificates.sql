-- UniPro: signed internship completion certificates
-- Run after 002_internships_schema.sql (Supabase Dashboard → SQL Editor).
--
-- Flow: company confirms (awaiting_student) → student accepts → API signs (issued)
--       student declines → disputed (company can correct and resubmit)
--       company/admin withdraws an issued one → revoked
--
-- signed_payload is the exact JSON string the Ed25519 signature covers.
-- It is written once, when the certificate is issued, and must never be edited.

create table if not exists public.internship_certificates (
  certificate_id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique
    references public.applications (application_id) on delete cascade,
  student_id uuid not null references public.students (user_id) on delete cascade,
  company_id uuid not null references public.companies (user_id) on delete cascade,
  internship_id uuid not null references public.internships (internship_id) on delete cascade,
  role_title text not null,
  start_date date not null,
  end_date date not null,
  skills jsonb not null default '[]'::jsonb,
  supervisor_name text not null,
  supervisor_comment text,
  status text not null default 'awaiting_student'
    check (status in ('awaiting_student', 'issued', 'disputed', 'revoked')),
  student_note text,
  signed_payload text,
  signature text,
  key_id text,
  created_at timestamptz not null default now(),
  issued_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  check (end_date >= start_date),
  check (status not in ('issued', 'revoked') or (signed_payload is not null and signature is not null))
);

create index if not exists internship_certificates_student_id_idx
  on public.internship_certificates (student_id);
create index if not exists internship_certificates_company_id_idx
  on public.internship_certificates (company_id);

-- The FastAPI backend reads and writes this table. Clients get read access only
-- to their own rows; the public verify page goes through the API, not the table.
alter table public.internship_certificates enable row level security;

drop policy if exists internship_certificates_select_own on public.internship_certificates;
create policy internship_certificates_select_own
  on public.internship_certificates for select to authenticated
  using (auth.uid() = student_id or auth.uid() = company_id);
