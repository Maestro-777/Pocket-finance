-- Pocket Finance: one private JSON document per authenticated user.
-- Applied to project zmaqsrhbhprdrfmsfbzb on 2026-11-22.

create table if not exists public.finance_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint finance_state_state_object check (jsonb_typeof(state) = 'object')
);

alter table public.finance_state enable row level security;

revoke all on table public.finance_state from anon;
grant select, insert, update, delete on table public.finance_state to authenticated;

drop policy if exists "Users can read their own finance state" on public.finance_state;
create policy "Users can read their own finance state"
  on public.finance_state for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own finance state" on public.finance_state;
create policy "Users can create their own finance state"
  on public.finance_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own finance state" on public.finance_state;
create policy "Users can update their own finance state"
  on public.finance_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own finance state" on public.finance_state;
create policy "Users can delete their own finance state"
  on public.finance_state for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists finance_state_updated_at_idx
  on public.finance_state (updated_at desc);
