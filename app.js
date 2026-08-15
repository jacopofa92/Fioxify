/* ============================================================
   CONFIG SUPABASE
============================================================ */
const SUPABASE_URL = "https://ostajdhuaxrjrwroayja.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdGFqZGh1YXhyanJ3cm9heWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTcyOTQsImV4cCI6MjA5MjE3MzI5NH0.YVzjs5VDHfGC8taGvlGxJiXb8Bh-NnZY1TjNeSTuGsY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = "Fioxisongs";

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' +
      '<rect width="240" height="240" fill="#181a22"/>' +
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
  const groupsPanel = document.getElementById("groups-panel");
  const groupsList = document.getElementById("groups-list");

  const shuffleBtn = document.getElementById("shuffle-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const repeatBtn = document.getElementById("repeat-btn");
  const likeCurrentBtn = document.getElementById("like-current-btn");

  /* STATE */
  let currentUser = null;
  let allTracks = [];
  let playlists = [];
  let playlistTracksMap = {}; // playlistId -> [trackId, ...]
  let currentView = "library"; // "library" | "favorites" | "history" | "artists" | "albums" | "playlists"
  let searchTerm = "";
  let sortBy = "date"; // "date" | "title" | "artist" | "plays"

  let currentQueue = [];
  let currentIndex = -1;
  let nowPlayingId = null;
  let shuffleOn = false;
  let repeatMode = "none"; // "none" | "all" | "one"
  let expandedPlaylistId = null;
  let expandedGroupKey = null;

  currentCover.src = DEFAULT_COVER;

  /* TAG SYSTEM UPLOAD */
  let currentTags = [];
  const tagsContainer = document.getElementById("tags-container");
  const tagInput = document.getElementById("tag-input");

  function renderUploadTags() {
    tagsContainer.innerHTML = "";
    currentTags.forEach((tag, index) => {
      const tagEl = document.createElement("div");
      tagEl.className = "tag";
      tagEl.innerHTML = `
        ${tag}
        <span class="tag-remove" data-index="${index}">×</span>
      `;
      tagsContainer.appendChild(tagEl);
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
  ============================================================ */
  uploadBtn?.addEventListener("click", async () => {
    uploadStatus.textContent = "";
    const file = fileInput.files[0];
    if (!file) {
      uploadStatus.textContent = "Seleziona un file audio.";
      return;
    }

    uploadStatus.textContent = "Lettura metadata...";

    let extractedTitle = file.name.replace(/\.[^/.]+$/, "");
    let extractedArtist = "";
    let extractedAlbum = "";
    let extractedCover = null;

    await new Promise((resolve) => {
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
          resolve();
        },
        onError: () => resolve(),
      });
    });

    uploadStatus.textContent = "Caricamento...";

    const ext = file.name.split(".").pop();
    const fileName = `${slugify(extractedTitle)}-${Date.now()}.${ext}`;
    const audioPath = `${currentUser.id}/${fileName}`;

    const { error: audioErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(audioPath, file);

    if (audioErr) {
      uploadStatus.textContent = "Errore upload audio.";
      console.error(audioErr);
      showToast("Errore durante il caricamento del file audio.");
      return;
    }

    const { error: dbErr } = await supabase.from("tracks").insert({
      user_id: currentUser.id,
      title: extractedTitle,
      artist: extractedArtist || null,
      album: extractedAlbum || null,
      cover: extractedCover,
      storage_path: audioPath,
      tags: currentTags,
    });

    if (dbErr) {
      uploadStatus.textContent = "Errore salvataggio metadata.";
      console.error(dbErr);
      showToast("Errore nel salvataggio dei metadata del brano.");
      return;
    }

    uploadStatus.textContent = "Caricato!";
    fileInput.value = "";
    currentTags = [];
    renderUploadTags();
    showToast("Brano caricato!", "success");

    await loadData();
  });

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
        const el = document.createElement("div");
        el.className = "tag";
        el.innerHTML = `${tag} <span class="tag-remove" data-index="${index}">×</span>`;
        container.appendChild(el);
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
    const [{ data: trackRows, error: trackErr }, { data: playlistRows }, { data: ptRows }] =
      await Promise.all([
        supabase.from("tracks").select("*").order("created_at", { ascending: false }),
        supabase.from("playlists").select("*").order("created_at", { ascending: false }),
        supabase.from("playlist_tracks").select("*").order("position", { ascending: true }),
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

    render();
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
      arr.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    } else if (currentView === "history") {
      arr.sort((a, b) => new Date(b.last_played_at) - new Date(a.last_played_at));
    } else {
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return arr;
  }

  function getVisibleTracks() {
    let base;
    if (currentView === "favorites") base = allTracks.filter((t) => t.is_favorite);
    else if (currentView === "history") base = allTracks.filter((t) => t.last_played_at);
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
    const isGroupedView = currentView === "artists" || currentView === "albums";
    const isListView = !isPlaylistsView && !isGroupedView;

    playlistsPanel.style.display = isPlaylistsView ? "block" : "none";
    groupsPanel.style.display = isGroupedView ? "block" : "none";
    tracksList.style.display = isListView ? "block" : "none";
    sortSelect.style.display = isListView ? "" : "none";

    if (isPlaylistsView) {
      renderPlaylists();
      return;
    }

    if (isGroupedView) {
      renderGroupedView(currentView === "artists" ? "artist" : "album");
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

    if (opts.playlistId) {
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
    if (track.artist) {
      const subtitle = document.createElement("span");
      subtitle.className = "track-subtitle";
      subtitle.textContent = track.artist;
      info.appendChild(subtitle);
    }

    const tagsRow = document.createElement("div");
    tagsRow.className = "track-tags-row";

    const tagsBox = document.createElement("div");
    tagsBox.className = "track-tags";
    tagsBox.innerHTML = (track.tags || []).map((t) => `<span class="tag">${t}</span>`).join(" ");

    const editBtn = document.createElement("button");
    editBtn.className = "edit-tags-btn";
    editBtn.textContent = "Modifica tag";

    const actions = document.createElement("div");
    actions.className = "track-actions";

    const likeBtn = document.createElement("button");
    likeBtn.className = "icon-btn like-btn" + (track.is_favorite ? " liked" : "");
    likeBtn.textContent = track.is_favorite ? "♥" : "♡";
    likeBtn.title = "Preferito";

    const addWrap = document.createElement("div");
    addWrap.className = "add-to-playlist-dropdown";
    const addBtn = document.createElement("button");
    addBtn.className = "icon-btn";
    addBtn.textContent = "+";
    addBtn.title = "Aggiungi a playlist";
    const menu = document.createElement("div");
    menu.className = "add-to-playlist-menu";

    if (!playlists.length) {
      const empty = document.createElement("span");
      empty.textContent = "Nessuna playlist";
      empty.style.cssText = "display:block;padding:6px 8px;color:#9ca3af;font-size:0.75rem;";
      menu.appendChild(empty);
    } else {
      playlists.forEach((pl) => {
        const item = document.createElement("button");
        item.textContent = pl.name;
        item.addEventListener("click", async (e) => {
          e.stopPropagation();
          await addTrackToPlaylist(track.id, pl.id);
          menu.classList.remove("open");
        });
        menu.appendChild(item);
      });
    }
    addWrap.appendChild(addBtn);
    addWrap.appendChild(menu);

    actions.appendChild(likeBtn);
    actions.appendChild(addWrap);

    if (opts.playlistId) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "icon-btn";
      removeBtn.textContent = "✕ playlist";
      removeBtn.title = "Rimuovi dalla playlist";
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await removeTrackFromPlaylist(track.id, opts.playlistId);
      });
      actions.appendChild(removeBtn);
    } else {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn";
      deleteBtn.textContent = "🗑";
      deleteBtn.title = "Elimina brano";
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`Eliminare "${track.title}"?`)) await deleteTrack(track);
      });
      actions.appendChild(deleteBtn);
    }

    tagsRow.appendChild(tagsBox);
    tagsRow.appendChild(editBtn);
    tagsRow.appendChild(actions);

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(tagsRow);
    li.appendChild(row);

    // EDITOR TAG INLINE
    const editor = document.createElement("div");
    editor.className = "tag-editor";
    editor.innerHTML = `
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

    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = editor.style.display === "block";
      editor.style.display = isOpen ? "none" : "block";
      if (!isOpen) editorController = setupTagEditor(editor, track.tags || []);
    });

    editor.querySelector(".tag-editor-save").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!editorController) return;

      const newTags = editorController.getTags();
      const { error } = await supabase.from("tracks").update({ tags: newTags }).eq("id", track.id);

      if (error) {
        console.error("Errore aggiornamento tag:", error);
        showToast("Errore nel salvataggio dei tag.");
        return;
      }

      track.tags = newTags;
      tagsBox.innerHTML = newTags.map((t) => `<span class="tag">${t}</span>`).join(" ");
      editor.style.display = "none";
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
    const newVal = !track.is_favorite;
    const { error } = await supabase.from("tracks").update({ is_favorite: newVal }).eq("id", track.id);
    if (error) {
      console.error(error);
      showToast("Errore nell'aggiornare i preferiti.");
      return;
    }
    track.is_favorite = newVal;
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

    if (track.id === nowPlayingId) {
      audioPlayer.pause();
      audioPlayer.removeAttribute("src");
      nowPlayingId = null;
      currentQueue = [];
      currentIndex = -1;
      currentTrackName.textContent = "Nessun brano in riproduzione";
      currentTrackArtist.textContent = "";
      currentCover.src = DEFAULT_COVER;
    }

    showToast("Brano eliminato.", "success");
    render();
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

  async function persistPlaylistOrder(playlistId, orderedTrackIds) {
    const results = await Promise.all(
      orderedTrackIds.map((trackId, index) =>
        supabase.from("playlist_tracks").update({ position: index }).eq("playlist_id", playlistId).eq("track_id", trackId)
      )
    );
    if (results.some((r) => r.error)) {
      showToast("Errore nel salvare il nuovo ordine della playlist.");
    }
  }

  function renderPlaylists() {
    playlistsList.innerHTML = "";

    if (!playlists.length) {
      emptyMessage.textContent = "Nessuna playlist creata.";
      emptyMessage.style.display = "block";
      return;
    }
    emptyMessage.style.display = "none";

    playlists.forEach((pl) => {
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
        if (tracks.length) play(tracks[0], tracks);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn";
      deleteBtn.textContent = "🗑";
      deleteBtn.title = "Elimina playlist";
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`Eliminare la playlist "${pl.name}"?`)) return;

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
      });

      actions.appendChild(playBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(name);
      row.appendChild(count);
      row.appendChild(actions);

      const detail = document.createElement("div");
      detail.className = "playlist-tracks";

      // riapre automaticamente la playlist che l'utente aveva già espanso,
      // così azioni come play/like/rimuovi non la richiudono di scatto
      if (expandedPlaylistId === pl.id) {
        populatePlaylistDetail(detail, pl, trackIds);
        detail.classList.add("open");
      }

      row.addEventListener("click", () => {
        const isOpen = expandedPlaylistId === pl.id;
        expandedPlaylistId = isOpen ? null : pl.id;
        render();
      });

      li.appendChild(row);
      li.appendChild(detail);
      playlistsList.appendChild(li);
    });
  }

  function populatePlaylistDetail(detail, pl, trackIds) {
    detail.innerHTML = "";
    const tracks = trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);

    if (!tracks.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nessun brano in questa playlist.";
      empty.style.cssText = "font-size:0.8rem;color:#9ca3af;";
      detail.appendChild(empty);
    } else {
      const ul = document.createElement("ul");
      ul.className = "tracks-list";
      tracks.forEach((t) => ul.appendChild(buildTrackItem(t, tracks, { playlistId: pl.id })));
      detail.appendChild(ul);
      attachDragReorder(ul, pl.id);
    }
  }

  /* ============================================================
     RIORDINO PLAYLIST (drag & drop)
  ============================================================ */
  function attachDragReorder(ul, playlistId) {
    ul.addEventListener("dragover", (e) => {
      e.preventDefault();
      const targetLi = e.target.closest(".track-item");
      ul.querySelectorAll(".track-item.drop-target").forEach((el) => el.classList.remove("drop-target"));
      if (targetLi && !targetLi.classList.contains("dragging")) targetLi.classList.add("drop-target");
    });

    ul.addEventListener("dragleave", (e) => {
      const targetLi = e.target.closest(".track-item");
      if (targetLi) targetLi.classList.remove("drop-target");
    });

    ul.addEventListener("drop", async (e) => {
      e.preventDefault();
      ul.querySelectorAll(".track-item.drop-target").forEach((el) => el.classList.remove("drop-target"));

      const draggedId = e.dataTransfer.getData("text/plain");
      const targetLi = e.target.closest(".track-item");
      if (!draggedId || !targetLi) return;

      const targetId = targetLi.dataset.trackId;
      if (targetId === draggedId) return;

      const ids = (playlistTracksMap[playlistId] || []).slice();
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return;

      ids.splice(from, 1);
      ids.splice(to, 0, draggedId);
      playlistTracksMap[playlistId] = ids;

      render();
      await persistPlaylistOrder(playlistId, ids);
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

    nowPlayingId = track.id;
    currentTrackName.textContent = track.title;
    currentTrackArtist.textContent = track.artist || "";
    currentCover.src = track.cover || DEFAULT_COVER;
    updateLikeCurrentBtn(track);
    updatePlayingHighlight();

    registerPlay(track);
  }

  function registerPlay(track) {
    track.play_count = (track.play_count || 0) + 1;
    track.last_played_at = new Date().toISOString();

    supabase
      .from("tracks")
      .update({ play_count: track.play_count, last_played_at: track.last_played_at })
      .eq("id", track.id)
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
    likeCurrentBtn.classList.toggle("liked", !!track.is_favorite);
    likeCurrentBtn.textContent = track.is_favorite ? "♥" : "🤍";
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
     COLLAPSABLE SECTIONS
  ============================================================ */
  document.querySelectorAll(".collapsible-title").forEach((title) => {
    title.addEventListener("click", () => {
      const targetId = title.dataset.target;
      const section = document.getElementById(targetId);
      if (!section) return;
      section.classList.toggle("collapsed");
    });
  });
}
