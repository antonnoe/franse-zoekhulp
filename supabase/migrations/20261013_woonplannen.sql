-- Run once in the Supabase SQL Editor. No service role key is used in the app.
begin;
create table if not exists public.woonplannen (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.woonplannen enable row level security;
revoke all on public.woonplannen from anon;
grant select, insert, update, delete on public.woonplannen to authenticated;
create policy "read own woonplan" on public.woonplannen for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own woonplan" on public.woonplannen for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own woonplan" on public.woonplannen for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own woonplan" on public.woonplannen for delete to authenticated using ((select auth.uid()) = user_id);
commit;
