-- Shared library folders and per-note display preferences for the accountless MVP.
create table public.folders (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 icon text not null default '📚',
 parent_id uuid references public.folders(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index folders_parent_idx on public.folders(parent_id);
alter table public.folders enable row level security;
grant select, insert, update, delete on public.folders to anon;
create policy "MVP shared folders read" on public.folders for select to anon using (true);
create policy "MVP shared folders insert" on public.folders for insert to anon with check (true);
create policy "MVP shared folders update" on public.folders for update to anon using (true) with check (true);
create policy "MVP shared folders delete" on public.folders for delete to anon using (true);

alter table public.notes add column folder_id uuid references public.folders(id) on delete set null;
alter table public.notes add column icon text not null default '📄';
alter table public.notes add column document_label text not null default 'LECTURE NOTES';
alter table public.notes add column page_layout text not null default 'infinite'
 check (page_layout in ('infinite', 'vertical', 'horizontal', 'spread'));
create index notes_folder_updated_idx on public.notes(folder_id, updated_at desc);
