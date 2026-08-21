-- ============================================================
-- Fioxify - schema libreria condivisa (brani, album, playlist)
-- Da eseguire nell'SQL Editor del progetto Supabase.
-- Rieseguibile senza errori (usa "if not exists" / "drop ... if exists").
--
-- MODELLO: la libreria è condivisa tra tutti gli utenti registrati.
-- Ogni brano/album/playlist è visibile a tutti finché il proprietario
-- non lo rende privato (is_private = true), nel qual caso resta
-- visibile solo a lui. Solo il proprietario può modificare o
-- eliminare i propri contenuti: nessuno può toccare quelli altrui.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- PROFILES: anagrafica minima per mostrare "caricato da / creato da"
-- (auth.users non è interrogabile direttamente dal client)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- crea automaticamente il profilo ad ogni nuova registrazione
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill: crea il profilo anche per gli utenti già registrati prima
-- che esistesse questa tabella
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

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

-- NOTA: play_count/last_played_at/is_favorite qui sotto sono superati dalle
-- tabelle track_favorites/track_plays più in basso (servono "mi piace" e
-- cronologia PER UTENTE, non condivisi su tutta la libreria). Le colonne
-- restano per compatibilità ma l'app non le legge più direttamente.
alter table public.tracks add column if not exists play_count integer not null default 0;
alter table public.tracks add column if not exists last_played_at timestamptz;

-- Libreria condivisa: privacy + traccia dell'ultima modifica
alter table public.tracks add column if not exists is_private boolean not null default false;
alter table public.tracks add column if not exists updated_at timestamptz;

-- durata del brano in secondi (interi), letta dal file audio al momento del
-- caricamento; resta null per i brani caricati prima di questa colonna
alter table public.tracks add column if not exists duration integer;

drop policy if exists "tracks_select_own" on public.tracks;
drop policy if exists "tracks_select_visible" on public.tracks;
create policy "tracks_select_visible" on public.tracks
  for select using (auth.uid() = user_id or is_private = false);

drop policy if exists "tracks_insert_own" on public.tracks;
create policy "tracks_insert_own" on public.tracks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tracks_update_own" on public.tracks;
create policy "tracks_update_own" on public.tracks
  for update using (auth.uid() = user_id);

drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_delete_own" on public.tracks
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- TRACK_FAVORITES: "mi piace" personale (non condiviso)
-- ------------------------------------------------------------
create table if not exists public.track_favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  track_id    uuid not null references public.tracks(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.track_favorites enable row level security;

drop policy if exists "track_favorites_own" on public.track_favorites;
create policy "track_favorites_own" on public.track_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- backfill: chi aveva già il vecchio "is_favorite" sul proprio brano
-- lo ritrova qui come preferito personale
insert into public.track_favorites (user_id, track_id)
select user_id, id from public.tracks where is_favorite = true
on conflict do nothing;

-- ------------------------------------------------------------
-- TRACK_PLAYS: cronologia e conteggio ascolti, PER UTENTE
-- ------------------------------------------------------------
create table if not exists public.track_plays (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  track_id    uuid not null references public.tracks(id) on delete cascade,
  played_at   timestamptz not null default now()
);

alter table public.track_plays enable row level security;

drop policy if exists "track_plays_own" on public.track_plays;
create policy "track_plays_own" on public.track_plays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists track_plays_user_track_idx on public.track_plays (user_id, track_id);

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
alter table public.playlists add column if not exists is_private boolean not null default false;

drop policy if exists "playlists_all_own" on public.playlists;

drop policy if exists "playlists_select_visible" on public.playlists;
create policy "playlists_select_visible" on public.playlists
  for select using (auth.uid() = user_id or is_private = false);

drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own" on public.playlists
  for insert with check (auth.uid() = user_id);

drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own" on public.playlists
  for update using (auth.uid() = user_id);

drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own" on public.playlists
  for delete using (auth.uid() = user_id);

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

drop policy if exists "playlist_tracks_select_visible" on public.playlist_tracks;
create policy "playlist_tracks_select_visible" on public.playlist_tracks
  for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.user_id = auth.uid() or p.is_private = false)
    )
  );

drop policy if exists "playlist_tracks_insert_own" on public.playlist_tracks;
create policy "playlist_tracks_insert_own" on public.playlist_tracks
  for insert with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

drop policy if exists "playlist_tracks_update_own" on public.playlist_tracks;
create policy "playlist_tracks_update_own" on public.playlist_tracks
  for update using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

drop policy if exists "playlist_tracks_delete_own" on public.playlist_tracks;
create policy "playlist_tracks_delete_own" on public.playlist_tracks
  for delete using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- ALBUMS (stessa struttura delle playlist: entità propria, con
-- un creatore e la possibilità di renderla privata)
-- ------------------------------------------------------------
create table if not exists public.albums (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  is_private  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.albums enable row level security;

drop policy if exists "albums_select_visible" on public.albums;
create policy "albums_select_visible" on public.albums
  for select using (auth.uid() = user_id or is_private = false);

drop policy if exists "albums_insert_own" on public.albums;
create policy "albums_insert_own" on public.albums
  for insert with check (auth.uid() = user_id);

drop policy if exists "albums_update_own" on public.albums;
create policy "albums_update_own" on public.albums
  for update using (auth.uid() = user_id);

drop policy if exists "albums_delete_own" on public.albums;
create policy "albums_delete_own" on public.albums
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- ALBUM_TRACKS: join table brani <-> album
-- ------------------------------------------------------------
create table if not exists public.album_tracks (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.albums(id) on delete cascade,
  track_id    uuid not null references public.tracks(id) on delete cascade,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (album_id, track_id)
);

alter table public.album_tracks enable row level security;

drop policy if exists "album_tracks_select_visible" on public.album_tracks;
create policy "album_tracks_select_visible" on public.album_tracks
  for select using (
    exists (
      select 1 from public.albums a
      where a.id = album_id and (a.user_id = auth.uid() or a.is_private = false)
    )
  );

drop policy if exists "album_tracks_insert_own" on public.album_tracks;
create policy "album_tracks_insert_own" on public.album_tracks
  for insert with check (
    exists (select 1 from public.albums a where a.id = album_id and a.user_id = auth.uid())
  );

drop policy if exists "album_tracks_update_own" on public.album_tracks;
create policy "album_tracks_update_own" on public.album_tracks
  for update using (
    exists (select 1 from public.albums a where a.id = album_id and a.user_id = auth.uid())
  );

drop policy if exists "album_tracks_delete_own" on public.album_tracks;
create policy "album_tracks_delete_own" on public.album_tracks
  for delete using (
    exists (select 1 from public.albums a where a.id = album_id and a.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- STORAGE: permessi sul bucket Fioxisongs (cartella = user id)
-- Il proprietario gestisce sempre i propri file; in più, chiunque
-- può ASCOLTARE (select) l'audio di un brano pubblico di un altro
-- utente, altrimenti la libreria condivisa non potrebbe riprodurlo.
-- ------------------------------------------------------------
drop policy if exists "fioxisongs_select_own" on storage.objects;
drop policy if exists "fioxisongs_select_visible" on storage.objects;
create policy "fioxisongs_select_visible" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'Fioxisongs' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.tracks t
        where t.storage_path = storage.objects.name and t.is_private = false
      )
    )
  );

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

-- ------------------------------------------------------------
-- REALTIME: la libreria condivisa si aggiorna da sola quando un
-- altro utente carica un brano, crea/modifica una playlist o un
-- album (senza bisogno di ricaricare la pagina).
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['tracks', 'playlists', 'playlist_tracks', 'albums', 'album_tracks']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
