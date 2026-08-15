-- ============================================================
-- Fioxify - schema catalogo brani, preferiti e playlist
-- Da eseguire UNA VOLTA nell'SQL Editor del progetto Supabase.
-- Rieseguibile senza errori (usa "if not exists" / "drop ... if exists").
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- TRACKS: catalogo dei brani caricati (sostituisce i file .json)
-- ------------------------------------------------------------
create table if not exists public.tracks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  artist        text,
  album         text,
  cover         text,                 -- data URI base64 della cover, o null
  storage_path  text not null,        -- path del file audio nel bucket Fioxisongs
  tags          text[] not null default '{}',
  is_favorite   boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.tracks enable row level security;

drop policy if exists "tracks_select_own" on public.tracks;
create policy "tracks_select_own" on public.tracks
  for select using (auth.uid() = user_id);

drop policy if exists "tracks_insert_own" on public.tracks;
create policy "tracks_insert_own" on public.tracks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tracks_update_own" on public.tracks;
create policy "tracks_update_own" on public.tracks
  for update using (auth.uid() = user_id);

drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_delete_own" on public.tracks
  for delete using (auth.uid() = user_id);

-- Cronologia / "più ascoltati"
alter table public.tracks add column if not exists play_count integer not null default 0;
alter table public.tracks add column if not exists last_played_at timestamptz;

-- ------------------------------------------------------------
-- PLAYLISTS
-- ------------------------------------------------------------
create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

alter table public.playlists enable row level security;

drop policy if exists "playlists_all_own" on public.playlists;
create policy "playlists_all_own" on public.playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- PLAYLIST_TRACKS: join table brani <-> playlist
-- ------------------------------------------------------------
create table if not exists public.playlist_tracks (
  id           uuid primary key default gen_random_uuid(),
  playlist_id  uuid not null references public.playlists(id) on delete cascade,
  track_id     uuid not null references public.tracks(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (playlist_id, track_id)
);

-- posizione manuale (riordino via drag & drop)
alter table public.playlist_tracks add column if not exists position integer not null default 0;

alter table public.playlist_tracks enable row level security;

drop policy if exists "playlist_tracks_all_own" on public.playlist_tracks;
create policy "playlist_tracks_all_own" on public.playlist_tracks
  for all using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- STORAGE: permessi sul bucket Fioxisongs (cartella = user id)
-- Necessari anche per poter ELIMINARE un brano dallo storage.
-- ------------------------------------------------------------
drop policy if exists "fioxisongs_select_own" on storage.objects;
create policy "fioxisongs_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'Fioxisongs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fioxisongs_insert_own" on storage.objects;
create policy "fioxisongs_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'Fioxisongs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fioxisongs_update_own" on storage.objects;
create policy "fioxisongs_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'Fioxisongs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fioxisongs_delete_own" on storage.objects;
create policy "fioxisongs_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'Fioxisongs' and (storage.foldername(name))[1] = auth.uid()::text);
