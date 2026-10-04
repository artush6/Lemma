-- A note is a course/document; its pages are separate, independently addressable
-- editor documents stored in an ordered JSON array for atomic autosaves.
alter table public.notes
 add column pages jsonb not null default '[]'::jsonb;
alter table public.note_versions
 add column pages jsonb not null default '[]'::jsonb;

update public.notes
set pages = jsonb_build_array(
 jsonb_build_object(
  'id', gen_random_uuid()::text,
  'title', 'Page 1',
  'content', content,
  'position', 0,
  'updated_at', updated_at
 )
)
where jsonb_array_length(pages) = 0;

create or replace function public.lemma_snapshot_note() returns trigger
language plpgsql set search_path = '' as $$
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
