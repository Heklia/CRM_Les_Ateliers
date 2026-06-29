-- Migration 023 - creation atomique d'un prospect avec plusieurs contacts.

alter table public.contacts
  add column if not exists notes text;

create or replace function public.create_prospect_with_contacts(
  prospect_payload jsonb,
  contacts_payload jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_prospect_id uuid;
  contact_payload jsonb;
  contact_index integer := 0;
begin
  if jsonb_typeof(contacts_payload) <> 'array'
     or jsonb_array_length(contacts_payload) = 0 then
    raise exception 'Au moins un contact est obligatoire';
  end if;

  insert into public.prospects (
    commercial_id,
    segment_id,
    company_name,
    sub_segment,
    address_line1,
    city,
    postal_code,
    website,
    estimated_potential,
    project_timeline,
    capacity_fit,
    recurrence_potential,
    need_maturity,
    notes,
    source,
    status
  )
  values (
    (prospect_payload ->> 'commercial_id')::uuid,
    (prospect_payload ->> 'segment_id')::uuid,
    prospect_payload ->> 'company_name',
    nullif(prospect_payload ->> 'sub_segment', ''),
    nullif(prospect_payload ->> 'address_line1', ''),
    nullif(prospect_payload ->> 'city', ''),
    nullif(prospect_payload ->> 'postal_code', ''),
    nullif(prospect_payload ->> 'website', ''),
    nullif(prospect_payload ->> 'estimated_potential', '')::numeric,
    coalesce(nullif(prospect_payload ->> 'project_timeline', ''), 'inconnu'),
    nullif(prospect_payload ->> 'capacity_fit', '')::smallint,
    nullif(prospect_payload ->> 'recurrence_potential', '')::smallint,
    nullif(prospect_payload ->> 'need_maturity', '')::smallint,
    nullif(prospect_payload ->> 'notes', ''),
    coalesce(nullif(prospect_payload ->> 'source', ''), 'terrain'),
    coalesce(nullif(prospect_payload ->> 'status', ''), 'nouveau')
  )
  returning id into new_prospect_id;

  for contact_payload in
    select value from jsonb_array_elements(contacts_payload)
  loop
    insert into public.contacts (
      prospect_id,
      commercial_id,
      first_name,
      last_name,
      job_title,
      phone,
      email,
      notes,
      is_primary
    )
    values (
      new_prospect_id,
      (contact_payload ->> 'commercial_id')::uuid,
      nullif(contact_payload ->> 'first_name', ''),
      nullif(contact_payload ->> 'last_name', ''),
      nullif(contact_payload ->> 'job_title', ''),
      nullif(contact_payload ->> 'phone', ''),
      nullif(contact_payload ->> 'email', ''),
      nullif(contact_payload ->> 'notes', ''),
      contact_index = 0
    );

    contact_index := contact_index + 1;
  end loop;

  return new_prospect_id;
end;
$$;

revoke all on function public.create_prospect_with_contacts(jsonb, jsonb) from public;
grant execute on function public.create_prospect_with_contacts(jsonb, jsonb) to authenticated;
