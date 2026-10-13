-- EXAMPLE ONLY. Do not apply directly to an existing project.
-- Align schema, ownership, permissions and migrations with actual app.
-- Supabase Data API exposure/grants must be considered separately from RLS.

create table if not exists public.example_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now()
);

alter table public.example_notes enable row level security;

-- Verify existing grants and actual API exposure before using.
create policy "note owner select" on public.example_notes
  for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "note owner insert" on public.example_notes
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "note owner update" on public.example_notes
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "note owner delete" on public.example_notes
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- This is NOT a complete migration: policy existence/idempotence, grants,
-- tenant sharing, storage, RPC, views, realtime and privilege boundaries
-- must be handled for your actual product and migration history.
