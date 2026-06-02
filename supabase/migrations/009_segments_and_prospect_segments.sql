-- Migration 009 - nouveaux segments + plusieurs segments par prospect.
-- Ce fichier est volontairement autonome et idempotent : il peut etre relance
-- dans le SQL Editor Supabase si une execution precedente a echoue au milieu.

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid()
$$;

create or replace function public.can_access_commercial(target_commercial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      target_commercial_id = auth.uid()
      or public.current_app_role() in ('admin', 'manager')
    )
$$;

alter table public.segments
  drop constraint if exists segments_code_check;

insert into public.segments (code, name, description, is_active)
values
  ('bardage_decoratif', 'Bardage decoratif', null, true),
  ('autres_agencements', 'Autres agencements', null, true),
  ('structure_mobilier', 'Structure et mobilier', null, true),
  ('usinage_3d', 'Usinage 3D', null, true),
  ('co_conception', 'Co-conception', null, true),
  ('nautisme', 'Nautisme', null, true),
  ('pieces_industrielles', 'Pieces industrielles', null, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  updated_at = now();

create table if not exists public.prospect_segments (
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  segment_id uuid not null references public.segments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prospect_id, segment_id)
);

alter table public.prospect_segments enable row level security;

drop policy if exists prospect_segments_select_by_role on public.prospect_segments;
drop policy if exists prospect_segments_insert_by_role on public.prospect_segments;
drop policy if exists prospect_segments_update_by_role on public.prospect_segments;
drop policy if exists prospect_segments_delete_by_role on public.prospect_segments;

create policy prospect_segments_select_by_role
on public.prospect_segments
for select
using (
  exists (
    select 1
    from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_access_commercial(p.commercial_id)
  )
);

create policy prospect_segments_insert_by_role
on public.prospect_segments
for insert
with check (
  exists (
    select 1
    from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_access_commercial(p.commercial_id)
  )
);

create policy prospect_segments_update_by_role
on public.prospect_segments
for update
using (
  exists (
    select 1
    from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_access_commercial(p.commercial_id)
  )
)
with check (
  exists (
    select 1
    from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_access_commercial(p.commercial_id)
  )
);

create policy prospect_segments_delete_by_role
on public.prospect_segments
for delete
using (
  exists (
    select 1
    from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_access_commercial(p.commercial_id)
  )
);

create index if not exists prospect_segments_segment_id_idx
  on public.prospect_segments (segment_id);

with default_segment as (
  select id from public.segments where code = 'autres_agencements' limit 1
)
update public.prospects
set segment_id = (select id from default_segment)
where segment_id is null
   or segment_id not in (
    select id
    from public.segments
    where code in (
      'bardage_decoratif',
      'autres_agencements',
      'structure_mobilier',
      'usinage_3d',
      'co_conception',
      'nautisme',
      'pieces_industrielles'
    )
  );

with default_segment as (
  select id from public.segments where code = 'autres_agencements' limit 1
)
update public.opportunites
set segment_id = (select id from default_segment)
where segment_id is null
   or segment_id not in (
    select id
    from public.segments
    where code in (
      'bardage_decoratif',
      'autres_agencements',
      'structure_mobilier',
      'usinage_3d',
      'co_conception',
      'nautisme',
      'pieces_industrielles'
    )
  );

delete from public.prospect_segments ps
using public.segments s
where ps.segment_id = s.id
  and s.code in (
    'agencements_decoratifs',
    'structures_mobilier',
    'usinage_3d_prototypage_rotomoulage'
  );

insert into public.prospect_segments (prospect_id, segment_id)
select id, segment_id
from public.prospects
on conflict do nothing;

delete from public.segments
where code in (
  'agencements_decoratifs',
  'structures_mobilier',
  'usinage_3d_prototypage_rotomoulage'
);

alter table public.segments
  add constraint segments_code_check
  check (code in (
    'bardage_decoratif',
    'autres_agencements',
    'structure_mobilier',
    'usinage_3d',
    'co_conception',
    'nautisme',
    'pieces_industrielles'
  ));

select code, name
from public.segments
order by name;
