-- Migration 027 - les utilisateurs "modification" peuvent realiser leurs actions.
-- Les lecteurs restent en lecture seule et les admins peuvent realiser toute action.

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

  if not (
    public.is_admin()
    or (
      public.current_app_role() = 'modification'
      and thread_row.owner_user_id = auth.uid()
    )
  ) then
    raise exception 'Action non autorisee pour cet utilisateur';
  end if;

  if thread_row.current_status <> 'active' then
    raise exception 'Cette action est deja finalisee';
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
