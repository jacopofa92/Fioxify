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

-- SELECT: ognuno vede solo la propria riga (la policy "profiles_select_admin",
-- che dà agli admin visibilità su tutte le righe per il pannello Admin, è
-- creata più in basso insieme alla funzione is_admin_user() da cui dipende).
-- L'attribuzione "caricato da" nella libreria condivisa NON legge questa
-- tabella direttamente: usa la funzione list_profile_emails() più in basso,
-- che espone solo id+email a chi è autenticato, senza status/is_admin.
drop policy if exists "profiles_select_all" on public.profiles;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

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

-- ============================================================
-- APPROVAZIONE ADMIN: la registrazione è self-service, ma un
-- nuovo account resta "pending" (nessun accesso alla libreria)
-- finché un admin non lo approva dal pannello Admin dell'app.
-- ============================================================

alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ------------------------------------------------------------
-- Helper functions (security definer: bypassano la RLS di profiles
-- per evitare ricorsioni nelle policy che le usano)
-- ------------------------------------------------------------
create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

create or replace function public.is_approved()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select status = 'approved' or is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_admin_user(uuid) from anon;
revoke execute on function public.is_approved() from anon;

-- ------------------------------------------------------------
-- Trigger: impedisce a un utente normale di auto-approvarsi o
-- auto-promuoversi admin modificando il proprio profilo
-- ------------------------------------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    if new.status is distinct from old.status or new.is_admin is distinct from old.is_admin then
      raise exception 'Non puoi modificare lo stato di approvazione o i permessi admin del tuo profilo.';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_privileged_columns() from public;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- policy che permette agli admin di aggiornare qualsiasi profilo (per approvare/rifiutare)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (true);

-- policy che permette agli admin di leggere tutte le righe di profiles
-- (serve al pannello Admin per elencare le richieste di registrazione)
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select to authenticated
  using (public.is_admin_user(auth.uid()));

-- funzione che espone solo id+email (mai status/is_admin) a chiunque sia
-- autenticato: usata dalla libreria condivisa per l'attribuzione
-- "caricato da", senza dover concedere la lettura diretta della tabella
create or replace function public.list_profile_emails()
returns table (id uuid, email text)
language sql
security definer
set search_path = public
stable
as $$
  select id, email from public.profiles;
$$;

revoke execute on function public.list_profile_emails() from anon;
grant execute on function public.list_profile_emails() to authenticated;

revoke execute on function public.handle_new_user() from public;

-- ------------------------------------------------------------
-- Gate di scrittura: un utente non ancora approvato non può
-- caricare brani, creare playlist/album, anche bypassando la UI
-- ------------------------------------------------------------
drop policy if exists "tracks_insert_own" on public.tracks;
create policy "tracks_insert_own" on public.tracks
  for insert with check (auth.uid() = user_id and public.is_approved());

drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own" on public.playlists
  for insert with check (auth.uid() = user_id and public.is_approved());

drop policy if exists "albums_insert_own" on public.albums;
create policy "albums_insert_own" on public.albums
  for insert with check (auth.uid() = user_id and public.is_approved());

drop policy if exists "playlist_tracks_insert_own" on public.playlist_tracks;
create policy "playlist_tracks_insert_own" on public.playlist_tracks
  for insert with check (
    public.is_approved()
    and exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

drop policy if exists "album_tracks_insert_own" on public.album_tracks;
create policy "album_tracks_insert_own" on public.album_tracks
  for insert with check (
    public.is_approved()
    and exists (select 1 from public.albums a where a.id = album_id and a.user_id = auth.uid())
  );

drop policy if exists "track_favorites_own" on public.track_favorites;
create policy "track_favorites_own" on public.track_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id and public.is_approved());

drop policy if exists "track_plays_own" on public.track_plays;
create policy "track_plays_own" on public.track_plays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id and public.is_approved());

drop policy if exists "fioxisongs_insert_own" on storage.objects;
create policy "fioxisongs_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'Fioxisongs' and (storage.foldername(name))[1] = auth.uid()::text and public.is_approved());

-- ------------------------------------------------------------
-- Permette al form di registrazione (utente non ancora autenticato) di
-- sapere se un'email è già registrata, senza esporre l'intera tabella
-- profiles ad anon: restituisce solo lo status ('pending'/'approved'/
-- 'rejected') o null se l'email è libera.
-- ------------------------------------------------------------
create or replace function public.check_registration_email(check_email text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select status from public.profiles where lower(email) = lower(check_email) limit 1;
$$;

grant execute on function public.check_registration_email(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Per promuovere un account ad admin (accesso al pannello Admin
-- e approvazione automatica), esegui manualmente nell'SQL Editor:
--   update public.profiles set is_admin = true, status = 'approved'
--   where email = 'la-tua-email@esempio.it';
-- ------------------------------------------------------------

-- ============================================================
-- SINCRONIZZAZIONE tracks <-> storage.objects (bucket Fioxisongs)
-- L'eliminazione di un brano dall'app cancella sia il file audio
-- sia la riga tracks (vedi deleteTrack in app.js). Questo trigger
-- copre anche la cancellazione fatta a mano dal dashboard Supabase
-- (Storage): se un file audio sparisce dal bucket, la riga tracks
-- corrispondente viene rimossa in automatico, invece di restare un
-- brano "fantasma" visibile in libreria ma non riproducibile.
--
-- Manca volutamente la direzione opposta (cancellare una riga
-- tracks -> cancellare il file dal bucket): storage.objects ha una
-- protezione nativa di Supabase (trigger storage.protect_delete)
-- che blocca qualunque DELETE diretto via SQL su quella tabella,
-- proprio per evitare cancellazioni di file che bypassano la
-- Storage API. Un trigger lato tracks che provi a fare quel DELETE
-- fallirebbe sempre con errore 42501, e farebbe fallire anche la
-- cancellazione della riga tracks stessa (stessa transazione).
-- Chi cancella una riga tracks direttamente da SQL/Table editor
-- deve quindi anche rimuovere a mano il file corrispondente dallo
-- Storage (o passare sempre dall'app, che lo fa già in automatico
-- tramite la Storage API in deleteTrack()).
-- ============================================================

create or replace function public.sync_track_delete_from_storage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.bucket_id = 'Fioxisongs' then
    delete from public.tracks where storage_path = old.name;
  end if;
  return old;
end;
$$;

drop trigger if exists sync_track_delete_from_storage on storage.objects;
create trigger sync_track_delete_from_storage
  after delete on storage.objects
  for each row execute function public.sync_track_delete_from_storage();

-- ============================================================
-- REAZIONI RAPIDE: emoji che chiunque può lasciare su un brano
-- visibile (proprio o pubblico di un altro utente). Un utente può
-- lasciare al massimo una reazione per emoji su un brano (constraint
-- unique), toggle gestito lato client con insert/delete.
-- ============================================================
create table if not exists public.track_reactions (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid not null references public.tracks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (track_id, user_id, emoji)
);

alter table public.track_reactions drop constraint if exists track_reactions_emoji_check;
alter table public.track_reactions add constraint track_reactions_emoji_check
  check (emoji in ('🔥', '❤️', '😂', '👏', '🤯'));

alter table public.track_reactions enable row level security;

drop policy if exists "track_reactions_select_visible" on public.track_reactions;
create policy "track_reactions_select_visible" on public.track_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.tracks t
      where t.id = track_reactions.track_id
        and (t.user_id = auth.uid() or t.is_private = false)
    )
  );

drop policy if exists "track_reactions_insert_own" on public.track_reactions;
create policy "track_reactions_insert_own" on public.track_reactions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_approved()
    and exists (
      select 1 from public.tracks t
      where t.id = track_reactions.track_id
        and (t.user_id = auth.uid() or t.is_private = false)
    )
  );

drop policy if exists "track_reactions_delete_own" on public.track_reactions;
create policy "track_reactions_delete_own" on public.track_reactions
  for delete to authenticated
  using (auth.uid() = user_id);

-- realtime per le reazioni: la tabella esiste solo da qui in poi nello
-- script, quindi va aggiunta alla pubblicazione qui e non nel blocco
-- realtime più in alto (che gira prima che track_reactions esista)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'track_reactions'
  ) then
    alter publication supabase_realtime add table public.track_reactions;
  end if;
end $$;

-- ============================================================
-- DASHBOARD STATISTICHE (solo admin): track_plays ha RLS che
-- limita la select alle proprie righe, quindi per aggregare i dati
-- di ascolto di TUTTI gli utenti serve una funzione security definer
-- che verifichi lei stessa il ruolo admin invece di affidarsi alla RLS.
-- ============================================================
create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Non autorizzato.';
  end if;

  select jsonb_build_object(
    'total_tracks', (select count(*) from public.tracks),
    'total_plays', (select count(*) from public.track_plays),
    'total_users', (select count(*) from public.profiles),
    'top_tracks', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select t.id, t.title, t.artist, count(p.id) as play_count
        from public.tracks t
        join public.track_plays p on p.track_id = t.id
        group by t.id, t.title, t.artist
        order by play_count desc, t.title asc
        limit 10
      ) x
    ),
    'top_uploaders', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select pr.email, count(t.id) as track_count
        from public.tracks t
        join public.profiles pr on pr.id = t.user_id
        group by pr.email
        order by track_count desc, pr.email asc
        limit 10
      ) x
    ),
    'plays_last_30_days', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select to_char(date_trunc('day', played_at), 'YYYY-MM-DD') as day, count(*) as plays
        from public.track_plays
        where played_at > now() - interval '30 days'
        group by 1
        order by 1
      ) x
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.admin_get_stats() from anon;
grant execute on function public.admin_get_stats() to authenticated;
