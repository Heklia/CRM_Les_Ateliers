-- Migration 013 - rendre visibles les co-affectations aux utilisateurs autorises.

drop policy if exists prospect_assignments_select_by_role on public.prospect_assignments;

create policy prospect_assignments_select_by_role
on public.prospect_assignments
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1
    from public.prospects p
    where p.id = prospect_assignments.prospect_id
      and public.can_access_prospect(p.id, p.commercial_id)
  )
);

drop policy if exists visite_assignments_select_by_role on public.visite_assignments;

create policy visite_assignments_select_by_role
on public.visite_assignments
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1
    from public.visites v
    where v.id = visite_assignments.visite_id
      and public.can_access_visite(v.id, v.prospect_id, v.commercial_id)
  )
);
