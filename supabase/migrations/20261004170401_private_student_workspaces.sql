-- Move the accountless demo toward private student workspaces. Existing rows
-- remain in place with a null owner and are no longer visible to clients.
alter table public.notes
 add column owner_id uuid references auth.users(id) on delete cascade,
 add column share_token text unique;
alter table public.notes alter column owner_id set default auth.uid();

alter table public.folders
 add column owner_id uuid references auth.users(id) on delete cascade;
alter table public.folders alter column owner_id set default auth.uid();

drop policy if exists "MVP shared notes read" on public.notes;
drop policy if exists "MVP shared notes insert" on public.notes;
drop policy if exists "MVP shared notes update" on public.notes;
drop policy if exists "MVP shared notes delete" on public.notes;
drop policy if exists "MVP shared folders read" on public.folders;
drop policy if exists "MVP shared folders insert" on public.folders;
drop policy if exists "MVP shared folders update" on public.folders;
drop policy if exists "MVP shared folders delete" on public.folders;
drop policy if exists "MVP shared history read" on public.note_versions;
drop policy if exists "MVP shared history insert" on public.note_versions;

revoke all on public.notes, public.folders, public.note_versions from anon;
grant select, insert, update, delete on public.notes, public.folders to authenticated;
grant select, insert on public.note_versions to authenticated;

create policy "Private notes read" on public.notes for select to authenticated using (owner_id = (select auth.uid()));
create policy "Private notes insert" on public.notes for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Private notes update" on public.notes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Private notes delete" on public.notes for delete to authenticated using (owner_id = (select auth.uid()));
create policy "Private folders read" on public.folders for select to authenticated using (owner_id = (select auth.uid()));
create policy "Private folders insert" on public.folders for insert to authenticated with check (
 owner_id = (select auth.uid()) and
 (folders.parent_id is null or exists (select 1 from public.folders parent where parent.id = folders.parent_id and parent.owner_id = (select auth.uid())))
);
create policy "Private folders update" on public.folders for update to authenticated using (owner_id = (select auth.uid())) with check (
 owner_id = (select auth.uid()) and
 (folders.parent_id is null or exists (select 1 from public.folders parent where parent.id = folders.parent_id and parent.owner_id = (select auth.uid())))
);
create policy "Private folders delete" on public.folders for delete to authenticated using (owner_id = (select auth.uid()));
create policy "Private history read" on public.note_versions for select to authenticated using (
 exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid()))
);
create policy "Private history insert" on public.note_versions for insert to authenticated with check (
 exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid()))
);

drop policy if exists "Private notes insert" on public.notes;
drop policy if exists "Private notes update" on public.notes;
create policy "Private notes insert" on public.notes for insert to authenticated with check (
 owner_id = (select auth.uid()) and
 (notes.folder_id is null or exists (select 1 from public.folders f where f.id = notes.folder_id and f.owner_id = (select auth.uid())))
);
create policy "Private notes update" on public.notes for update to authenticated using (owner_id = (select auth.uid())) with check (
 owner_id = (select auth.uid()) and
 (notes.folder_id is null or exists (select 1 from public.folders f where f.id = notes.folder_id and f.owner_id = (select auth.uid())))
);

create or replace function public.get_shared_note(p_token text)
returns table(id uuid, title text, content jsonb, pages jsonb, document_label text, page_layout text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select n.id, n.title, n.content, n.pages, n.document_label, n.page_layout, n.created_at, n.updated_at
 from public.notes n
 -- This function intentionally treats an unguessable UUID as a bearer link.
 -- Never return owner, folder, favorite, or version history data from it.
 where p_token is not null and length(p_token) = 36 and n.share_token = p_token
 limit 1;
$$;
revoke all on function public.get_shared_note(text) from public;
grant execute on function public.get_shared_note(text) to anon, authenticated;
