create extension if not exists "pgcrypto";

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
  );
$$;

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;

create policy "orgs_select_for_members"
on public.orgs
for select
using (public.is_org_member(id));

create policy "orgs_insert_for_authenticated"
on public.orgs
for insert
with check (auth.uid() is not null);

create policy "org_members_select_for_members"
on public.org_members
for select
using (public.is_org_member(org_id));

create policy "org_members_insert_self"
on public.org_members
for insert
with check (user_id = auth.uid());

create table if not exists public.dropbox_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dropbox_watched_folders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  path text not null,
  dropbox_id text,
  cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  document_type text not null default 'epc',
  dropbox_file_id text not null,
  path text not null,
  name text not null,
  rev text,
  content_hash text,
  mime_type text,
  size bigint,
  modified_at timestamptz,
  status text not null default 'ingested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, dropbox_file_id)
);

alter table public.dropbox_connections enable row level security;
alter table public.dropbox_watched_folders enable row level security;
alter table public.documents enable row level security;

create policy "dropbox_connections_select_for_members"
on public.dropbox_connections
for select
using (public.is_org_member(org_id));

create policy "dropbox_connections_insert_for_members"
on public.dropbox_connections
for insert
with check (public.is_org_member(org_id));

create policy "dropbox_connections_update_for_members"
on public.dropbox_connections
for update
using (public.is_org_member(org_id));

create policy "dropbox_folders_select_for_members"
on public.dropbox_watched_folders
for select
using (public.is_org_member(org_id));

create policy "dropbox_folders_insert_for_members"
on public.dropbox_watched_folders
for insert
with check (public.is_org_member(org_id));

create policy "dropbox_folders_update_for_members"
on public.dropbox_watched_folders
for update
using (public.is_org_member(org_id));

create policy "documents_select_for_members"
on public.documents
for select
using (public.is_org_member(org_id));

create policy "documents_insert_for_members"
on public.documents
for insert
with check (public.is_org_member(org_id));

create policy "documents_update_for_members"
on public.documents
for update
using (public.is_org_member(org_id));

create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  model text not null,
  raw_json jsonb not null,
  text_hash text,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.field_values (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  field_key text not null,
  field_value text,
  confidence numeric,
  source text,
  created_at timestamptz not null default now()
);

alter table public.extractions enable row level security;
alter table public.field_values enable row level security;

create policy "extractions_select_for_members"
on public.extractions
for select
using (public.is_org_member(org_id));

create policy "extractions_insert_for_members"
on public.extractions
for insert
with check (public.is_org_member(org_id));

create policy "field_values_select_for_members"
on public.field_values
for select
using (public.is_org_member(org_id));

create policy "field_values_insert_for_members"
on public.field_values
for insert
with check (public.is_org_member(org_id));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_for_members"
on public.audit_logs
for select
using (public.is_org_member(org_id));

create policy "audit_logs_insert_for_members"
on public.audit_logs
for insert
with check (public.is_org_member(org_id));

create table if not exists public.whise_exports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  format text not null,
  payload text not null,
  created_at timestamptz not null default now()
);

alter table public.whise_exports enable row level security;

create policy "whise_exports_select_for_members"
on public.whise_exports
for select
using (public.is_org_member(org_id));

create policy "whise_exports_insert_for_members"
on public.whise_exports
for insert
with check (public.is_org_member(org_id));
