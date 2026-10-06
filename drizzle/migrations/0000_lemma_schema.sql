create table public.folders (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 icon text not null default '📚',
 parent_id uuid references public.folders(id) on delete cascade,
 owner_id uuid not null default auth.uid(),
 created_at timestamptz not null default now()
);
create index folders_parent_idx on public.folders(parent_id);
grant select, insert, update, delete on public.folders to authenticated;
grant all on public.folders to service_role;
alter table public.folders enable row level security;

create table public.notes (
 id uuid primary key default gen_random_uuid(),
 title text not null default 'Untitled',
 content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}',
 pages jsonb not null default '[]'::jsonb,
 is_favorite boolean not null default false,
 folder_id uuid references public.folders(id) on delete set null,
 icon text not null default '📄',
 document_label text not null default 'LECTURE NOTES',
 page_layout text not null default 'vertical' check (page_layout in ('infinite','vertical','horizontal','spread')),
 owner_id uuid not null default auth.uid(),
 share_token text unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index notes_updated_at_idx on public.notes(updated_at desc);
create index notes_folder_updated_idx on public.notes(folder_id, updated_at desc);
grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;

create table public.note_versions (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references public.notes(id) on delete cascade,
 title text not null,
 content jsonb not null,
 pages jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now()
);
create index note_versions_note_created_idx on public.note_versions(note_id, created_at desc);
grant select, insert on public.note_versions to authenticated;
grant all on public.note_versions to service_role;
alter table public.note_versions enable row level security;

create policy "Private folders read" on public.folders for select to authenticated using (owner_id = (select auth.uid()));
create policy "Private folders insert" on public.folders for insert to authenticated with check (owner_id = (select auth.uid()) and (folders.parent_id is null or exists (select 1 from public.folders p where p.id = folders.parent_id and p.owner_id = (select auth.uid()))));
create policy "Private folders update" on public.folders for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and (folders.parent_id is null or exists (select 1 from public.folders p where p.id = folders.parent_id and p.owner_id = (select auth.uid()))));
create policy "Private folders delete" on public.folders for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Private notes read" on public.notes for select to authenticated using (owner_id = (select auth.uid()));
create policy "Private notes insert" on public.notes for insert to authenticated with check (owner_id = (select auth.uid()) and (notes.folder_id is null or exists (select 1 from public.folders f where f.id = notes.folder_id and f.owner_id = (select auth.uid()))));
create policy "Private notes update" on public.notes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and (notes.folder_id is null or exists (select 1 from public.folders f where f.id = notes.folder_id and f.owner_id = (select auth.uid()))));
create policy "Private notes delete" on public.notes for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Private history read" on public.note_versions for select to authenticated using (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid())));
create policy "Private history insert" on public.note_versions for insert to authenticated with check (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid())));

create function public.lemma_snapshot_note() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (old.title, old.content, old.pages) is distinct from (new.title, new.content, new.pages) then
  if not exists (select 1 from public.note_versions where note_id = old.id and created_at > now() - interval '2 minutes') then
   insert into public.note_versions(note_id,title,content,pages) values(old.id,old.title,old.content,old.pages);
  end if;
 end if;
 new.updated_at = now();
 return new;
end;
$$;
create trigger lemma_note_update before update on public.notes for each row execute function public.lemma_snapshot_note();

create or replace function public.get_shared_note(p_token text)
returns table(id uuid, title text, content jsonb, pages jsonb, document_label text, page_layout text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select n.id, n.title, n.content, n.pages, n.document_label, n.page_layout, n.created_at, n.updated_at
 from public.notes n
 where p_token is not null and length(p_token) = 36 and n.share_token = p_token
 limit 1;
$$;
revoke all on function public.get_shared_note(text) from public;
grant execute on function public.get_shared_note(text) to anon, authenticated;
revoke all on function public.lemma_snapshot_note() from public, anon, authenticated;