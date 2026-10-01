-- Deliberately shared, unauthenticated MVP. Do not store private notes.
create table public.notes (
 id uuid primary key default gen_random_uuid(),
 title text not null default 'Untitled',
 content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}',
 is_favorite boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index notes_updated_at_idx on public.notes(updated_at desc);
create table public.note_versions (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references public.notes(id) on delete cascade,
 title text not null,
 content jsonb not null,
 created_at timestamptz not null default now()
);
create index note_versions_note_created_idx on public.note_versions(note_id, created_at desc);
alter table public.notes enable row level security;
alter table public.note_versions enable row level security;
grant select, insert, update, delete on public.notes to anon;
grant select, insert on public.note_versions to anon;
create policy "MVP shared notes read" on public.notes for select to anon using (true);
create policy "MVP shared notes insert" on public.notes for insert to anon with check (true);
create policy "MVP shared notes update" on public.notes for update to anon using (true) with check (true);
create policy "MVP shared notes delete" on public.notes for delete to anon using (true);
create policy "MVP shared history read" on public.note_versions for select to anon using (true);
create policy "MVP shared history insert" on public.note_versions for insert to anon with check (true);
create function public.lemma_snapshot_note() returns trigger language plpgsql set search_path = '' as $$
begin
 if (old.title, old.content) is distinct from (new.title, new.content) then
  if not exists (select 1 from public.note_versions where note_id = old.id and created_at > now() - interval '2 minutes') then
   insert into public.note_versions(note_id,title,content) values(old.id,old.title,old.content);
  end if;
 end if;
 new.updated_at = now();
 return new;
end;
$$;
create trigger lemma_note_update before update on public.notes for each row execute function public.lemma_snapshot_note();
