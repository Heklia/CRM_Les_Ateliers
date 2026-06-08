-- Migration 015 - images rattachees aux fiches prospects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prospect-images',
  'prospect-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.prospect_images (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  commercial_id uuid not null references public.users(id) on delete restrict,
  created_by uuid not null references public.users(id) on delete restrict,
  bucket_id text not null default 'prospect-images',
  storage_path text not null,
  file_name text not null,
  original_file_name text,
  content_type text not null,
  file_size integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prospect_images_bucket_check
    check (bucket_id = 'prospect-images'),
  constraint prospect_images_content_type_check
    check (content_type like 'image/%'),
  constraint prospect_images_file_size_check
    check (file_size > 0 and file_size <= 10485760),
  constraint prospect_images_storage_path_unique
    unique (bucket_id, storage_path)
);

create index if not exists prospect_images_prospect_id_idx
  on public.prospect_images (prospect_id);

create index if not exists prospect_images_created_at_idx
  on public.prospect_images (created_at desc);

drop trigger if exists set_prospect_images_updated_at on public.prospect_images;
create trigger set_prospect_images_updated_at
before update on public.prospect_images
for each row execute function public.set_updated_at();

alter table public.prospect_images enable row level security;

drop policy if exists prospect_images_select_by_role on public.prospect_images;
drop policy if exists prospect_images_insert_by_role on public.prospect_images;
drop policy if exists prospect_images_update_by_role on public.prospect_images;
drop policy if exists prospect_images_delete_by_role on public.prospect_images;

create policy prospect_images_select_by_role
on public.prospect_images
for select
using (public.can_access_prospect(prospect_id, commercial_id));

create policy prospect_images_insert_by_role
on public.prospect_images
for insert
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy prospect_images_update_by_role
on public.prospect_images
for update
using (public.can_modify_prospect(prospect_id, commercial_id))
with check (public.can_modify_prospect(prospect_id, commercial_id));

create policy prospect_images_delete_by_role
on public.prospect_images
for delete
using (public.can_modify_prospect(prospect_id, commercial_id));

drop policy if exists prospect_images_storage_select_by_role on storage.objects;
drop policy if exists prospect_images_storage_insert_by_role on storage.objects;
drop policy if exists prospect_images_storage_update_by_role on storage.objects;
drop policy if exists prospect_images_storage_delete_by_role on storage.objects;

create policy prospect_images_storage_select_by_role
on storage.objects
for select
using (
  bucket_id = 'prospect-images'
  and exists (
    select 1
    from public.prospects p
    where p.id = ((storage.foldername(name))[1])::uuid
      and public.can_access_prospect(p.id, p.commercial_id)
  )
);

create policy prospect_images_storage_insert_by_role
on storage.objects
for insert
with check (
  bucket_id = 'prospect-images'
  and exists (
    select 1
    from public.prospects p
    where p.id = ((storage.foldername(name))[1])::uuid
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
);

create policy prospect_images_storage_update_by_role
on storage.objects
for update
using (
  bucket_id = 'prospect-images'
  and exists (
    select 1
    from public.prospects p
    where p.id = ((storage.foldername(name))[1])::uuid
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
)
with check (
  bucket_id = 'prospect-images'
  and exists (
    select 1
    from public.prospects p
    where p.id = ((storage.foldername(name))[1])::uuid
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
);

create policy prospect_images_storage_delete_by_role
on storage.objects
for delete
using (
  bucket_id = 'prospect-images'
  and exists (
    select 1
    from public.prospects p
    where p.id = ((storage.foldername(name))[1])::uuid
      and public.can_modify_prospect(p.id, p.commercial_id)
  )
);
