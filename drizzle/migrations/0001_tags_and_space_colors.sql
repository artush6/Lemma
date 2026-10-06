alter table public.notes add column if not exists tags text[] not null default '{}';
alter table public.folders add column if not exists color text not null default 'blue';