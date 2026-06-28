create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 10000),
  source text not null check (source in ('quick', 'manual', 'home_hint')),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists water_logs_user_logged_at_idx
  on public.water_logs (user_id, logged_at desc);

alter table public.water_logs enable row level security;

revoke all on table public.water_logs from anon;
revoke all on table public.water_logs from authenticated;
grant select, insert, delete on table public.water_logs to authenticated;

create policy "water_logs_select_own"
  on public.water_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "water_logs_insert_own"
  on public.water_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "water_logs_delete_own"
  on public.water_logs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
