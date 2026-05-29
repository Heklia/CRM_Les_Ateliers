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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'
$$;

alter table public.users enable row level security;
alter table public.segments enable row level security;
alter table public.prospects enable row level security;
alter table public.contacts enable row level security;
alter table public.visites enable row level security;
alter table public.opportunites enable row level security;
alter table public.actions_suivantes enable row level security;

drop policy if exists users_select_by_role on public.users;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_by_role on public.users;
drop policy if exists users_delete_admin on public.users;

create policy users_select_by_role
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() in ('admin', 'manager')
);

create policy users_insert_self
on public.users
for insert
to authenticated
with check (
  (id = auth.uid() and role = 'commercial')
  or public.is_admin()
);

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

drop policy if exists segments_select_authenticated on public.segments;
drop policy if exists segments_mutate_admin on public.segments;

create policy segments_select_authenticated
on public.segments
for select
to authenticated
using (true);

create policy segments_mutate_admin
on public.segments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists prospects_select_by_role on public.prospects;
drop policy if exists prospects_insert_by_role on public.prospects;
drop policy if exists prospects_update_by_role on public.prospects;
drop policy if exists prospects_delete_by_role on public.prospects;

create policy prospects_select_by_role
on public.prospects
for select
to authenticated
using (public.can_access_commercial(commercial_id));

create policy prospects_insert_by_role
on public.prospects
for insert
to authenticated
with check (public.can_access_commercial(commercial_id));

create policy prospects_update_by_role
on public.prospects
for update
to authenticated
using (public.can_access_commercial(commercial_id))
with check (public.can_access_commercial(commercial_id));

create policy prospects_delete_by_role
on public.prospects
for delete
to authenticated
using (public.can_access_commercial(commercial_id));

drop policy if exists contacts_select_by_role on public.contacts;
drop policy if exists contacts_insert_by_role on public.contacts;
drop policy if exists contacts_update_by_role on public.contacts;
drop policy if exists contacts_delete_by_role on public.contacts;

create policy contacts_select_by_role
on public.contacts
for select
to authenticated
using (public.can_access_commercial(commercial_id));

create policy contacts_insert_by_role
on public.contacts
for insert
to authenticated
with check (public.can_access_commercial(commercial_id));

create policy contacts_update_by_role
on public.contacts
for update
to authenticated
using (public.can_access_commercial(commercial_id))
with check (public.can_access_commercial(commercial_id));

create policy contacts_delete_by_role
on public.contacts
for delete
to authenticated
using (public.can_access_commercial(commercial_id));

drop policy if exists visites_select_by_role on public.visites;
drop policy if exists visites_insert_by_role on public.visites;
drop policy if exists visites_update_by_role on public.visites;
drop policy if exists visites_delete_by_role on public.visites;

create policy visites_select_by_role
on public.visites
for select
to authenticated
using (public.can_access_commercial(commercial_id));

create policy visites_insert_by_role
on public.visites
for insert
to authenticated
with check (public.can_access_commercial(commercial_id));

create policy visites_update_by_role
on public.visites
for update
to authenticated
using (public.can_access_commercial(commercial_id))
with check (public.can_access_commercial(commercial_id));

create policy visites_delete_by_role
on public.visites
for delete
to authenticated
using (public.can_access_commercial(commercial_id));

drop policy if exists opportunites_select_by_role on public.opportunites;
drop policy if exists opportunites_insert_by_role on public.opportunites;
drop policy if exists opportunites_update_by_role on public.opportunites;
drop policy if exists opportunites_delete_by_role on public.opportunites;

create policy opportunites_select_by_role
on public.opportunites
for select
to authenticated
using (public.can_access_commercial(commercial_id));

create policy opportunites_insert_by_role
on public.opportunites
for insert
to authenticated
with check (public.can_access_commercial(commercial_id));

create policy opportunites_update_by_role
on public.opportunites
for update
to authenticated
using (public.can_access_commercial(commercial_id))
with check (public.can_access_commercial(commercial_id));

create policy opportunites_delete_by_role
on public.opportunites
for delete
to authenticated
using (public.can_access_commercial(commercial_id));

drop policy if exists actions_suivantes_select_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_insert_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_update_by_role on public.actions_suivantes;
drop policy if exists actions_suivantes_delete_by_role on public.actions_suivantes;

create policy actions_suivantes_select_by_role
on public.actions_suivantes
for select
to authenticated
using (public.can_access_commercial(commercial_id));

create policy actions_suivantes_insert_by_role
on public.actions_suivantes
for insert
to authenticated
with check (public.can_access_commercial(commercial_id));

create policy actions_suivantes_update_by_role
on public.actions_suivantes
for update
to authenticated
using (public.can_access_commercial(commercial_id))
with check (public.can_access_commercial(commercial_id));

create policy actions_suivantes_delete_by_role
on public.actions_suivantes
for delete
to authenticated
using (public.can_access_commercial(commercial_id));
