-- Migration 025 - lecture de toutes les actions partagees pour les utilisateurs authentifies.
-- Les droits de creation et modification restent reserves aux administrateurs.

drop policy if exists commercial_action_threads_select_by_role
  on public.commercial_action_threads;

create policy commercial_action_threads_select_by_role
on public.commercial_action_threads
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists commercial_action_events_select_by_role
  on public.commercial_action_events;

create policy commercial_action_events_select_by_role
on public.commercial_action_events
for select
to authenticated
using (auth.uid() is not null);

create or replace view public.shared_commercial_action_threads
with (security_barrier = true)
as
select
  thread.id,
  thread.prospect_id,
  thread.contact_id,
  thread.owner_user_id,
  thread.current_action_type,
  thread.current_due_date,
  thread.current_priority,
  thread.current_status,
  thread.prospect_status,
  thread.current_comment,
  thread.last_completed_action_at,
  thread.closed_at,
  thread.closed_reason,
  prospect.segment_id,
  prospect.company_name,
  prospect.sub_segment,
  prospect.address_line1,
  prospect.postal_code,
  prospect.city,
  prospect.website,
  prospect.status as crm_status,
  prospect.notes as prospect_notes,
  contact.first_name as contact_first_name,
  contact.last_name as contact_last_name,
  contact.job_title as contact_job_title,
  contact.phone as contact_phone,
  contact.email as contact_email,
  owner.full_name as owner_name,
  coalesce(
    array(
      select segment.code
      from public.prospect_segments prospect_segment
      join public.segments segment on segment.id = prospect_segment.segment_id
      where prospect_segment.prospect_id = prospect.id
      order by segment.name
    ),
    array[]::text[]
  ) as segment_codes
from public.commercial_action_threads thread
join public.prospects prospect on prospect.id = thread.prospect_id
left join public.contacts contact on contact.id = thread.contact_id
left join public.users owner on owner.id = thread.owner_user_id;

revoke all on public.shared_commercial_action_threads from public;
grant select on public.shared_commercial_action_threads to authenticated;
