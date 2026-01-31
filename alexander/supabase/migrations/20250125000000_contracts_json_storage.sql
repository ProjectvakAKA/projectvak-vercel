-- Contract JSON storage (replaces Dropbox TARGET for JSON files).
-- CSV log stays in Dropbox; only extracted contract JSON is stored here.

create table if not exists public.contracts (
  name text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allow service role and anon to read/write (no auth required for this app).
alter table public.contracts enable row level security;

drop policy if exists "contracts_select_all" on public.contracts;
create policy "contracts_select_all"
  on public.contracts for select
  using (true);

drop policy if exists "contracts_insert_all" on public.contracts;
create policy "contracts_insert_all"
  on public.contracts for insert
  with check (true);

drop policy if exists "contracts_update_all" on public.contracts;
create policy "contracts_update_all"
  on public.contracts for update
  using (true);

drop policy if exists "contracts_delete_all" on public.contracts;
create policy "contracts_delete_all"
  on public.contracts for delete
  using (true);

-- Optional: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contracts_updated_at on public.contracts;
create trigger contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

comment on table public.contracts is 'Extracted contract JSON (replaces Dropbox TARGET JSON storage). name = filename e.g. data_Kerkstraat_10_20250125_123456.json';
