-- UniPro: public.users profile + auth.users → users trigger
-- Run in Supabase Dashboard → SQL Editor (project must already exist).
-- Passwords live only in auth.users (hashed by Supabase). Never store them here.

-- ---------------------------------------------------------------------------
-- public.users (id / email / role only — no password)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'student'
    check (role in ('student', 'company', 'admin')),
  created_at timestamptz not null default now()
);

-- If an older FastAPI schema left a password column behind, remove it.
alter table public.users drop column if exists password_hash;

-- Ensure full_name is nullable (blank until profile is completed).
alter table public.users alter column full_name drop not null;

create index if not exists users_email_idx on public.users (email);

-- ---------------------------------------------------------------------------
-- Trigger: new auth.users row → blank public.users profile
-- Fires on signUp (before OTP verify). Session is granted only after verifyOtp.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  meta_name text;
begin
  meta_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if meta_role not in ('student', 'company', 'admin') then
    meta_role := 'student';
  end if;

  meta_name := coalesce(new.raw_user_meta_data->>'full_name', '');

  insert into public.users (user_id, email, full_name, role)
  values (new.id, new.email, nullif(meta_name, ''), meta_role)
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS: users can read/update their own profile row
-- FastAPI uses the Postgres connection string (bypasses RLS as table owner /
-- or use a role that bypasses RLS). Anon/authenticated clients are restricted.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert/delete for authenticated clients — inserts come from the trigger.
