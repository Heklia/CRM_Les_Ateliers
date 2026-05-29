alter table public.prospects
  add column if not exists pipeline_stage text not null default 'prospect_identifie';

alter table public.opportunites
  drop constraint if exists opportunites_stage_check;

update public.prospects
set pipeline_stage = case status
  when 'nouveau' then 'prospect_identifie'
  when 'a_qualifier' then 'prospect_identifie'
  when 'contacte' then 'contact_etabli'
  when 'qualifie' then 'opportunite_detectee'
  when 'en_cours' then 'devis_a_faire'
  when 'client' then 'gagne'
  when 'perdu' then 'perdu'
  else 'prospect_identifie'
end
where pipeline_stage = 'prospect_identifie';

update public.opportunites
set stage = case stage
  when 'identification' then 'prospect_identifie'
  when 'qualification' then 'opportunite_detectee'
  when 'proposition' then 'devis_envoye'
  when 'negociation' then 'devis_a_faire'
  else stage
end;

alter table public.prospects
  drop constraint if exists prospects_pipeline_stage_check;

alter table public.prospects
  add constraint prospects_pipeline_stage_check
  check (pipeline_stage in (
    'prospect_identifie',
    'contact_etabli',
    'rdv_realise',
    'opportunite_detectee',
    'devis_a_faire',
    'devis_envoye',
    'gagne',
    'perdu'
  ));

alter table public.opportunites
  alter column stage set default 'prospect_identifie';

alter table public.opportunites
  add constraint opportunites_stage_check
  check (stage in (
    'prospect_identifie',
    'contact_etabli',
    'rdv_realise',
    'opportunite_detectee',
    'devis_a_faire',
    'devis_envoye',
    'gagne',
    'perdu'
  ));

create index if not exists prospects_pipeline_stage_idx
  on public.prospects (pipeline_stage);
