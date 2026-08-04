-- Align public schema to FastAPI models (internships only — no jobs).
-- Single database: Supabase Postgres.
-- Keeps public.users + handle_new_user trigger from 001_auth_users_trigger.sql

-- ---------------------------------------------------------------------------
-- 1. Drop job-centric / mismatched legacy tables
-- ---------------------------------------------------------------------------
drop view if exists public.hired_skill_frequency cascade;
drop table if exists public.applications cascade;
drop table if exists public.job_skills cascade;
drop table if exists public.jobs cascade;
drop table if exists public.student_skills cascade;
drop table if exists public.hire_events cascade;
drop table if exists public.matches cascade;
drop table if exists public.saved_internships cascade;
drop table if exists public.internship_skills cascade;
drop table if exists public.internships cascade;
drop table if exists public.companies cascade;
drop table if exists public.students cascade;
drop table if exists public.skills cascade;

-- ---------------------------------------------------------------------------
-- 2. FastAPI-shaped tables
-- ---------------------------------------------------------------------------
create table public.skills (
  skill_id text primary key,
  name text not null
);

create table public.students (
  user_id uuid primary key references public.users (user_id) on delete cascade,
  university text,
  major text,
  graduation_year integer,
  gpa double precision,
  cv_path text,
  skills_embedding jsonb
);

create table public.companies (
  user_id uuid primary key references public.users (user_id) on delete cascade,
  company_name text not null,
  industry text,
  verification_status boolean not null default false
);

create table public.student_skills (
  student_id uuid not null references public.students (user_id) on delete cascade,
  skill_id text not null references public.skills (skill_id) on delete cascade,
  primary key (student_id, skill_id)
);

create table public.internships (
  internship_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (user_id) on delete cascade,
  title text not null,
  description text not null,
  location text not null,
  work_type text not null check (work_type in ('remote', 'hybrid', 'onsite')),
  duration text not null,
  category text not null,
  stipend text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  posted_date date not null,
  deadline date not null,
  required_skills_embedding jsonb,
  tags jsonb not null default '[]'::jsonb
);

create index internships_company_id_idx on public.internships (company_id);
create index internships_posted_date_idx on public.internships (posted_date desc);

create table public.internship_skills (
  internship_id uuid not null references public.internships (internship_id) on delete cascade,
  skill_id text not null references public.skills (skill_id) on delete cascade,
  primary key (internship_id, skill_id)
);

create table public.matches (
  match_id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (user_id) on delete cascade,
  internship_id uuid not null references public.internships (internship_id) on delete cascade,
  hscr double precision not null,
  sgi double precision not null,
  sssa double precision not null,
  matched_skills jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (student_id, internship_id)
);

create index matches_student_id_idx on public.matches (student_id);

create table public.applications (
  application_id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (user_id) on delete cascade,
  internship_id uuid not null references public.internships (internship_id) on delete cascade,
  status text not null default 'applied'
    check (status in ('applied', 'under_review', 'interview', 'accepted', 'rejected')),
  applied_at timestamptz not null default now(),
  record_hash text not null,
  unique (student_id, internship_id)
);

create index applications_student_id_idx on public.applications (student_id);

create table public.saved_internships (
  student_id uuid not null references public.students (user_id) on delete cascade,
  internship_id uuid not null references public.internships (internship_id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (student_id, internship_id)
);

-- ---------------------------------------------------------------------------
-- 3. RLS (FastAPI uses DB role / pooler and bypasses RLS; clients stay locked down)
-- ---------------------------------------------------------------------------
alter table public.skills enable row level security;
alter table public.students enable row level security;
alter table public.companies enable row level security;
alter table public.student_skills enable row level security;
alter table public.internships enable row level security;
alter table public.internship_skills enable row level security;
alter table public.matches enable row level security;
alter table public.applications enable row level security;
alter table public.saved_internships enable row level security;

-- Public browse: authenticated users can read open internships + related skills/companies
create policy internships_select_authenticated
  on public.internships for select to authenticated
  using (true);

create policy internship_skills_select_authenticated
  on public.internship_skills for select to authenticated
  using (true);

create policy skills_select_authenticated
  on public.skills for select to authenticated
  using (true);

create policy companies_select_authenticated
  on public.companies for select to authenticated
  using (true);

create policy students_select_own
  on public.students for select to authenticated
  using (auth.uid() = user_id);

create policy students_update_own
  on public.students for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy student_skills_select_own
  on public.student_skills for select to authenticated
  using (auth.uid() = student_id);

create policy matches_select_own
  on public.matches for select to authenticated
  using (auth.uid() = student_id);

create policy applications_select_own
  on public.applications for select to authenticated
  using (auth.uid() = student_id);

create policy saved_select_own
  on public.saved_internships for select to authenticated
  using (auth.uid() = student_id);
