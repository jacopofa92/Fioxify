/* ============================================================
   CONFIG SUPABASE
============================================================ */
const SUPABASE_URL = "https://ostajdhuaxrjrwroayja.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdGFqZGh1YXhyanJ3cm9heWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTcyOTQsImV4cCI6MjA5MjE3MzI5NH0.YVzjs5VDHfGC8taGvlGxJiXb8Bh-NnZY1TjNeSTuGsY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = "Fioxisongs";
const APP_VERSION = "1.2.1";

const appVersionEl = document.getElementById("app-version");
if (appVersionEl) appVersionEl.textContent = `v${APP_VERSION}`;

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' +
      '<rect width="240" height="240" fill="#1c1f28"/>' +
      '<text x="50%" y="55%" font-size="110" text-anchor="middle" dominant-baseline="middle" fill="#3b82f6">♪</text>' +
      "</svg>"
  );

/* ============================================================
   TOAST (feedback errori / conferme, valido su tutte le pagine)
============================================================ */
function showToast(message, type = "error") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/* ============================================================
   MODALE CONFERMA ELIMINAZIONE (richiede di scrivere "elimina")
============================================================ */
function confirmDelete({ title, message, onConfirm }) {
  const overlay = document.getElementById("confirm-modal");
  if (!overlay) return;

  const titleEl = document.getElementById("confirm-modal-title");
  const messageEl = document.getElementById("confirm-modal-message");
  const input = document.getElementById("confirm-modal-input");
  const cancelBtn = document.getElementById("confirm-modal-cancel");
  const confirmBtn = document.getElementById("confirm-modal-confirm");

  titleEl.textContent = title;
  messageEl.textContent = message;
  input.value = "";
  confirmBtn.disabled = true;
  overlay.hidden = false;
  input.focus();

  function onInput() {
    confirmBtn.disabled = input.value.trim().toLowerCase() !== "elimina";
  }

  function onConfirmClick() {
    if (confirmBtn.disabled) return;
    close();
    onConfirm();
  }

  function onOverlayClick(e) {
    if (e.target === overlay) close();
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
    if (e.key === "Enter" && !confirmBtn.disabled) onConfirmClick();
  }

  function close() {
    overlay.hidden = true;
    input.removeEventListener("input", onInput);
    confirmBtn.removeEventListener("click", onConfirmClick);
    cancelBtn.removeEventListener("click", close);
    overlay.removeEventListener("click", onOverlayClick);
    document.removeEventListener("keydown", onKeydown);
  }

  input.addEventListener("input", onInput);
  confirmBtn.addEventListener("click", onConfirmClick);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", onOverlayClick);
  document.addEventListener("keydown", onKeydown);
}

/* ============================================================
   PWA: registrazione service worker (app installabile)
============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error("SW registration failed:", err));
  });
}

/* ============================================================
   PAGE DETECTION
============================================================ */
const isAuthPage =
  window.location.pathname.endsWith("index.html") ||
  window.location.pathname === "/";
const isAppPage = window.location.pathname.endsWith("app.html");

/* ============================================================
   AUTH PAGE (se usi index.html)
============================================================ */
if (isAuthPage) {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");

  const registerEmail = document.getElementById("register-email");
  const registerPassword = document.getElementById("register-password");
  const registerBtn = document.getElementById("register-btn");
  const registerError = document.getElementById("register-error");

  tabLogin?.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.add("active");
    registerForm.classList.remove("active");
  });

  tabRegister?.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.classList.add("active");
    loginForm.classList.remove("active");
  });

  loginBtn?.addEventListener("click", async () => {
    loginError.textContent = "";
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (!email || !password) {
      loginError.textContent = "Inserisci email e password.";
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      loginError.textContent = error.message || "Errore di login.";
      return;
    }

    window.location.href = "app.html";
  });

  registerBtn?.addEventListener("click", async () => {
    registerError.textContent = "";
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    if (!email || !password) {
      registerError.textContent = "Inserisci email e password.";
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      registerError.textContent = error.message || "Errore di registrazione.";
      return;
    }

    registerError.textContent = "Account creato. Ora fai login.";
  });

  (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) window.location.href = "app.html";
  })();
}

/* ============================================================
   APP PAGE
============================================================ */
if (isAppPage) {
  const userEmailSpan = document.getElementById("user-email");
  const logoutBtn = document.getElementById("logout-btn");
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadStatus = document.getElementById("upload-status");
  const tracksList = document.getElementById("tracks-list");
  const emptyMessage = document.getElementById("empty-message");
  const audioPlayer = document.getElementById("audio-player");
  const currentTrackName = document.getElementById("current-track-name");
  const currentTrackArtist = document.getElementById("current-track-artist");
  const currentCover = document.getElementById("current-cover");

  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const playlistsPanel = document.getElementById("playlists-panel");
  const newPlaylistName = document.getElementById("new-playlist-name");
  const newPlaylistBtn = document.getElementById("new-playlist-btn");
  const playlistsList = document.getElementById("playlists-list");
  const albumsPanel = document.getElementById("albums-panel");
  const newAlbumName = document.getElementById("new-album-name");
  const newAlbumBtn = document.getElementById("new-album-btn");
  const albumsList = document.getElementById("albums-list");
  const groupsPanel = document.getElementById("groups-panel");
  const groupsList = document.getElementById("groups-list");
  const uploadDropzone = document.getElementById("upload-dropzone");

  const shuffleBtn = document.getElementById("shuffle-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const repeatBtn = document.getElementById("repeat-btn");
  const likeCurrentBtn = document.getElementById("like-current-btn");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const seekBar = document.getElementById("seek-bar");
  const currentTimeLabel = document.getElementById("current-time");
  const durationLabel = document.getElementById("duration-time");

  const miniPlayer = document.getElementById("mini-player");
  const miniCover = document.getElementById("mini-cover");
  const miniTrackName = document.getElementById("mini-track-name");
  const miniTrackArtist = document.getElementById("mini-track-artist");
  const miniPlayPauseBtn = document.getElementById("mini-play-pause-btn");
  const miniProgressFill = document.getElementById("mini-progress-fill");
  const fullPlayer = document.getElementById("full-player");
  const collapsePlayerBtn = document.getElementById("collapse-player-btn");

  /* STATE */
  let currentUser = null;
  let allTracks = [];
  let profilesById = {}; // userId -> { email }
  let playlists = [];
  let playlistTracksMap = {}; // playlistId -> [trackId, ...]
  let albums = [];
  let albumTracksMap = {}; // albumId -> [trackId, ...]
  let favoriteTrackIds = new Set(); // preferiti PERSONALI dell'utente loggato
  let userPlayStats = {}; // trackId -> { count, lastPlayedAt } PERSONALI dell'utente loggato
  let currentView = "library"; // "library" | "favorites" | "history" | "artists" | "albums" | "playlists"
  let searchTerm = "";
  let sortBy = "date"; // "date" | "title" | "artist" | "plays"

  let currentQueue = [];
  let currentIndex = -1;
  let nowPlayingId = null;
  let shuffleOn = false;
  let repeatMode = "none"; // "none" | "all" | "one"
  let expandedPlaylistId = null;
  let expandedAlbumId = null;
  let expandedGroupKey = null;

  currentCover.src = DEFAULT_COVER;

  /* TAG SYSTEM UPLOAD */
  let currentTags = [];
  const tagsContainer = document.getElementById("tags-container");
  const tagInput = document.getElementById("tag-input");

  function renderUploadTags() {
    tagsContainer.innerHTML = "";
    currentTags.forEach((tag, index) => {
      tagsContainer.appendChild(buildEditableTagChip(tag, index));
    });
  }

  function buildEditableTagChip(tag, index) {
    const el = document.createElement("div");
    el.className = "tag";
    el.appendChild(document.createTextNode(tag));
    const removeSpan = document.createElement("span");
    removeSpan.className = "tag-remove";
    removeSpan.dataset.index = index;
    removeSpan.textContent = "×";
    el.appendChild(removeSpan);
    return el;
  }

  function renderTagChips(container, tags) {
    container.innerHTML = "";
    tags.forEach((t) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      container.appendChild(span);
    });
  }

  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && tagInput.value.trim() !== "") {
      e.preventDefault();
      const newTag = tagInput.value.trim();
      if (!currentTags.includes(newTag)) {
        currentTags.push(newTag);
        renderUploadTags();
      }
      tagInput.value = "";
    }
  });

  tagsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-remove")) {
      const index = e.target.dataset.index;
      currentTags.splice(index, 1);
      renderUploadTags();
    }
  });

  /* SESSION CHECK */
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "index.html";
      return;
    }
    currentUser = data.session.user;
    userEmailSpan.textContent = currentUser.email || "Utente";
    await loadData();
  })();

  /* LOGOUT */
  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  /* ============================================================
     SLUG (nomi file leggibili nello storage)
  ============================================================ */
  function slugify(str) {
    return (
      (str || "brano")
        .toString()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-+|-+$)/g, "")
        .slice(0, 60) || "brano"
    );
  }

  /* ============================================================
     UPLOAD AUDIO + METADATA + TAGS (in DB, non più in .json)
     Supporta selezione/trascinamento di più file insieme.
  ============================================================ */
  function normalizedTitle(str) {
    return (str || "").trim().toLowerCase();
  }

  function readTags(file) {
    return new Promise((resolve) => {
      let extractedTitle = file.name.replace(/\.[^/.]+$/, "");
      let extractedArtist = "";
      let extractedAlbum = "";
      let extractedCover = null;

      jsmediatags.read(file, {
        onSuccess: (tag) => {
          if (tag.tags.title) extractedTitle = tag.tags.title;
          if (tag.tags.artist) extractedArtist = tag.tags.artist;
          if (tag.tags.album) extractedAlbum = tag.tags.album;

          if (tag.tags.picture) {
            const { data, format } = tag.tags.picture;
            let base64 = "";
            data.forEach((b) => (base64 += String.fromCharCode(b)));
            extractedCover = `data:${format};base64,${btoa(base64)}`;
          }
          resolve({ title: extractedTitle, artist: extractedArtist, album: extractedAlbum, cover: extractedCover });
        },
        onError: () => resolve({ title: extractedTitle, artist: extractedArtist, album: extractedAlbum, cover: extractedCover }),
      });
    });
  }

  function readAudioDuration(file) {
    return new Promise((resolve) => {
      const audio = document.createElement("audio");
      const url = URL.createObjectURL(file);
      audio.preload = "metadata";

      function done(duration) {
        URL.revokeObjectURL(url);
        resolve(duration);
      }

      audio.addEventListener("loadedmetadata", () => {
        done(isFinite(audio.duration) ? Math.round(audio.duration) : null);
      });
      audio.addEventListener("error", () => done(null));
      audio.src = url;
    });
  }

  async function uploadSingleFile(file, existingTitles) {
    const [{ title, artist, album, cover }, duration] = await Promise.all([
      readTags(file),
      readAudioDuration(file),
    ]);

    if (existingTitles.has(normalizedTitle(title))) {
      showToast(`"${title}" non caricato: esiste già un brano con lo stesso nome.`);
      return false;
    }

    const ext = file.name.split(".").pop();
    const fileName = `${slugify(title)}-${Date.now()}.${ext}`;
    const audioPath = `${currentUser.id}/${fileName}`;

    const { error: audioErr } = await supabase.storage.from(BUCKET_NAME).upload(audioPath, file);
    if (audioErr) {
      console.error(audioErr);
      showToast(`Errore durante il caricamento di "${file.name}".`);
      return false;
    }

    const { error: dbErr } = await supabase.from("tracks").insert({
      user_id: currentUser.id,
      title,
      artist: artist || null,
      album: album || null,
      cover,
      storage_path: audioPath,
      tags: currentTags,
      duration,
    });

    if (dbErr) {
      console.error(dbErr);
      showToast(`Errore nel salvataggio dei metadata di "${title}".`);
      return false;
    }

    existingTitles.add(normalizedTitle(title));
    return true;
  }

  async function uploadFiles(files) {
    if (!files.length) return;

    const existingTitles = new Set(allTracks.map((t) => normalizedTitle(t.title)));
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadStatus.textContent =
        files.length > 1 ? `Caricamento ${i + 1}/${files.length}: ${file.name}` : `Caricamento di "${file.name}"...`;
      const ok = await uploadSingleFile(file, existingTitles);
      if (ok) successCount++;
    }

    fileInput.value = "";
    currentTags = [];
    renderUploadTags();

    const failCount = files.length - successCount;
    if (successCount > 0) {
      uploadStatus.textContent =
        failCount > 0 ? `${successCount} caricati, ${failCount} non caricati.` : `${successCount} brano/i caricato/i!`;
      showToast(successCount === 1 ? "Brano caricato!" : `${successCount} brani caricati!`, "success");
    } else {
      uploadStatus.textContent = "Nessun brano caricato.";
    }

    await loadData();
  }

  uploadBtn?.addEventListener("click", () => {
    uploadStatus.textContent = "";
    if (!fileInput.files.length) {
      uploadStatus.textContent = "Seleziona uno o più file audio.";
      return;
    }
    uploadFiles(Array.from(fileInput.files));
  });

  /* Drag & drop, anche massivo, sull'area di upload */
  if (uploadDropzone) {
    ["dragenter", "dragover"].forEach((evt) =>
      uploadDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadDropzone.classList.add("drag-over");
      })
    );

    uploadDropzone.addEventListener("dragleave", (e) => {
      if (uploadDropzone.contains(e.relatedTarget)) return;
      uploadDropzone.classList.remove("drag-over");
    });

    uploadDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadDropzone.classList.remove("drag-over");
      const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("audio/"));
      if (!files.length) {
        showToast("Trascina solo file audio.");
        return;
      }
      uploadStatus.textContent = "";
      uploadFiles(files);
    });
  }

  /* ============================================================
     TAG EDITOR INLINE (PER UNA CANZONE)
  ============================================================ */
  function setupTagEditor(editorEl, initialTags) {
    let tags = [...(initialTags || [])];

    const container = editorEl.querySelector(".edit-tags-container");
    const input = editorEl.querySelector(".edit-tag-input");

    function render() {
      container.innerHTML = "";
      tags.forEach((tag, index) => {
        container.appendChild(buildEditableTagChip(tag, index));
      });
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim() !== "") {
        e.preventDefault();
        const newTag = input.value.trim();
        if (!tags.includes(newTag)) {
          tags.push(newTag);
          render();
        }
        input.value = "";
      }
    });

    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("tag-remove")) {
        const index = e.target.dataset.index;
        tags.splice(index, 1);
        render();
      }
    });

    render();

    return {
      getTags: () => tags,
    };
  }

  /* ============================================================
     LOAD DATA (tracks + playlists dal DB)
  ============================================================ */
  async function loadData() {
    const [
      { data: trackRows, error: trackErr },
      { data: playlistRows },
      { data: ptRows },
      { data: albumRows },
      { data: atRows },
      { data: profileRows },
      { data: favoriteRows },
      { data: playRows },
    ] = await Promise.all([
      supabase.from("tracks").select("*").order("created_at", { ascending: false }),
      supabase.from("playlists").select("*").order("created_at", { ascending: false }),
      supabase.from("playlist_tracks").select("*").order("position", { ascending: true }),
      supabase.from("albums").select("*").order("created_at", { ascending: false }),
      supabase.from("album_tracks").select("*").order("position", { ascending: true }),
      supabase.from("profiles").select("*"),
      supabase.from("track_favorites").select("track_id").eq("user_id", currentUser.id),
      supabase.from("track_plays").select("track_id, played_at").eq("user_id", currentUser.id),
    ]);

    if (trackErr) {
      console.error(trackErr);
      showToast("Errore nel caricamento della libreria.");
    }

    allTracks = trackRows || [];
    playlists = playlistRows || [];
    playlistTracksMap = {};
    (ptRows || []).forEach((row) => {
      if (!playlistTracksMap[row.playlist_id]) playlistTracksMap[row.playlist_id] = [];
      playlistTracksMap[row.playlist_id].push(row.track_id);
    });

    albums = albumRows || [];
    albumTracksMap = {};
    (atRows || []).forEach((row) => {
      if (!albumTracksMap[row.album_id]) albumTracksMap[row.album_id] = [];
      albumTracksMap[row.album_id].push(row.track_id);
    });

    profilesById = {};
    (profileRows || []).forEach((p) => {
      profilesById[p.id] = p;
    });

    favoriteTrackIds = new Set((favoriteRows || []).map((r) => r.track_id));

    userPlayStats = {};
    (playRows || []).forEach((row) => {
      const stat = userPlayStats[row.track_id] || { count: 0, lastPlayedAt: null };
      stat.count += 1;
      if (!stat.lastPlayedAt || row.played_at > stat.lastPlayedAt) stat.lastPlayedAt = row.played_at;
      userPlayStats[row.track_id] = stat;
    });

    render();
  }

  /* ============================================================
     HELPER: proprietà e attribuzione
  ============================================================ */
  function isOwner(row) {
    return !!row && row.user_id === currentUser.id;
  }

  function attributionText(row, verb) {
    const email = profilesById[row.user_id]?.email || "utente sconosciuto";
    let text = `${verb} da ${email}`;
    if (row.updated_at && row.updated_at !== row.created_at) {
      text += ` · modificato il ${formatDate(row.updated_at)}`;
    }
    return text;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  /* ============================================================
     VIEWS (Libreria / Preferiti / Playlist) + RICERCA
  ============================================================ */
  document.querySelectorAll(".view-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      render();
    });
  });

  searchInput?.addEventListener("input", () => {
    searchTerm = searchInput.value;
    render();
  });

  sortSelect?.addEventListener("change", () => {
    sortBy = sortSelect.value;
    render();
  });

  function matchesSearch(t, term) {
    if (!term) return true;
    return (
      (t.title || "").toLowerCase().includes(term) ||
      (t.artist || "").toLowerCase().includes(term) ||
      (t.album || "").toLowerCase().includes(term) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(term))
    );
  }

  function sortTracks(list) {
    const arr = list.slice();
    if (sortBy === "title") {
      arr.sort((a, b) => (a.title || "").localeCompare(b.title || "", "it"));
    } else if (sortBy === "artist") {
      arr.sort((a, b) => (a.artist || "").localeCompare(b.artist || "", "it"));
    } else if (sortBy === "plays") {
      arr.sort((a, b) => (userPlayStats[b.id]?.count || 0) - (userPlayStats[a.id]?.count || 0));
    } else if (currentView === "history") {
      arr.sort((a, b) => new Date(userPlayStats[b.id]?.lastPlayedAt) - new Date(userPlayStats[a.id]?.lastPlayedAt));
    } else {
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return arr;
  }

  function getVisibleTracks() {
    let base;
    if (currentView === "favorites") base = allTracks.filter((t) => favoriteTrackIds.has(t.id));
    else if (currentView === "history") base = allTracks.filter((t) => userPlayStats[t.id]);
    else base = allTracks;

    const term = searchTerm.trim().toLowerCase();
    if (term) base = base.filter((t) => matchesSearch(t, term));

    return sortTracks(base);
  }

  function render() {
    document.querySelectorAll(".view-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === currentView);
    });

    const isPlaylistsView = currentView === "playlists";
    const isAlbumsView = currentView === "albums";
    const isGroupedView = currentView === "artists";
    const isListView = !isPlaylistsView && !isAlbumsView && !isGroupedView;

    playlistsPanel.style.display = isPlaylistsView ? "block" : "none";
    albumsPanel.style.display = isAlbumsView ? "block" : "none";
    groupsPanel.style.display = isGroupedView ? "block" : "none";
    tracksList.style.display = isListView ? "block" : "none";
    sortSelect.style.display = isListView ? "" : "none";

    const placeholders = {
      playlists: "Cerca playlist...",
      albums: "Cerca album...",
      artists: "Cerca per artista...",
    };
    searchInput.placeholder = placeholders[currentView] || "Cerca per titolo, artista o tag...";

    if (isPlaylistsView) {
      renderPlaylists();
      return;
    }

    if (isAlbumsView) {
      renderAlbums();
      return;
    }

    if (isGroupedView) {
      renderGroupedView("artist");
      return;
    }

    const list = getVisibleTracks();
    tracksList.innerHTML = "";

    if (!list.length) {
      const messages = {
        favorites: "Nessun brano preferito.",
        history: "Non hai ancora ascoltato nessun brano.",
      };
      emptyMessage.textContent = messages[currentView] || "Nessun brano trovato.";
      emptyMessage.style.display = "block";
      return;
    }
    emptyMessage.style.display = "none";

    list.forEach((track) => {
      tracksList.appendChild(buildTrackItem(track, list));
    });
  }

  /* ============================================================
     VISTA ARTISTI / ALBUM (raggruppamento)
  ============================================================ */
  function renderGroupedView(field) {
    groupsList.innerHTML = "";

    const term = searchTerm.trim().toLowerCase();
    const groups = {};

    allTracks
      .filter((t) => matchesSearch(t, term))
      .forEach((t) => {
        const key = (t[field] && t[field].trim()) || "Sconosciuto";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

    const names = Object.keys(groups).sort((a, b) => a.localeCompare(b, "it"));

    if (!names.length) {
      emptyMessage.textContent = "Nessun brano trovato.";
      emptyMessage.style.display = "block";
      return;
    }
    emptyMessage.style.display = "none";

    names.forEach((name) => {
      const tracks = groups[name];
      const groupKey = `${field}:${name}`;

      const li = document.createElement("li");
      li.className = "playlist-item";

      const row = document.createElement("div");
      row.className = "playlist-item-row";

      const nameEl = document.createElement("span");
      nameEl.className = "playlist-name";
      nameEl.textContent = name;

      const count = document.createElement("span");
      count.className = "playlist-count";
      count.textContent = `${tracks.length} brani`;

      const actions = document.createElement("div");
      actions.className = "playlist-actions";

      const playBtn = document.createElement("button");
      playBtn.className = "icon-btn";
      playBtn.textContent = "▶";
      playBtn.title = `Riproduci tutti i brani di ${name}`;
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        play(tracks[0], tracks);
      });

      actions.appendChild(playBtn);
      row.appendChild(nameEl);
      row.appendChild(count);
      row.appendChild(actions);

      const detail = document.createElement("div");
      detail.className = "playlist-tracks";

      if (expandedGroupKey === groupKey) {
        const ul = document.createElement("ul");
        ul.className = "tracks-list";
        tracks.forEach((t) => ul.appendChild(buildTrackItem(t, tracks)));
        detail.appendChild(ul);
        detail.classList.add("open");
      }

      row.addEventListener("click", () => {
        expandedGroupKey = expandedGroupKey === groupKey ? null : groupKey;
        render();
      });

      li.appendChild(row);
      li.appendChild(detail);
      groupsList.appendChild(li);
    });
  }

  /* ============================================================
     TRACK ITEM (libreria / preferiti / dentro una playlist)
  ============================================================ */
  function buildTrackItem(track, queueList, opts = {}) {
    const li = document.createElement("li");
    li.className = "track-item" + (track.id === nowPlayingId ? " playing" : "");
    li.dataset.trackId = track.id;

    if ((opts.playlistId || opts.albumId) && opts.canEdit) {
      li.draggable = true;
      li.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        li.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", track.id);
      });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
    }

    const row = document.createElement("div");
    row.className = "track-main-row";

    const img = document.createElement("img");
    img.className = "track-cover-small";
    img.src = track.cover || DEFAULT_COVER;

    const info = document.createElement("div");
    info.className = "track-info";
    const title = document.createElement("span");
    title.className = "track-title";
    title.textContent = track.title;
    info.appendChild(title);

    const subtitle = document.createElement("span");
    subtitle.className = "track-subtitle";
    info.appendChild(subtitle);
    updateTrackSubtitle();

    function updateTrackSubtitle() {
      const meta = [track.artist, track.album].filter(Boolean).join(" — ");
      let text = meta || "Aggiungi artista e album";
      if (track.duration) text += ` · ${formatTime(track.duration)}`;
      subtitle.textContent = text;
      subtitle.classList.toggle("track-subtitle-empty", !meta);
    }

    const tagsRow = document.createElement("div");
    tagsRow.className = "track-tags-row";

    const tagsBox = document.createElement("div");
    tagsBox.className = "track-tags";
    renderTagChips(tagsBox, track.tags || []);

    const actions = document.createElement("div");
    actions.className = "track-actions";

    const likeBtn = document.createElement("button");
    const isLiked = favoriteTrackIds.has(track.id);
    likeBtn.className = "icon-btn like-btn" + (isLiked ? " liked" : "");
    likeBtn.textContent = isLiked ? "♥" : "♡";
    likeBtn.title = "Preferito";

    const addWrap = document.createElement("div");
    addWrap.className = "add-to-playlist-dropdown";
    const addBtn = document.createElement("button");
    addBtn.className = "icon-btn";
    addBtn.textContent = "+";
    addBtn.title = "Aggiungi a playlist o album";
    const menu = document.createElement("div");
    menu.className = "add-to-playlist-menu";

    const ownedPlaylists = playlists.filter((p) => isOwner(p));
    const ownedAlbums = albums.filter((a) => isOwner(a));

    function addMenuGroup(label, collection, addFn) {
      const heading = document.createElement("span");
      heading.textContent = label;
      heading.style.cssText = "display:block;padding:6px 8px 2px;color:#656d7d;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;";
      menu.appendChild(heading);

      if (!collection.length) {
        const empty = document.createElement("span");
        empty.textContent = `Nessun${label === "Album" ? "" : "a"} ${label.toLowerCase()}`;
        empty.style.cssText = "display:block;padding:2px 8px 6px;color:#9aa1b0;font-size:0.75rem;";
        menu.appendChild(empty);
        return;
      }

      collection.forEach((c) => {
        const item = document.createElement("button");
        item.textContent = c.name;
        item.addEventListener("click", async (e) => {
          e.stopPropagation();
          await addFn(track.id, c.id);
          menu.classList.remove("open");
        });
        menu.appendChild(item);
      });
    }

    addMenuGroup("Playlist", ownedPlaylists, addTrackToPlaylist);
    addMenuGroup("Album", ownedAlbums, addTrackToAlbum);

    addWrap.appendChild(addBtn);
    addWrap.appendChild(menu);

    actions.appendChild(likeBtn);
    actions.appendChild(addWrap);

    if (opts.playlistId && opts.canEdit) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "icon-btn";
      removeBtn.textContent = "✕ playlist";
      removeBtn.title = "Rimuovi dalla playlist";
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await removeTrackFromPlaylist(track.id, opts.playlistId);
      });
      actions.appendChild(removeBtn);
    } else if (opts.albumId && opts.canEdit) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "icon-btn";
      removeBtn.textContent = "✕ album";
      removeBtn.title = "Rimuovi dall'album";
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await removeTrackFromAlbum(track.id, opts.albumId);
      });
      actions.appendChild(removeBtn);
    } else if (!opts.playlistId && !opts.albumId && isOwner(track)) {
      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn";
      editBtn.textContent = "✏️";
      editBtn.title = "Modifica info";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditor();
      });
      actions.appendChild(editBtn);

      const privacyBtn = document.createElement("button");
      privacyBtn.className = "icon-btn" + (track.is_private ? " private" : "");
      privacyBtn.textContent = track.is_private ? "🔒" : "🌍";
      privacyBtn.title = track.is_private ? "Privato: rendi pubblico" : "Pubblico: rendi privato";
      privacyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await toggleCollectionPrivacy("tracks", track, privacyBtn);
      });
      actions.appendChild(privacyBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn";
      deleteBtn.textContent = "🗑";
      deleteBtn.title = "Elimina brano";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        confirmDelete({
          title: "Eliminare il brano?",
          message: `"${track.title}" verrà rimosso definitivamente dallo storage e dalla libreria: non si può annullare.`,
          onConfirm: () => deleteTrack(track),
        });
      });
      actions.appendChild(deleteBtn);
    }

    tagsRow.appendChild(tagsBox);
    tagsRow.appendChild(actions);

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(tagsRow);
    li.appendChild(row);

    const attribution = document.createElement("p");
    attribution.className = "track-attribution";
    attribution.textContent = attributionText(track, "Caricato");
    li.appendChild(attribution);

    // EDITOR INFO INLINE (artista, album, tag)
    const editor = document.createElement("div");
    editor.className = "tag-editor";
    editor.innerHTML = `
      <input type="text" class="edit-title-input" placeholder="Titolo">
      <div class="info-editor-fields">
        <input type="text" class="edit-artist-input" placeholder="Artista">
        <input type="text" class="edit-album-input" placeholder="Album">
      </div>
      <div class="tags-box">
        <div class="edit-tags-container"></div>
        <input type="text" class="edit-tag-input" placeholder="Aggiungi tag e premi Invio">
      </div>
      <button class="tag-editor-save">Salva</button>
    `;
    li.appendChild(editor);

    // CLICK PLAY (solo sul li, non sui pulsanti)
    li.addEventListener("click", () => play(track, queueList));

    likeBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await toggleFavorite(track);
    });

    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".add-to-playlist-menu.open").forEach((m) => {
        if (m !== menu) m.classList.remove("open");
      });
      menu.classList.toggle("open");
    });

    let editorController = null;

    function openEditor() {
      const isOpen = editor.style.display === "block";
      editor.style.display = isOpen ? "none" : "block";
      if (!isOpen) {
        editor.querySelector(".edit-title-input").value = track.title || "";
        editor.querySelector(".edit-artist-input").value = track.artist || "";
        editor.querySelector(".edit-album-input").value = track.album || "";
        editorController = setupTagEditor(editor, track.tags || []);
      }
    }

    editor.querySelector(".tag-editor-save").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!editorController) return;

      const newTitle = editor.querySelector(".edit-title-input").value.trim();
      if (!newTitle) {
        showToast("Il titolo non può essere vuoto.");
        return;
      }

      const newArtist = editor.querySelector(".edit-artist-input").value.trim();
      const newAlbum = editor.querySelector(".edit-album-input").value.trim();
      const newTags = editorController.getTags();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("tracks")
        .update({ title: newTitle, artist: newArtist || null, album: newAlbum || null, tags: newTags, updated_at: now })
        .eq("id", track.id);

      if (error) {
        console.error("Errore aggiornamento brano:", error);
        showToast("Errore nel salvataggio delle informazioni.");
        return;
      }

      track.title = newTitle;
      track.artist = newArtist || null;
      track.album = newAlbum || null;
      track.tags = newTags;
      track.updated_at = now;

      title.textContent = newTitle;
      updateTrackSubtitle();
      renderTagChips(tagsBox, newTags);
      attribution.textContent = attributionText(track, "Caricato");
      editor.style.display = "none";
      showToast("Informazioni brano aggiornate.", "success");
    });

    return li;
  }

  document.addEventListener("click", () => {
    document.querySelectorAll(".add-to-playlist-menu.open").forEach((m) => m.classList.remove("open"));
  });

  /* ============================================================
     PREFERITI
  ============================================================ */
  async function toggleFavorite(track) {
    const newVal = !favoriteTrackIds.has(track.id);

    const { error } = newVal
      ? await supabase.from("track_favorites").insert({ user_id: currentUser.id, track_id: track.id })
      : await supabase.from("track_favorites").delete().eq("user_id", currentUser.id).eq("track_id", track.id);

    if (error) {
      console.error(error);
      showToast("Errore nell'aggiornare i preferiti.");
      return;
    }

    if (newVal) favoriteTrackIds.add(track.id);
    else favoriteTrackIds.delete(track.id);

    if (track.id === nowPlayingId) updateLikeCurrentBtn(track);

    if (currentView === "favorites") {
      // il brano deve comparire/sparire da questa vista: serve un rebuild
      render();
    } else {
      // altrove basta aggiornare il cuoricino, senza ricostruire la lista
      // (evita di richiudere editor tag o playlist aperte in quel momento)
      document.querySelectorAll(`.track-item[data-track-id="${track.id}"] .like-btn`).forEach((btn) => {
        btn.classList.toggle("liked", newVal);
        btn.textContent = newVal ? "♥" : "♡";
      });
    }
  }

  /* ============================================================
     ELIMINAZIONE BRANO
  ============================================================ */
  async function deleteTrack(track) {
    const { error: storageErr } = await supabase.storage.from(BUCKET_NAME).remove([track.storage_path]);
    if (storageErr) {
      console.error(storageErr);
      showToast("Errore nell'eliminare il file audio dallo storage.");
    }

    const { error: dbErr } = await supabase.from("tracks").delete().eq("id", track.id);
    if (dbErr) {
      console.error(dbErr);
      showToast("Errore nell'eliminare il brano.");
      return;
    }

    allTracks = allTracks.filter((t) => t.id !== track.id);
    Object.keys(playlistTracksMap).forEach((pid) => {
      playlistTracksMap[pid] = playlistTracksMap[pid].filter((id) => id !== track.id);
    });
    Object.keys(albumTracksMap).forEach((aid) => {
      albumTracksMap[aid] = albumTracksMap[aid].filter((id) => id !== track.id);
    });
    favoriteTrackIds.delete(track.id);
    delete userPlayStats[track.id];

    if (track.id === nowPlayingId) {
      audioPlayer.pause();
      audioPlayer.removeAttribute("src");
      nowPlayingId = null;
      currentQueue = [];
      currentIndex = -1;
      currentTrackName.textContent = "Nessun brano in riproduzione";
      currentTrackArtist.textContent = "";
      currentCover.src = DEFAULT_COVER;
      seekBar.value = 0;
      seekBar.max = 0;
      seekBar.style.setProperty("--progress", "0%");
      if (miniProgressFill) miniProgressFill.style.width = "0%";
      currentTimeLabel.textContent = "0:00";
      durationLabel.textContent = "0:00";
      miniPlayer.hidden = true;
      fullPlayer.hidden = true;
      document.body.classList.remove("has-mini-player");
    }

    showToast("Brano eliminato.", "success");
    render();
  }

  /* ============================================================
     PRIVACY E RINOMINA (condivisi da playlist e album)
  ============================================================ */
  async function toggleCollectionPrivacy(table, row, btn) {
    const newVal = !row.is_private;
    const { error } = await supabase.from(table).update({ is_private: newVal }).eq("id", row.id);
    if (error) {
      console.error(error);
      showToast("Errore nell'aggiornare la privacy.");
      return;
    }
    row.is_private = newVal;
    if (btn) {
      btn.classList.toggle("private", newVal);
      btn.textContent = newVal ? "🔒" : "🌍";
      btn.title = newVal ? "Privato: rendi pubblico" : "Pubblico: rendi privato";
    }
    showToast(newVal ? "Reso privato." : "Reso pubblico.", "success");
  }

  function startInlineRename(nameEl, currentName, onSave) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "inline-rename-input";
    input.value = currentName;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    let settled = false;

    function restore() {
      if (input.isConnected) input.replaceWith(nameEl);
    }

    function commit() {
      if (settled) return;
      settled = true;
      const newName = input.value.trim();
      restore();
      if (newName && newName !== currentName) onSave(newName);
    }

    function cancel() {
      if (settled) return;
      settled = true;
      restore();
    }

    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") commit();
      if (e.key === "Escape") cancel();
    });
    input.addEventListener("blur", commit);
  }

  /* ============================================================
     PLAYLIST
  ============================================================ */
  newPlaylistBtn?.addEventListener("click", async () => {
    const name = newPlaylistName.value.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("playlists")
      .insert({ user_id: currentUser.id, name })
      .select()
      .single();

    if (error) {
      console.error(error);
      showToast("Errore nella creazione della playlist.");
      return;
    }

    playlists.unshift(data);
    playlistTracksMap[data.id] = [];
    newPlaylistName.value = "";
    showToast(`Playlist "${data.name}" creata.`, "success");
    render();
  });

  async function addTrackToPlaylist(trackId, playlistId) {
    const nextPosition = (playlistTracksMap[playlistId] || []).length;

    const { error } = await supabase
      .from("playlist_tracks")
      .insert({ playlist_id: playlistId, track_id: trackId, position: nextPosition });

    if (error && error.code !== "23505") {
      console.error(error);
      showToast("Errore nell'aggiungere il brano alla playlist.");
      return;
    }

    if (!playlistTracksMap[playlistId]) playlistTracksMap[playlistId] = [];
    if (!playlistTracksMap[playlistId].includes(trackId)) {
      playlistTracksMap[playlistId].push(trackId);
      const pl = playlists.find((p) => p.id === playlistId);
      showToast(pl ? `Aggiunto a "${pl.name}".` : "Aggiunto alla playlist.", "success");
    }

    if (currentView === "playlists") render();
  }

  async function removeTrackFromPlaylist(trackId, playlistId) {
    const { error } = await supabase
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("track_id", trackId);

    if (error) {
      console.error(error);
      showToast("Errore nel rimuovere il brano dalla playlist.");
      return;
    }

    playlistTracksMap[playlistId] = (playlistTracksMap[playlistId] || []).filter((id) => id !== trackId);
    render();
  }

  async function persistCollectionOrder(table, ownerColumn, ownerId, orderedTrackIds) {
    const results = await Promise.all(
      orderedTrackIds.map((trackId, index) =>
        supabase.from(table).update({ position: index }).eq(ownerColumn, ownerId).eq("track_id", trackId)
      )
    );
    if (results.some((r) => r.error)) {
      showToast("Errore nel salvare il nuovo ordine.");
    }
  }

  function renderPlaylists() {
    playlistsList.innerHTML = "";

    const term = searchTerm.trim().toLowerCase();
    const visiblePlaylists = term ? playlists.filter((pl) => pl.name.toLowerCase().includes(term)) : playlists;

    if (!visiblePlaylists.length) {
      emptyMessage.textContent = term ? "Nessuna playlist trovata." : "Nessuna playlist creata.";
      emptyMessage.style.display = "block";
      return;
    }
    emptyMessage.style.display = "none";

    visiblePlaylists.forEach((pl) => {
      const canEdit = isOwner(pl);

      const li = document.createElement("li");
      li.className = "playlist-item";

      const row = document.createElement("div");
      row.className = "playlist-item-row";

      const name = document.createElement("span");
      name.className = "playlist-name";
      name.textContent = pl.name;

      const trackIds = playlistTracksMap[pl.id] || [];

      const count = document.createElement("span");
      count.className = "playlist-count";
      count.textContent = `${trackIds.length} brani`;

      const actions = document.createElement("div");
      actions.className = "playlist-actions";

      const playBtn = document.createElement("button");
      playBtn.className = "icon-btn";
      playBtn.textContent = "▶";
      playBtn.title = "Riproduci playlist";
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tracks = trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);
        if (!tracks.length) return;
        play(tracks[0], tracks);
        // mostra la scaletta se non è già aperta, così si vede cosa sta suonando
        if (expandedPlaylistId !== pl.id) {
          expandedPlaylistId = pl.id;
          render();
        }
      });
      actions.appendChild(playBtn);

      if (canEdit) {
        const renameBtn = document.createElement("button");
        renameBtn.className = "icon-btn";
        renameBtn.textContent = "✏️";
        renameBtn.title = "Rinomina playlist";
        renameBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          startInlineRename(name, pl.name, async (newName) => {
            const { error } = await supabase.from("playlists").update({ name: newName }).eq("id", pl.id);
            if (error) {
              console.error(error);
              showToast("Errore nel rinominare la playlist.");
              return;
            }
            pl.name = newName;
            showToast("Playlist rinominata.", "success");
            render();
          });
        });
        actions.appendChild(renameBtn);

        const privacyBtn = document.createElement("button");
        privacyBtn.className = "icon-btn" + (pl.is_private ? " private" : "");
        privacyBtn.textContent = pl.is_private ? "🔒" : "🌍";
        privacyBtn.title = pl.is_private ? "Privata: rendi pubblica" : "Pubblica: rendi privata";
        privacyBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await toggleCollectionPrivacy("playlists", pl, privacyBtn);
        });
        actions.appendChild(privacyBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-btn";
        deleteBtn.textContent = "🗑";
        deleteBtn.title = "Elimina playlist";
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          confirmDelete({
            title: "Eliminare la playlist?",
            message: `"${pl.name}" verrà eliminata definitivamente. I brani contenuti non vengono toccati.`,
            onConfirm: async () => {
              const { error } = await supabase.from("playlists").delete().eq("id", pl.id);
              if (error) {
                console.error(error);
                showToast("Errore nell'eliminare la playlist.");
                return;
              }
              playlists = playlists.filter((p) => p.id !== pl.id);
              delete playlistTracksMap[pl.id];
              if (expandedPlaylistId === pl.id) expandedPlaylistId = null;
              showToast("Playlist eliminata.", "success");
              render();
            },
          });
        });
        actions.appendChild(deleteBtn);
      }

      row.appendChild(name);
      row.appendChild(count);
      row.appendChild(actions);

      const attribution = document.createElement("p");
      attribution.className = "playlist-attribution";
      attribution.textContent = attributionText(pl, "Creata");

      const detail = document.createElement("div");
      detail.className = "playlist-tracks";

      // riapre automaticamente la playlist che l'utente aveva già espanso,
      // così azioni come play/like/rimuovi non la richiudono di scatto
      if (expandedPlaylistId === pl.id) {
        populatePlaylistDetail(detail, pl, trackIds, canEdit);
        detail.classList.add("open");
      }

      row.addEventListener("click", () => {
        const isOpen = expandedPlaylistId === pl.id;
        expandedPlaylistId = isOpen ? null : pl.id;
        render();
      });

      li.appendChild(row);
      li.appendChild(attribution);
      li.appendChild(detail);
      playlistsList.appendChild(li);
    });
  }

  function populatePlaylistDetail(detail, pl, trackIds, canEdit) {
    detail.innerHTML = "";
    const tracks = trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);

    if (!tracks.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nessun brano in questa playlist.";
      empty.style.cssText = "font-size:0.8rem;color:#9aa1b0;";
      detail.appendChild(empty);
    } else {
      const ul = document.createElement("ul");
      ul.className = "tracks-list";
      tracks.forEach((t) => ul.appendChild(buildTrackItem(t, tracks, { playlistId: pl.id, canEdit })));
      detail.appendChild(ul);
      if (canEdit) attachDragReorder(ul, pl.id, playlistTracksMap, "playlist_tracks", "playlist_id");
    }
  }

  /* ============================================================
     ALBUM (stessa logica delle playlist, entità propria)
  ============================================================ */
  newAlbumBtn?.addEventListener("click", async () => {
    const name = newAlbumName.value.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("albums")
      .insert({ user_id: currentUser.id, name })
      .select()
      .single();

    if (error) {
      console.error(error);
      showToast("Errore nella creazione dell'album.");
      return;
    }

    albums.unshift(data);
    albumTracksMap[data.id] = [];
    newAlbumName.value = "";
    showToast(`Album "${data.name}" creato.`, "success");
    render();
  });

  async function addTrackToAlbum(trackId, albumId) {
    const nextPosition = (albumTracksMap[albumId] || []).length;

    const { error } = await supabase
      .from("album_tracks")
      .insert({ album_id: albumId, track_id: trackId, position: nextPosition });

    if (error && error.code !== "23505") {
      console.error(error);
      showToast("Errore nell'aggiungere il brano all'album.");
      return;
    }

    if (!albumTracksMap[albumId]) albumTracksMap[albumId] = [];
    if (!albumTracksMap[albumId].includes(trackId)) {
      albumTracksMap[albumId].push(trackId);
      const al = albums.find((a) => a.id === albumId);
      showToast(al ? `Aggiunto a "${al.name}".` : "Aggiunto all'album.", "success");
    }

    if (currentView === "albums") render();
  }

  async function removeTrackFromAlbum(trackId, albumId) {
    const { error } = await supabase
      .from("album_tracks")
      .delete()
      .eq("album_id", albumId)
      .eq("track_id", trackId);

    if (error) {
      console.error(error);
      showToast("Errore nel rimuovere il brano dall'album.");
      return;
    }

    albumTracksMap[albumId] = (albumTracksMap[albumId] || []).filter((id) => id !== trackId);
    render();
  }

  function renderAlbums() {
    albumsList.innerHTML = "";

    const term = searchTerm.trim().toLowerCase();
    const visibleAlbums = term ? albums.filter((al) => al.name.toLowerCase().includes(term)) : albums;

    if (!visibleAlbums.length) {
      emptyMessage.textContent = term ? "Nessun album trovato." : "Nessun album creato.";
      emptyMessage.style.display = "block";
      return;
    }
    emptyMessage.style.display = "none";

    visibleAlbums.forEach((al) => {
      const canEdit = isOwner(al);

      const li = document.createElement("li");
      li.className = "playlist-item";

      const row = document.createElement("div");
      row.className = "playlist-item-row";

      const name = document.createElement("span");
      name.className = "playlist-name";
      name.textContent = al.name;

      const trackIds = albumTracksMap[al.id] || [];

      const count = document.createElement("span");
      count.className = "playlist-count";
      count.textContent = `${trackIds.length} brani`;

      const actions = document.createElement("div");
      actions.className = "playlist-actions";

      const playBtn = document.createElement("button");
      playBtn.className = "icon-btn";
      playBtn.textContent = "▶";
      playBtn.title = "Riproduci album";
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tracks = trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);
        if (!tracks.length) return;
        play(tracks[0], tracks);
        // mostra la scaletta se non è già aperta, così si vede cosa sta suonando
        if (expandedAlbumId !== al.id) {
          expandedAlbumId = al.id;
          render();
        }
      });
      actions.appendChild(playBtn);

      if (canEdit) {
        const renameBtn = document.createElement("button");
        renameBtn.className = "icon-btn";
        renameBtn.textContent = "✏️";
        renameBtn.title = "Rinomina album";
        renameBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          startInlineRename(name, al.name, async (newName) => {
            const { error } = await supabase.from("albums").update({ name: newName }).eq("id", al.id);
            if (error) {
              console.error(error);
              showToast("Errore nel rinominare l'album.");
              return;
            }
            al.name = newName;
            showToast("Album rinominato.", "success");
            render();
          });
        });
        actions.appendChild(renameBtn);

        const privacyBtn = document.createElement("button");
        privacyBtn.className = "icon-btn" + (al.is_private ? " private" : "");
        privacyBtn.textContent = al.is_private ? "🔒" : "🌍";
        privacyBtn.title = al.is_private ? "Privato: rendi pubblico" : "Pubblico: rendi privato";
        privacyBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await toggleCollectionPrivacy("albums", al, privacyBtn);
        });
        actions.appendChild(privacyBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-btn";
        deleteBtn.textContent = "🗑";
        deleteBtn.title = "Elimina album";
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          confirmDelete({
            title: "Eliminare l'album?",
            message: `"${al.name}" verrà eliminato definitivamente. I brani contenuti non vengono toccati.`,
            onConfirm: async () => {
              const { error } = await supabase.from("albums").delete().eq("id", al.id);
              if (error) {
                console.error(error);
                showToast("Errore nell'eliminare l'album.");
                return;
              }
              albums = albums.filter((a) => a.id !== al.id);
              delete albumTracksMap[al.id];
              if (expandedAlbumId === al.id) expandedAlbumId = null;
              showToast("Album eliminato.", "success");
              render();
            },
          });
        });
        actions.appendChild(deleteBtn);
      }

      row.appendChild(name);
      row.appendChild(count);
      row.appendChild(actions);

      const attribution = document.createElement("p");
      attribution.className = "playlist-attribution";
      attribution.textContent = attributionText(al, "Creato");

      const detail = document.createElement("div");
      detail.className = "playlist-tracks";

      if (expandedAlbumId === al.id) {
        populateAlbumDetail(detail, al, trackIds, canEdit);
        detail.classList.add("open");
      }

      row.addEventListener("click", () => {
        const isOpen = expandedAlbumId === al.id;
        expandedAlbumId = isOpen ? null : al.id;
        render();
      });

      li.appendChild(row);
      li.appendChild(attribution);
      li.appendChild(detail);
      albumsList.appendChild(li);
    });
  }

  function populateAlbumDetail(detail, al, trackIds, canEdit) {
    detail.innerHTML = "";
    const tracks = trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);

    if (!tracks.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nessun brano in questo album.";
      empty.style.cssText = "font-size:0.8rem;color:#9aa1b0;";
      detail.appendChild(empty);
    } else {
      const ul = document.createElement("ul");
      ul.className = "tracks-list";
      tracks.forEach((t) => ul.appendChild(buildTrackItem(t, tracks, { albumId: al.id, canEdit })));
      detail.appendChild(ul);
      if (canEdit) attachDragReorder(ul, al.id, albumTracksMap, "album_tracks", "album_id");
    }
  }

  /* ============================================================
     RIORDINO PLAYLIST/ALBUM (drag & drop)
  ============================================================ */
  function attachDragReorder(ul, ownerId, tracksMap, table, ownerColumn) {
    let dropBefore = true;

    function clearDropIndicators() {
      ul.querySelectorAll(".track-item.drop-before, .track-item.drop-after").forEach((el) =>
        el.classList.remove("drop-before", "drop-after")
      );
    }

    ul.addEventListener("dragover", (e) => {
      e.preventDefault();
      const targetLi = e.target.closest(".track-item");
      clearDropIndicators();
      if (!targetLi || targetLi.classList.contains("dragging")) return;

      // metà superiore = inserisci prima, metà inferiore = inserisci dopo:
      // così il punto di rilascio non è ambiguo, in nessuna direzione
      const rect = targetLi.getBoundingClientRect();
      dropBefore = e.clientY - rect.top < rect.height / 2;
      targetLi.classList.add(dropBefore ? "drop-before" : "drop-after");
    });

    ul.addEventListener("dragleave", (e) => {
      const targetLi = e.target.closest(".track-item");
      if (targetLi) targetLi.classList.remove("drop-before", "drop-after");
    });

    ul.addEventListener("drop", async (e) => {
      e.preventDefault();
      clearDropIndicators();

      const draggedId = e.dataTransfer.getData("text/plain");
      const targetLi = e.target.closest(".track-item");
      if (!draggedId || !targetLi) return;

      const targetId = targetLi.dataset.trackId;
      if (targetId === draggedId) return;

      const ids = (tracksMap[ownerId] || []).slice();
      const from = ids.indexOf(draggedId);
      if (from === -1 || !ids.includes(targetId)) return;

      ids.splice(from, 1);
      const targetIndex = ids.indexOf(targetId); // ricalcolato dopo la rimozione
      ids.splice(targetIndex + (dropBefore ? 0 : 1), 0, draggedId);
      tracksMap[ownerId] = ids;

      render();
      await persistCollectionOrder(table, ownerColumn, ownerId, ids);
    });
  }

  /* ============================================================
     PLAYER: PLAY / CODA / SHUFFLE / REPEAT
  ============================================================ */
  async function play(track, queueList) {
    currentQueue = queueList.slice();
    currentIndex = currentQueue.findIndex((t) => t.id === track.id);

    const { data: audioSigned, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(track.storage_path, 3600);

    if (error || !audioSigned?.signedUrl) {
      console.error(error);
      showToast("Errore nella riproduzione del brano.");
      return;
    }

    audioPlayer.src = audioSigned.signedUrl;
    audioPlayer.play();

    seekBar.value = 0;
    seekBar.max = 0;
    seekBar.style.setProperty("--progress", "0%");
    if (miniProgressFill) miniProgressFill.style.width = "0%";
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";

    const metaLine = [track.artist, track.album].filter(Boolean).join(" — ");

    nowPlayingId = track.id;
    currentTrackName.textContent = track.title;
    currentTrackArtist.textContent = metaLine;
    currentCover.src = track.cover || DEFAULT_COVER;
    updateLikeCurrentBtn(track);
    updatePlayingHighlight();

    miniTrackName.textContent = track.title;
    miniTrackArtist.textContent = metaLine;
    miniCover.src = track.cover || DEFAULT_COVER;
    miniPlayer.hidden = false;
    document.body.classList.add("has-mini-player");

    registerPlay(track);
  }

  function registerPlay(track) {
    const now = new Date().toISOString();
    const stat = userPlayStats[track.id] || { count: 0, lastPlayedAt: null };
    stat.count += 1;
    stat.lastPlayedAt = now;
    userPlayStats[track.id] = stat;

    // cronologia/ascolti sono personali: un insert in track_plays, mai un
    // update su tracks (di cui potremmo non essere proprietari)
    supabase
      .from("track_plays")
      .insert({ user_id: currentUser.id, track_id: track.id, played_at: now })
      .then(({ error }) => {
        if (error) console.error("Errore aggiornamento cronologia:", error);
      });
  }

  function updatePlayingHighlight() {
    document.querySelectorAll(".track-item.playing").forEach((el) => el.classList.remove("playing"));
    if (nowPlayingId != null) {
      document
        .querySelectorAll(`.track-item[data-track-id="${nowPlayingId}"]`)
        .forEach((el) => el.classList.add("playing"));
    }
  }

  function updateLikeCurrentBtn(track) {
    const liked = favoriteTrackIds.has(track.id);
    likeCurrentBtn.classList.toggle("liked", liked);
    likeCurrentBtn.textContent = liked ? "♥" : "🤍";
  }

  function pickNextIndex() {
    if (!currentQueue.length) return -1;
    if (shuffleOn) {
      if (currentQueue.length === 1) return 0;
      let idx;
      do {
        idx = Math.floor(Math.random() * currentQueue.length);
      } while (idx === currentIndex);
      return idx;
    }
    if (currentIndex + 1 < currentQueue.length) return currentIndex + 1;
    return repeatMode === "all" ? 0 : -1;
  }

  function pickPrevIndex() {
    if (!currentQueue.length) return -1;
    if (shuffleOn) {
      if (currentQueue.length === 1) return 0;
      let idx;
      do {
        idx = Math.floor(Math.random() * currentQueue.length);
      } while (idx === currentIndex);
      return idx;
    }
    if (currentIndex - 1 >= 0) return currentIndex - 1;
    return repeatMode === "all" ? currentQueue.length - 1 : -1;
  }

  nextBtn?.addEventListener("click", () => {
    const idx = pickNextIndex();
    if (idx >= 0) play(currentQueue[idx], currentQueue);
  });

  prevBtn?.addEventListener("click", () => {
    const idx = pickPrevIndex();
    if (idx >= 0) play(currentQueue[idx], currentQueue);
  });

  shuffleBtn?.addEventListener("click", () => {
    shuffleOn = !shuffleOn;
    shuffleBtn.classList.toggle("active", shuffleOn);
  });

  repeatBtn?.addEventListener("click", () => {
    repeatMode = repeatMode === "none" ? "all" : repeatMode === "all" ? "one" : "none";
    repeatBtn.classList.toggle("active", repeatMode !== "none");
    repeatBtn.textContent = repeatMode === "one" ? "🔂" : "🔁";
  });

  likeCurrentBtn?.addEventListener("click", async () => {
    if (nowPlayingId == null) return;
    const track = allTracks.find((t) => t.id === nowPlayingId);
    if (track) await toggleFavorite(track);
  });

  /* PLAY/PAUSA + effetti visivi "sta suonando" attorno alla cover: riflettono
     lo stato reale dell'elemento audio, non solo i nostri pulsanti */
  playPauseBtn?.addEventListener("click", () => {
    if (!audioPlayer.src) return;
    if (audioPlayer.paused) audioPlayer.play();
    else audioPlayer.pause();
  });

  function setPlayPauseIcon(isPlaying) {
    const icon = isPlaying ? "⏸" : "▶";
    const label = isPlaying ? "Pausa" : "Play";
    if (playPauseBtn) {
      playPauseBtn.textContent = icon;
      playPauseBtn.title = label;
    }
    if (miniPlayPauseBtn) {
      miniPlayPauseBtn.textContent = icon;
      miniPlayPauseBtn.title = label;
    }
  }

  audioPlayer.addEventListener("play", () => {
    document.body.classList.add("audio-playing");
    setPlayPauseIcon(true);
  });

  audioPlayer.addEventListener("pause", () => {
    document.body.classList.remove("audio-playing");
    setPlayPauseIcon(false);
  });

  audioPlayer.addEventListener("ended", () => {
    document.body.classList.remove("audio-playing");
    setPlayPauseIcon(false);
  });

  /* BARRA DI AVANZAMENTO (sostituisce i controlli nativi del browser) */
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  audioPlayer.addEventListener("loadedmetadata", () => {
    seekBar.max = audioPlayer.duration || 0;
    durationLabel.textContent = formatTime(audioPlayer.duration);
  });

  audioPlayer.addEventListener("timeupdate", () => {
    seekBar.value = audioPlayer.currentTime;
    currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
    const pct = audioPlayer.duration ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
    seekBar.style.setProperty("--progress", `${pct}%`);
    if (miniProgressFill) miniProgressFill.style.width = `${pct}%`;
  });

  seekBar?.addEventListener("input", () => {
    audioPlayer.currentTime = Number(seekBar.value);
    currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
    const pct = seekBar.max ? (seekBar.value / seekBar.max) * 100 : 0;
    seekBar.style.setProperty("--progress", `${pct}%`);
    if (miniProgressFill) miniProgressFill.style.width = `${pct}%`;
  });

  audioPlayer.addEventListener("ended", () => {
    if (repeatMode === "one") {
      audioPlayer.currentTime = 0;
      audioPlayer.play();
      return;
    }
    const idx = pickNextIndex();
    if (idx >= 0) play(currentQueue[idx], currentQueue);
  });

  /* ============================================================
     NAVIGAZIONE PRIMARIA (Libreria / Carica)
  ============================================================ */
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetPage = btn.dataset.page;
      // esistono due gruppi di pulsanti (sidebar desktop + barra mobile):
      // vanno sincronizzati per pagina, non per riferimento al singolo elemento
      document.querySelectorAll(".nav-tab").forEach((b) => b.classList.toggle("active", b.dataset.page === targetPage));
      document.querySelectorAll(".app-page").forEach((page) => {
        page.classList.toggle("active", page.id === `page-${targetPage}`);
      });
    });
  });

  /* ============================================================
     MINI PLAYER <-> PLAYER ESTESO
  ============================================================ */
  miniPlayer?.addEventListener("click", (e) => {
    if (e.target.closest("#mini-play-pause-btn")) return;
    fullPlayer.hidden = false;
  });

  collapsePlayerBtn?.addEventListener("click", () => {
    fullPlayer.hidden = true;
  });

  miniPlayPauseBtn?.addEventListener("click", () => {
    if (!audioPlayer.src) return;
    if (audioPlayer.paused) audioPlayer.play();
    else audioPlayer.pause();
  });
}
