-- Migration 010 - reparation rapide des segments manquants ou invisibles.
-- A executer dans Supabase SQL Editor si l'application affiche :
-- "Segment introuvable ou non visible dans Supabase".

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

alter table public.segments enable row level security;

drop policy if exists segments_select_authenticated on public.segments;

create policy segments_select_authenticated
on public.segments
for select
to authenticated
using (true);

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

select code, name, is_active
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
order by name;
