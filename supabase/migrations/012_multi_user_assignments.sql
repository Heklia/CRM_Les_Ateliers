-- Migration 012 - affectations multiples des prospects et actions.
-- Le champ commercial_id reste le proprietaire principal pour compatibilite.

create table if not exists public.prospect_assignments (
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (prospect_id, user_id)
);

create table if not exists public.visite_assignments (
  visite_id uuid not null references public.visites(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (visite_id, user_id)
);

create index if not exists prospect_assignments_user_id_idx
  on public.prospect_assignments (user_id);

create index if not exists visite_assignments_user_id_idx
  on public.visite_assignments (user_id);

drop trigger if exists set_prospect_assignments_updated_at on public.prospect_assignments;
create trigger set_prospect_assignments_updated_at
before update on public.prospect_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_visite_assignments_updated_at on public.visite_assignments;
create trigger set_visite_assignments_updated_at
before update on public.visite_assignments
for each row execute function public.set_updated_at();

insert into public.prospect_assignments (prospect_id, user_id, assigned_by)
select id, commercial_id, commercial_id
from public.prospects
on conflict (prospect_id, user_id) do nothing;

insert into public.visite_assignments (visite_id, user_id, assigned_by)
select id, commercial_id, commercial_id
from public.visites
on conflict (visite_id, user_id) do nothing;

create or replace function public.is_assigned_to_prospect(target_prospect_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prospect_assignments pa
    where pa.prospect_id = target_prospect_id
      and pa.user_id = auth.uid()
  )
$$;

create or replace function public.is_assigned_to_visite(target_visite_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.visite_assignments va
    where va.visite_id = target_visite_id
      and va.user_id = auth.uid()
  )
$$;

create or replace function public.can_access_prospect(target_prospect_id uuid, target_commercial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.is_admin()
      or target_commercial_id = auth.uid()
      or public.is_assigned_to_prospect(target_prospect_id)
    )
$$;

create or replace function public.can_modify_prospect(target_prospect_id uuid, target_commercial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.is_admin()
      or (
        public.current_app_role() = 'modification'
        and (
          target_commercial_id = auth.uid()
          or public.is_assigned_to_prospect(target_prospect_id)
        )
      )
    )
$$;

create or replace function public.can_access_visite(target_visite_id uuid, target_prospect_id uuid, target_commercial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.is_admin()
      or target_commercial_id = auth.uid()
      or public.is_assigned_to_visite(target_visite_id)
      or public.is_assigned_to_prospect(target_prospect_id)
    )
$$;

create or replace function public.can_modify_visite(target_visite_id uuid, target_prospect_id uuid, target_commercial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.is_admin()
      or (
        public.current_app_role() = 'modification'
        and (
          target_commercial_id = auth.uid()
          or public.is_assigned_to_visite(target_visite_id)
          or public.is_assigned_to_prospect(target_prospect_id)
        )
      )
    )
$$;

drop policy if exists users_select_by_role on public.users;
create policy users_select_by_role
on public.users
for select
to authenticated
using (true);

alter table public.prospect_assignments enable row level security;
alter table public.visite_assignments enable row level security;

drop policy if exists prospect_assignments_select_by_role on public.prospect_assignments;
drop policy if exists prospect_assignments_insert_admin on public.prospect_assignments;
drop policy if exists prospect_assignments_update_admin on public.prospect_assignments;
drop policy if exists prospect_assignments_delete_admin on public.prospect_assignments;

create policy prospect_assignments_select_by_role
on public.prospect_assignments
for select
to authenticated
using (public.is_admin() or user_id = auth.uid());

create policy prospect_assignments_insert_admin
on public.prospect_assignments
for insert
to authenticated
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1 from public.prospects p
      where p.id = prospect_assignments.prospect_id
        and public.can_modify_prospect(p.id, p.commercial_id)
    )
  )
);

create policy prospect_assignments_update_admin
on public.prospect_assignments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy prospect_assignments_delete_admin
on public.prospect_assignments
for delete
to authenticated
using (public.is_admin());

drop policy if exists visite_assignments_select_by_role on public.visite_assignments;
drop policy if exists visite_assignments_insert_admin on public.visite_assignments;
drop policy if exists visite_assignments_update_admin on public.visite_assignments;
drop policy if exists visite_assignments_delete_admin on public.visite_assignments;

create policy visite_assignments_select_by_role
on public.visite_assignments
for select
to authenticated
using (public.is_admin() or user_id = auth.uid());

create policy visite_assignments_insert_admin
on public.visite_assignments
for insert
to authenticated
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1 from public.visites v
      where v.id = visite_assignments.visite_id
        and public.can_modify_visite(v.id, v.prospect_id, v.commercial_id)
    )
  )
);

create policy visite_assignments_update_admin
on public.visite_assignments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy visite_assignments_delete_admin
on public.visite_assignments
for delete
to authenticated
using (public.is_admin());

drop policy if exists prospects_select_by_role on public.prospects;
drop policy if exists prospects_update_by_role on public.prospects;
drop policy if exists prospects_delete_by_role on public.prospects;

create policy prospects_select_by_role
on public.prospects
for select
to authenticated
using (public.can_access_prospect(id, commercial_id));

create policy prospects_update_by_role
on public.prospects
for update
to authenticated
using (public.can_modify_prospect(id, commercial_id))
with check (public.can_modify_prospect(id, commercial_id));

create policy prospects_delete_by_role
on public.prospects
for delete
to authenticated
using (public.can_modify_prospect(id, commercial_id));

drop policy if exists contacts_select_by_role on public.contacts;
drop policy if exists contacts_insert_by_role on public.contacts;
drop policy if exists contacts_update_by_role on public.contacts;
drop policy if exists contacts_delete_by_role on public.contacts;

create policy contacts_select_by_role
on public.contacts
for select
to authenticated
using (public.can_access_prospect(prospect_id, commercial_id));

create policy contacts_insert_by_role
on public.contacts
for insert
to authenticated
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy contacts_update_by_role
on public.contacts
for update
to authenticated
using (public.can_modify_prospect(prospect_id, commercial_id))
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy contacts_delete_by_role
on public.contacts
for delete
to authenticated
using (public.can_modify_prospect(prospect_id, commercial_id));

drop policy if exists visites_select_by_role on public.visites;
drop policy if exists visites_insert_by_role on public.visites;
drop policy if exists visites_update_by_role on public.visites;
drop policy if exists visites_delete_by_role on public.visites;

create policy visites_select_by_role
on public.visites
for select
to authenticated
using (public.can_access_visite(id, prospect_id, commercial_id));

create policy visites_insert_by_role
on public.visites
for insert
to authenticated
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy visites_update_by_role
on public.visites
for update
to authenticated
using (public.can_modify_visite(id, prospect_id, commercial_id))
with check (public.can_modify_visite(id, prospect_id, commercial_id));

create policy visites_delete_by_role
on public.visites
for delete
to authenticated
using (public.can_modify_visite(id, prospect_id, commercial_id));

drop policy if exists opportunites_select_by_role on public.opportunites;
drop policy if exists opportunites_insert_by_role on public.opportunites;
drop policy if exists opportunites_update_by_role on public.opportunites;
drop policy if exists opportunites_delete_by_role on public.opportunites;

create policy opportunites_select_by_role
on public.opportunites
for select
to authenticated
using (public.can_access_prospect(prospect_id, commercial_id));

create policy opportunites_insert_by_role
on public.opportunites
for insert
to authenticated
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy opportunites_update_by_role
on public.opportunites
for update
to authenticated
using (public.can_modify_prospect(prospect_id, commercial_id))
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy opportunites_delete_by_role
on public.opportunites
for delete
to authenticated
using (public.can_modify_prospect(prospect_id, commercial_id));

drop policy if exists actions_suivantes_select_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_insert_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_update_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_delete_by_role on public.actions_suivantes;

create policy actions_suivantes_select_by_role
on public.actions_suivantes
for select
to authenticated
using (public.can_access_prospect(prospect_id, commercial_id));

create policy actions_suivantes_insert_by_role
on public.actions_suivantes
for insert
to authenticated
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy actions_suivantes_update_by_role
on public.actions_suivantes
for update
to authenticated
using (public.can_modify_prospect(prospect_id, commercial_id))
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy actions_suivantes_delete_by_role
on public.actions_suivantes
for delete
to authenticated
using (public.can_modify_prospect(prospect_id, commercial_id));

drop policy if exists prospect_segments_select_by_role on public.prospect_segments;
drop policy if exists prospect_segments_insert_by_role on public.prospect_segments;
drop policy if exists prospect_segments_update_by_role on public.prospect_segments;
drop policy if exists prospect_segments_delete_by_role on public.prospect_segments;

create policy prospect_segments_select_by_role
on public.prospect_segments
for select
to authenticated
using (
  exists (
    select 1 from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_access_prospect(p.id, p.commercial_id)
  )
);

create policy prospect_segments_insert_by_role
on public.prospect_segments
for insert
to authenticated
with check (
  exists (
    select 1 from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
);

create policy prospect_segments_update_by_role
on public.prospect_segments
for update
to authenticated
using (
  exists (
    select 1 from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
)
with check (
  exists (
    select 1 from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
);

create policy prospect_segments_delete_by_role
on public.prospect_segments
for delete
to authenticated
using (
  exists (
    select 1 from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
);
