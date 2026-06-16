-- Migration 017 - fiches actions commerciales actives et historique.

create table if not exists public.commercial_action_threads (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  current_action_type text not null,
  current_due_date timestamptz not null,
  current_priority text not null default 'normale',
  current_status text not null default 'active',
  prospect_status text not null default 'a_qualifier',
  current_comment text,
  last_completed_action_at timestamptz,
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint commercial_action_threads_action_type_check
    check (current_action_type in ('appel', 'email', 'visite_terrain', 'salon', 'devis', 'autre')),
  constraint commercial_action_threads_priority_check
    check (current_priority in ('basse', 'normale', 'haute')),
  constraint commercial_action_threads_status_check
    check (current_status in ('active', 'closed_won', 'closed_lost', 'archived')),
  constraint commercial_action_threads_prospect_status_check
    check (prospect_status in (
      'a_qualifier',
      'interesse',
      'projet_identifie',
      'devis_a_faire',
      'devis_envoye',
      'relance_a_faire',
      'commande_gagnee',
      'perdu',
      'sans_suite_temporaire'
    ))
);

create unique index if not exists commercial_action_threads_one_active_contact_idx
  on public.commercial_action_threads (prospect_id, contact_id)
  where current_status = 'active' and contact_id is not null;

create unique index if not exists commercial_action_threads_one_active_no_contact_idx
  on public.commercial_action_threads (prospect_id)
  where current_status = 'active' and contact_id is null;

create index if not exists commercial_action_threads_owner_idx
  on public.commercial_action_threads (owner_user_id);

create index if not exists commercial_action_threads_due_date_idx
  on public.commercial_action_threads (current_due_date);

create table if not exists public.commercial_action_events (
  id uuid primary key default gen_random_uuid(),
  action_thread_id uuid not null references public.commercial_action_threads(id) on delete cascade,
  completed_at timestamptz not null,
  action_type text not null,
  result text,
  report text,
  prospect_status_after_action text not null,
  next_action_type text,
  next_due_date timestamptz,
  priority_after_action text,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint commercial_action_events_action_type_check
    check (action_type in ('appel', 'email', 'visite_terrain', 'salon', 'devis', 'autre')),
  constraint commercial_action_events_next_action_type_check
    check (next_action_type is null or next_action_type in ('appel', 'email', 'visite_terrain', 'salon', 'devis', 'autre')),
  constraint commercial_action_events_priority_check
    check (priority_after_action is null or priority_after_action in ('basse', 'normale', 'haute')),
  constraint commercial_action_events_prospect_status_check
    check (prospect_status_after_action in (
      'a_qualifier',
      'interesse',
      'projet_identifie',
      'devis_a_faire',
      'devis_envoye',
      'relance_a_faire',
      'commande_gagnee',
      'perdu',
      'sans_suite_temporaire'
    ))
);

create index if not exists commercial_action_events_thread_idx
  on public.commercial_action_events (action_thread_id, completed_at desc);

drop trigger if exists set_commercial_action_threads_updated_at on public.commercial_action_threads;
create trigger set_commercial_action_threads_updated_at
before update on public.commercial_action_threads
for each row execute function public.set_updated_at();

alter table public.commercial_action_threads enable row level security;
alter table public.commercial_action_events enable row level security;

drop policy if exists commercial_action_threads_select_by_role on public.commercial_action_threads;
drop policy if exists commercial_action_threads_insert_by_role on public.commercial_action_threads;
drop policy if exists commercial_action_threads_update_by_role on public.commercial_action_threads;
drop policy if exists commercial_action_threads_delete_by_role on public.commercial_action_threads;

create policy commercial_action_threads_select_by_role
on public.commercial_action_threads
for select
using (public.can_access_prospect(prospect_id, owner_user_id));

create policy commercial_action_threads_insert_by_role
on public.commercial_action_threads
for insert
with check (public.can_modify_prospect(prospect_id, owner_user_id));

create policy commercial_action_threads_update_by_role
on public.commercial_action_threads
for update
using (public.can_modify_prospect(prospect_id, owner_user_id))
with check (public.can_modify_prospect(prospect_id, owner_user_id));

create policy commercial_action_threads_delete_by_role
on public.commercial_action_threads
for delete
using (public.can_modify_prospect(prospect_id, owner_user_id));

drop policy if exists commercial_action_events_select_by_role on public.commercial_action_events;
drop policy if exists commercial_action_events_insert_by_role on public.commercial_action_events;
drop policy if exists commercial_action_events_update_by_role on public.commercial_action_events;
drop policy if exists commercial_action_events_delete_by_role on public.commercial_action_events;

create policy commercial_action_events_select_by_role
on public.commercial_action_events
for select
using (
  exists (
    select 1
    from public.commercial_action_threads t
    where t.id = commercial_action_events.action_thread_id
      and public.can_access_prospect(t.prospect_id, t.owner_user_id)
  )
);

create policy commercial_action_events_insert_by_role
on public.commercial_action_events
for insert
with check (
  exists (
    select 1
    from public.commercial_action_threads t
    where t.id = commercial_action_events.action_thread_id
      and public.can_modify_prospect(t.prospect_id, t.owner_user_id)
  )
);

create policy commercial_action_events_update_by_role
on public.commercial_action_events
for update
using (
  exists (
    select 1
    from public.commercial_action_threads t
    where t.id = commercial_action_events.action_thread_id
      and public.can_modify_prospect(t.prospect_id, t.owner_user_id)
  )
)
with check (
  exists (
    select 1
    from public.commercial_action_threads t
    where t.id = commercial_action_events.action_thread_id
      and public.can_modify_prospect(t.prospect_id, t.owner_user_id)
  )
);

create policy commercial_action_events_delete_by_role
on public.commercial_action_events
for delete
using (
  exists (
    select 1
    from public.commercial_action_threads t
    where t.id = commercial_action_events.action_thread_id
      and public.can_modify_prospect(t.prospect_id, t.owner_user_id)
  )
);

create or replace function public.map_prospect_status_to_commercial_action_status(source_status text)
returns text
language sql
immutable
as $$
  select case source_status
    when 'qualifie' then 'interesse'
    when 'client' then 'commande_gagnee'
    when 'perdu' then 'perdu'
    when 'en_cours' then 'relance_a_faire'
    else 'a_qualifier'
  end
$$;

create or replace function public.complete_commercial_action_thread(
  target_thread_id uuid,
  completed_at_value timestamptz,
  action_type_value text,
  result_value text,
  report_value text,
  prospect_status_after_action_value text,
  next_action_type_value text,
  next_due_date_value timestamptz,
  priority_after_action_value text,
  comment_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_row public.commercial_action_threads%rowtype;
  new_event_id uuid;
begin
  select *
  into thread_row
  from public.commercial_action_threads
  where id = target_thread_id
  for update;

  if not found then
    raise exception 'Fiche action introuvable';
  end if;

  if not public.can_modify_prospect(thread_row.prospect_id, thread_row.owner_user_id) then
    raise exception 'Action non autorisee';
  end if;

  insert into public.commercial_action_events (
    action_thread_id,
    completed_at,
    action_type,
    result,
    report,
    prospect_status_after_action,
    next_action_type,
    next_due_date,
    priority_after_action,
    created_by_user_id
  )
  values (
    target_thread_id,
    completed_at_value,
    action_type_value,
    result_value,
    report_value,
    prospect_status_after_action_value,
    next_action_type_value,
    next_due_date_value,
    priority_after_action_value,
    auth.uid()
  )
  returning id into new_event_id;

  if prospect_status_after_action_value = 'perdu' then
    update public.commercial_action_threads
    set
      current_status = 'closed_lost',
      prospect_status = 'perdu',
      last_completed_action_at = completed_at_value,
      closed_at = completed_at_value,
      closed_reason = coalesce(result_value, 'Perdu apres action'),
      current_comment = comment_value
    where id = target_thread_id;
  elsif prospect_status_after_action_value = 'commande_gagnee' then
    update public.commercial_action_threads
    set
      current_status = 'closed_won',
      prospect_status = 'commande_gagnee',
      last_completed_action_at = completed_at_value,
      closed_at = completed_at_value,
      closed_reason = coalesce(result_value, 'Commande gagnee'),
      current_comment = comment_value
    where id = target_thread_id;
  else
    if next_action_type_value is null or next_due_date_value is null then
      raise exception 'Prochaine action et echeance obligatoires';
    end if;

    update public.commercial_action_threads
    set
      current_action_type = next_action_type_value,
      current_due_date = next_due_date_value,
      current_priority = coalesce(priority_after_action_value, current_priority),
      current_status = 'active',
      prospect_status = prospect_status_after_action_value,
      current_comment = comment_value,
      last_completed_action_at = completed_at_value,
      closed_at = null,
      closed_reason = null
    where id = target_thread_id;
  end if;

  update public.prospects
  set status = case prospect_status_after_action_value
    when 'perdu' then 'perdu'
    when 'commande_gagnee' then 'client'
    when 'a_qualifier' then 'en_cours'
    else 'qualifie'
  end
  where id = thread_row.prospect_id;

  return new_event_id;
end;
$$;

insert into public.commercial_action_threads (
  prospect_id,
  contact_id,
  owner_user_id,
  current_action_type,
  current_due_date,
  current_priority,
  current_status,
  prospect_status,
  current_comment,
  last_completed_action_at,
  closed_at,
  closed_reason,
  created_at,
  updated_at
)
select distinct on (a.prospect_id, v.contact_id)
  a.prospect_id,
  v.contact_id,
  a.commercial_id,
  case
    when a.type in ('appel', 'email', 'salon', 'devis', 'autre') then a.type
    when a.type = 'visite' then 'visite_terrain'
    else 'autre'
  end,
  a.due_at,
  case when a.priority in ('basse', 'normale', 'haute') then a.priority else 'normale' end,
  case when p.status = 'perdu' then 'closed_lost' else 'active' end,
  public.map_prospect_status_to_commercial_action_status(p.status),
  a.description,
  null,
  case when p.status = 'perdu' then coalesce(a.completed_at, a.updated_at) else null end,
  case when p.status = 'perdu' then 'Perdu avant migration' else null end,
  a.created_at,
  a.updated_at
from public.actions_suivantes a
join public.prospects p on p.id = a.prospect_id
left join public.visites v on v.id = a.visite_id
where a.status = 'a_faire'
order by a.prospect_id, v.contact_id, a.due_at desc
on conflict do nothing;

insert into public.commercial_action_threads (
  prospect_id,
  contact_id,
  owner_user_id,
  current_action_type,
  current_due_date,
  current_priority,
  current_status,
  prospect_status,
  current_comment,
  last_completed_action_at,
  closed_at,
  closed_reason,
  created_at,
  updated_at
)
select distinct on (v.prospect_id, v.contact_id)
  v.prospect_id,
  v.contact_id,
  v.commercial_id,
  case
    when v.prochaine_etape in ('appel', 'email', 'visite_terrain', 'salon', 'devis', 'autre') then v.prochaine_etape
    else 'appel'
  end,
  coalesce(v.prochaine_relance_at, v.visite_date + interval '7 days'),
  case when v.niveau_interet >= 4 then 'haute' else 'normale' end,
  case when p.status = 'perdu' then 'closed_lost' else 'archived' end,
  public.map_prospect_status_to_commercial_action_status(p.status),
  v.commentaire,
  v.visite_date,
  case when p.status = 'perdu' then v.visite_date else null end,
  case when p.status = 'perdu' then 'Perdu avant migration' else null end,
  v.created_at,
  v.updated_at
from public.visites v
join public.prospects p on p.id = v.prospect_id
where not exists (
  select 1
  from public.commercial_action_threads t
  where t.prospect_id = v.prospect_id
    and coalesce(t.contact_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(v.contact_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
order by v.prospect_id, v.contact_id, v.visite_date desc
on conflict do nothing;

insert into public.commercial_action_events (
  action_thread_id,
  completed_at,
  action_type,
  result,
  report,
  prospect_status_after_action,
  next_action_type,
  next_due_date,
  priority_after_action,
  created_by_user_id,
  created_at
)
select
  t.id,
  v.visite_date,
  case
    when v.type in ('appel', 'email', 'visite_terrain', 'salon', 'devis', 'autre') then v.type
    else 'autre'
  end,
  v.besoins,
  coalesce(v.commentaire, v.resume),
  public.map_prospect_status_to_commercial_action_status(p.status),
  case
    when v.prochaine_etape in ('appel', 'email', 'visite_terrain', 'salon', 'devis', 'autre') then v.prochaine_etape
    else null
  end,
  v.prochaine_relance_at,
  case when v.niveau_interet >= 4 then 'haute' else 'normale' end,
  v.commercial_id,
  v.created_at
from public.visites v
join public.prospects p on p.id = v.prospect_id
join public.commercial_action_threads t
  on t.prospect_id = v.prospect_id
  and coalesce(t.contact_id, '00000000-0000-0000-0000-000000000000'::uuid)
    = coalesce(v.contact_id, '00000000-0000-0000-0000-000000000000'::uuid)
where not exists (
  select 1
  from public.commercial_action_events e
  where e.action_thread_id = t.id
    and e.completed_at = v.visite_date
    and e.action_type = v.type
);
