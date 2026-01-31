-- Kantoren en profielen voor login + admin-overzicht
-- Eén kantoor voor nu; later meer. Geen kantoor_id op contracts nog.

-- Kantoren
create table if not exists public.kantoren (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- Eerste kantoor (nu maar één)
insert into public.kantoren (naam, slug)
values ('Hoofdkantoor', 'hoofdkantoor')
on conflict (slug) do nothing;

-- Profielen: koppel auth.users aan rol + optioneel kantoor
create table if not exists public.profielen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'kantoor')),
  kantoor_id uuid references public.kantoren(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- RLS kantoren: alle ingelogde gebruikers mogen lezen (admin ziet overzicht, kantoor ziet later eigen data)
alter table public.kantoren enable row level security;

drop policy if exists "kantoren_select_authenticated" on public.kantoren;
create policy "kantoren_select_authenticated"
  on public.kantoren for select
  to authenticated
  using (true);

-- Alleen service role mag kantoren beheren (of later admin-only policy)
drop policy if exists "kantoren_all_service" on public.kantoren;
create policy "kantoren_all_service"
  on public.kantoren for all
  to service_role
  using (true)
  with check (true);

-- RLS profielen: gebruiker mag alleen eigen profiel lezen
alter table public.profielen enable row level security;

drop policy if exists "profielen_select_own" on public.profielen;
create policy "profielen_select_own"
  on public.profielen for select
  to authenticated
  using (auth.uid() = user_id);

-- Service role mag profielen aanmaken/updaten (app doet dit na signup of via dashboard)
drop policy if exists "profielen_all_service" on public.profielen;
create policy "profielen_all_service"
  on public.profielen for all
  to service_role
  using (true)
  with check (true);

-- Trigger: updated_at bijwerken
create or replace function public.set_profielen_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profielen_updated_at on public.profielen;
create trigger profielen_updated_at
  before update on public.profielen
  for each row execute function public.set_profielen_updated_at();
