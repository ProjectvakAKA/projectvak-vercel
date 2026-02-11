-- Geëxtraheerde tekst per document voor full-text zoeken (Plan Stap 7 + Zoekfeature).
-- Pipeline schrijft hier na tekstextractie (tekstlaag of OCR); zoeken gebeurt in Supabase, niet in Dropbox.
--
-- Waarom migreren? Zonder deze tabel bestaat document_texts niet. De code schrijft na elk
-- georganiseerd/geanalyseerd document de full_text naar Supabase; zonder tabel krijg je
-- een fout (404 / table does not exist). Eén keer uitvoeren op je Supabase-project is voldoende.

create table if not exists public.document_texts (
  id uuid primary key default gen_random_uuid(),
  dropbox_path text not null,
  name text not null,
  full_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(dropbox_path, name)
);

comment on table public.document_texts is 'Geëxtraheerde tekst per document (tekstlaag of OCR) voor full-text zoeken. dropbox_path = volledig pad in Dropbox.';

alter table public.document_texts enable row level security;

drop policy if exists "document_texts_select_all" on public.document_texts;
create policy "document_texts_select_all" on public.document_texts for select using (true);

drop policy if exists "document_texts_insert_all" on public.document_texts;
create policy "document_texts_insert_all" on public.document_texts for insert with check (true);

drop policy if exists "document_texts_update_all" on public.document_texts;
create policy "document_texts_update_all" on public.document_texts for update using (true);

drop policy if exists "document_texts_delete_all" on public.document_texts;
create policy "document_texts_delete_all" on public.document_texts for delete using (true);

-- Full-text search: tsvector kolom (optioneel, voor snellere zoekqueries)
alter table public.document_texts add column if not exists full_text_tsv tsvector
  generated always as (to_tsvector('dutch', coalesce(full_text, ''))) stored;

create index if not exists document_texts_full_text_tsv_idx on public.document_texts using gin(full_text_tsv);

-- updated_at trigger
drop trigger if exists document_texts_updated_at on public.document_texts;
create trigger document_texts_updated_at
  before update on public.document_texts
  for each row execute function public.set_updated_at();
