-- Migration 011 - niveaux d'acces : lecteur, modification, admin.
-- lecteur : lecture seule sur ses donnees.
-- modification : lecture + creation/modification/suppression sur ses donnees.
-- admin : acces complet.

alter table public.users
  drop constraint if exists users_role_check;

update public.users
set role = case role
  when 'manager' then 'admin'
  when 'commercial' then 'modification'
  when 'admin' then 'admin'
  when 'lecteur' then 'lecteur'
  when 'modification' then 'modification'
  else 'lecteur'
end;

alter table public.users
  alter column role set default 'modification';

alter table public.users
  add constraint users_role_check
  check (role in ('lecteur', 'modification', 'admin'));

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'
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
      or public.current_app_role() = 'admin'
    )
$$;

create or replace function public.can_modify_commercial(target_commercial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.current_app_role() = 'admin'
      or (
        public.current_app_role() = 'modification'
        and target_commercial_id = auth.uid()
      )
    )
$$;

drop policy if exists users_select_by_role on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_by_role on public.users;
drop policy if exists users_delete_admin on public.users;

create policy users_select_by_role
on public.users
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy users_insert_self
on public.users
for insert
to authenticated
with check ((id = auth.uid() and role in ('lecteur', 'modification')) or public.is_admin());

create policy users_update_by_role
on public.users
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy users_delete_admin
on public.users
for delete
to authenticated
using (public.is_admin());

drop policy if exists prospects_insert_by_role on public.prospects;
drop policy if exists prospects_update_by_role on public.prospects;
drop policy if exists prospects_delete_by_role on public.prospects;

create policy prospects_insert_by_role
on public.prospects
for insert
to authenticated
with check (public.can_modify_commercial(commercial_id));

create policy prospects_update_by_role
on public.prospects
for update
to authenticated
using (public.can_modify_commercial(commercial_id))
with check (public.can_modify_commercial(commercial_id));

create policy prospects_delete_by_role
on public.prospects
for delete
to authenticated
using (public.can_modify_commercial(commercial_id));

drop policy if exists contacts_insert_by_role on public.contacts;
drop policy if exists contacts_update_by_role on public.contacts;
drop policy if exists contacts_delete_by_role on public.contacts;

create policy contacts_insert_by_role
on public.contacts
for insert
to authenticated
with check (public.can_modify_commercial(commercial_id));

create policy contacts_update_by_role
on public.contacts
for update
to authenticated
using (public.can_modify_commercial(commercial_id))
with check (public.can_modify_commercial(commercial_id));

create policy contacts_delete_by_role
on public.contacts
for delete
to authenticated
using (public.can_modify_commercial(commercial_id));

drop policy if exists visites_insert_by_role on public.visites;
drop policy if exists visites_update_by_role on public.visites;
drop policy if exists visites_delete_by_role on public.visites;

create policy visites_insert_by_role
on public.visites
for insert
to authenticated
with check (public.can_modify_commercial(commercial_id));

create policy visites_update_by_role
on public.visites
for update
to authenticated
using (public.can_modify_commercial(commercial_id))
with check (public.can_modify_commercial(commercial_id));

create policy visites_delete_by_role
on public.visites
for delete
to authenticated
using (public.can_modify_commercial(commercial_id));

drop policy if exists opportunites_insert_by_role on public.opportunites;
drop policy if exists opportunites_update_by_role on public.opportunites;
drop policy if exists opportunites_delete_by_role on public.opportunites;

create policy opportunites_insert_by_role
on public.opportunites
for insert
to authenticated
with check (public.can_modify_commercial(commercial_id));

create policy opportunites_update_by_role
on public.opportunites
for update
to authenticated
using (public.can_modify_commercial(commercial_id))
with check (public.can_modify_commercial(commercial_id));

create policy opportunites_delete_by_role
on public.opportunites
for delete
to authenticated
using (public.can_modify_commercial(commercial_id));

drop policy if exists actions_suivantes_insert_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_update_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_delete_by_role on public.actions_suivantes;

create policy actions_suivantes_insert_by_role
on public.actions_suivantes
for insert
to authenticated
with check (public.can_modify_commercial(commercial_id));

create policy actions_suivantes_update_by_role
on public.actions_suivantes
for update
to authenticated
using (public.can_modify_commercial(commercial_id))
with check (public.can_modify_commercial(commercial_id));

create policy actions_suivantes_delete_by_role
on public.actions_suivantes
for delete
to authenticated
using (public.can_modify_commercial(commercial_id));

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
      and public.can_access_commercial(p.commercial_id)
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
      and public.can_modify_commercial(p.commercial_id)
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
      and public.can_modify_commercial(p.commercial_id)
  )
)
with check (
  exists (
    select 1 from public.prospects p
    where p.id = prospect_segments.prospect_id
      and public.can_modify_commercial(p.commercial_id)
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
      and public.can_modify_commercial(p.commercial_id)
  )
);
