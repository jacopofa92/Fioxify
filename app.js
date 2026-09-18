/* ============================================================
   CONFIG SUPABASE
============================================================ */
const SUPABASE_URL = "https://ostajdhuaxrjrwroayja.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdGFqZGh1YXhyanJ3cm9heWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTcyOTQsImV4cCI6MjA5MjE3MzI5NH0.YVzjs5VDHfGC8taGvlGxJiXb8Bh-NnZY1TjNeSTuGsY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = "Fioxisongs";
const APP_VERSION = "1.10.0";

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
   ICONE DEL PLAYER
   Quelle che cambiano con lo stato (play/pausa, modalità ripeti,
   cuore) vanno sostituite da JS, quindi stanno qui; le fisse sono
   direttamente in app.html. Stesso stile della navigazione: 24x24,
   tratto arrotondato per le icone lineari, pieno per i comandi di
   trasporto, che così si leggono meglio a colpo d'occhio.
============================================================ */
const ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.78-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="4.5" width="3.6" height="15" rx="1.4"/><rect x="13.4" y="4.5" width="3.6" height="15" rx="1.4"/></svg>',
  repeat:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
  repeatOne:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>',
};

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
   LOADER A TUTTA PAGINA
   Viene nascosto solo quando si sa cosa mostrare: il form di login,
   oppure la libreria già pronta. Se resta visibile fino al redirect,
   il passaggio index.html -> app.html non si vede proprio.
============================================================ */
function hideAppLoader() {
  document.getElementById("app-loader")?.classList.add("is-hidden");
}

// rete di sicurezza: se il controllo sessione si pianta (rete assente,
// Supabase irraggiungibile) meglio mostrare la pagina che lasciare
// l'utente bloccato davanti a un loader che gira all'infinito
setTimeout(hideAppLoader, 8000);

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
// pathname.endsWith("/") copre anche i root path con sottocartella,
// es. GitHub Pages "project site" (jacopofa92.github.io/Fioxify/),
// dove il pathname è "/Fioxify/" e non "/" o "*/index.html"
const isAuthPage =
  window.location.pathname.endsWith("index.html") ||
  window.location.pathname.endsWith("/");
const isAppPage = window.location.pathname.endsWith("app.html");
const isResetPasswordPage = window.location.pathname.endsWith("reset-password.html");

const REMEMBERED_EMAIL_KEY = "fioxify_remembered_email";

/* legge lo stato di approvazione del profilo dell'utente correntemente
   autenticato; usato sia in fase di login sia nel controllo sessione
   di app.html per bloccare gli account non ancora approvati */
async function fetchOwnProfileStatus(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("status, is_admin")
    .eq("id", userId)
    .single();
  if (error) return { status: "pending", is_admin: false };
  return data;
}

/* ============================================================
   AUTH PAGE (se usi index.html)
============================================================ */
if (isAuthPage) {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const forgotForm = document.getElementById("forgot-form");

  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginRemember = document.getElementById("login-remember");
  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");
  const forgotPasswordLink = document.getElementById("forgot-password-link");

  const registerEmail = document.getElementById("register-email");
  const registerPassword = document.getElementById("register-password");
  const registerPasswordConfirm = document.getElementById("register-password-confirm");
  const registerBtn = document.getElementById("register-btn");
  const registerError = document.getElementById("register-error");

  const forgotEmail = document.getElementById("forgot-email");
  const forgotBtn = document.getElementById("forgot-btn");
  const forgotError = document.getElementById("forgot-error");
  const backToLoginLink = document.getElementById("back-to-login-link");

  function showView(name) {
    tabLogin.classList.toggle("active", name === "login");
    tabRegister.classList.toggle("active", name === "register");
    loginForm.classList.toggle("active", name === "login");
    registerForm.classList.toggle("active", name === "register");
    forgotForm.classList.toggle("active", name === "forgot");
    document.getElementById("auth-tabs").hidden = name === "forgot";
  }

  tabLogin?.addEventListener("click", () => showView("login"));
  tabRegister?.addEventListener("click", () => showView("register"));
  forgotPasswordLink?.addEventListener("click", () => showView("forgot"));
  backToLoginLink?.addEventListener("click", () => showView("login"));

  // precompila l'email se l'utente aveva scelto di ricordarla
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
  if (rememberedEmail) {
    loginEmail.value = rememberedEmail;
    loginRemember.checked = true;
  }

  // messaggio mostrato se si arriva qui perché l'account non è (più) approvato
  const blockedReason = new URLSearchParams(window.location.search).get("blocked");
  if (blockedReason === "pending") {
    loginError.textContent = "Il tuo account è in attesa di approvazione da parte di un amministratore.";
  } else if (blockedReason === "rejected") {
    loginError.textContent = "La tua registrazione non è stata approvata.";
  }

  // disabilita il bottone e mostra uno spinner + testo di caricamento
  // durante le chiamate async, così login/registrazione/recupero non
  // sembrano "non aver fatto nulla" mentre aspettano Supabase
  function setButtonLoading(btn, loading, loadingText) {
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${loadingText}`;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }

  // <form>: il submit scatta sia col click sul bottone sia con Invio
  // da dentro un input, senza bisogno di gestirlo a mano per ciascuno
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (!email || !password) {
      loginError.textContent = "Inserisci email e password.";
      return;
    }

    setButtonLoading(loginBtn, true, "Accesso in corso...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setButtonLoading(loginBtn, false);
      loginError.textContent = error.message || "Errore di login.";
      return;
    }

    const profile = await fetchOwnProfileStatus(data.user.id);
    if (!profile.is_admin && profile.status !== "approved") {
      await supabase.auth.signOut();
      setButtonLoading(loginBtn, false);
      loginError.textContent =
        profile.status === "rejected"
          ? "La tua registrazione non è stata approvata."
          : "Il tuo account è in attesa di approvazione da parte di un amministratore.";
      return;
    }

    if (loginRemember.checked) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

    window.location.href = "app.html";
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerError.textContent = "";
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    const passwordConfirm = registerPasswordConfirm.value.trim();

    if (!email || !password || !passwordConfirm) {
      registerError.textContent = "Compila tutti i campi.";
      return;
    }
    if (password.length < 6) {
      registerError.textContent = "La password deve avere almeno 6 caratteri.";
      return;
    }
    if (password !== passwordConfirm) {
      registerError.textContent = "Le password non coincidono.";
      return;
    }

    setButtonLoading(registerBtn, true, "Verifica in corso...");

    const { data: existingStatus } = await supabase.rpc("check_registration_email", {
      check_email: email,
    });
    if (existingStatus) {
      setButtonLoading(registerBtn, false);
      registerError.textContent =
        existingStatus === "pending"
          ? "Esiste già una registrazione in attesa di approvazione con questa email."
          : existingStatus === "approved"
            ? "Esiste già un account con questa email. Prova ad accedere o usa \"Password dimenticata?\"."
            : "La registrazione con questa email non è stata approvata. Contatta l'amministratore.";
      return;
    }

    setButtonLoading(registerBtn, true, "Creazione account...");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL("index.html", window.location.href).toString(),
      },
    });
    if (error) {
      setButtonLoading(registerBtn, false);
      registerError.textContent = error.message || "Errore di registrazione.";
      return;
    }

    // niente sessione "pending" in giro: la registrazione richiede
    // l'approvazione di un admin prima di poter accedere
    await supabase.auth.signOut();

    setButtonLoading(registerBtn, false);
    registerForm.querySelectorAll("input").forEach((input) => (input.value = ""));
    registerError.style.color = "var(--success)";
    registerError.textContent =
      "Registrazione inviata! Il tuo account è in attesa di approvazione da parte di un amministratore.";
  });

  forgotForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    forgotError.textContent = "";
    const email = forgotEmail.value.trim();
    if (!email) {
      forgotError.textContent = "Inserisci la tua email.";
      return;
    }

    setButtonLoading(forgotBtn, true, "Invio in corso...");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("reset-password.html", window.location.href).toString(),
    });

    setButtonLoading(forgotBtn, false);

    if (error) {
      forgotError.textContent = error.message || "Errore durante l'invio dell'email.";
      return;
    }

    forgotError.style.color = "var(--success)";
    forgotError.textContent = "Se l'email è registrata, riceverai a breve un link per reimpostare la password.";
  });

  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      hideAppLoader();
      return;
    }
    const profile = await fetchOwnProfileStatus(data.session.user.id);
    if (profile.is_admin || profile.status === "approved") {
      // niente hideAppLoader: il loader deve restare finché la pagina
      // non cambia, altrimenti si rivede il form di login per un istante
      window.location.href = "app.html";
    } else {
      await supabase.auth.signOut();
      hideAppLoader();
    }
  })();
}

/* ============================================================
   RESET PASSWORD PAGE (reset-password.html, aperta dal link
   ricevuto via email dopo "Password dimenticata?")
============================================================ */
if (isResetPasswordPage) {
  const hint = document.getElementById("reset-password-hint");
  const newPasswordInput = document.getElementById("reset-password-new");
  const confirmPasswordInput = document.getElementById("reset-password-confirm");
  const submitBtn = document.getElementById("reset-password-btn");
  const errorEl = document.getElementById("reset-password-error");
  const backLink = document.getElementById("reset-password-back-link");

  backLink?.addEventListener("click", () => (window.location.href = "index.html"));

  function unlockForm() {
    hint.textContent = "Scegli una nuova password per il tuo account.";
    newPasswordInput.disabled = false;
    confirmPasswordInput.disabled = false;
    submitBtn.disabled = false;
  }

  // il link di recupero autentica temporaneamente l'utente e Supabase
  // emette l'evento PASSWORD_RECOVERY: solo a quel punto sblocchiamo il form
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") unlockForm();
  });

  // se il link ha già una sessione di recupero valida al caricamento
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) unlockForm();
    else {
      setTimeout(async () => {
        const { data: retry } = await supabase.auth.getSession();
        if (retry.session) unlockForm();
        else hint.textContent = "Link di recupero non valido o scaduto. Richiedine uno nuovo dal login.";
      }, 2000);
    }
  })();

  submitBtn?.addEventListener("click", async () => {
    errorEl.textContent = "";
    const password = newPasswordInput.value.trim();
    const passwordConfirm = confirmPasswordInput.value.trim();

    if (password.length < 6) {
      errorEl.textContent = "La password deve avere almeno 6 caratteri.";
      return;
    }
    if (password !== passwordConfirm) {
      errorEl.textContent = "Le password non coincidono.";
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      errorEl.textContent = error.message || "Errore durante l'aggiornamento della password.";
      return;
    }

    await supabase.auth.signOut();
    hint.textContent = "Password aggiornata! Ora puoi accedere con la nuova password.";
    newPasswordInput.hidden = true;
    confirmPasswordInput.hidden = true;
    submitBtn.hidden = true;
    setTimeout(() => (window.location.href = "index.html"), 1800);
  });
}

/* ============================================================
   APP PAGE
============================================================ */
if (isAppPage) {
  const userEmailSpan = document.getElementById("user-email");
  const logoutBtn = document.getElementById("logout-btn");
  const exitBtn = document.getElementById("exit-btn");
  const changePasswordBtn = document.getElementById("change-password-btn");
  const accountMenu = document.querySelector(".account-menu");
  const accountMenuBtn = document.getElementById("account-menu-btn");
  const accountMenuDropdown = document.getElementById("account-menu-dropdown");
  const adminNavTab = document.getElementById("admin-nav-tab");
  const adminNavTabMobile = document.getElementById("admin-nav-tab-mobile");
  const adminPendingBadge = document.getElementById("admin-pending-badge");
  const adminPendingList = document.getElementById("admin-pending-list");
  const adminPendingEmpty = document.getElementById("admin-pending-empty");
  const adminUsersList = document.getElementById("admin-users-list");
  const statTotalTracks = document.getElementById("stat-total-tracks");
  const statTotalPlays = document.getElementById("stat-total-plays");
  const statTotalUsers = document.getElementById("stat-total-users");
  const statTopTracks = document.getElementById("stat-top-tracks");
  const statTopUploaders = document.getElementById("stat-top-uploaders");
  const statPlaysChart = document.getElementById("stat-plays-chart");
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadStatus = document.getElementById("upload-status");
  const tracksList = document.getElementById("tracks-list");
  const tracksSkeleton = document.getElementById("tracks-skeleton");
  const emptyMessage = document.getElementById("empty-message");
  const audioPlayer = document.getElementById("audio-player");
  const currentTrackName = document.getElementById("current-track-name");
  const currentTrackArtist = document.getElementById("current-track-artist");
  const currentCover = document.getElementById("current-cover");

  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const newPlaylistName = document.getElementById("new-playlist-name");
  const newPlaylistBtn = document.getElementById("new-playlist-btn");
  const playlistsList = document.getElementById("playlists-list");
  const playlistsSearchInput = document.getElementById("playlists-search-input");
  const playlistsEmptyMessage = document.getElementById("playlists-empty-message");
  const smartPlaylistsPanel = document.getElementById("smart-playlists-panel");
  const smartPlaylistsList = document.getElementById("smart-playlists-list");
  const newAlbumName = document.getElementById("new-album-name");
  const newAlbumBtn = document.getElementById("new-album-btn");
  const albumsList = document.getElementById("albums-list");
  const albumsSearchInput = document.getElementById("albums-search-input");
  const albumsEmptyMessage = document.getElementById("albums-empty-message");
  const groupsPanel = document.getElementById("groups-panel");
  const groupsList = document.getElementById("groups-list");
  const uploadDropzone = document.getElementById("upload-dropzone");

  const selectModeBtn = document.getElementById("select-mode-btn");
  const bulkBar = document.getElementById("bulk-bar");
  const bulkCount = document.getElementById("bulk-count");
  const bulkAddPlaylistBtn = document.getElementById("bulk-add-playlist-btn");
  const bulkPlaylistMenu = document.getElementById("bulk-playlist-menu");
  const bulkAddAlbumBtn = document.getElementById("bulk-add-album-btn");
  const bulkAlbumMenu = document.getElementById("bulk-album-menu");
  const bulkTagBtn = document.getElementById("bulk-tag-btn");
  const bulkDeleteBtn = document.getElementById("bulk-delete-btn");
  const bulkCancelBtn = document.getElementById("bulk-cancel-btn");
  const bulkTagRow = document.getElementById("bulk-tag-row");
  const bulkTagInput = document.getElementById("bulk-tag-input");
  const bulkTagApplyBtn = document.getElementById("bulk-tag-apply-btn");

  const shuffleBtn = document.getElementById("shuffle-btn");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const repeatBtn = document.getElementById("repeat-btn");
  const likeCurrentBtn = document.getElementById("like-current-btn");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const seekBar = document.getElementById("seek-bar");
  const currentTimeLabel = document.getElementById("current-time");
  const durationLabel = document.getElementById("duration-time");
  const waveformCanvas = document.getElementById("waveform-canvas");
  const waveformCtx = waveformCanvas?.getContext("2d");
  const audioVisualizerCanvas = document.getElementById("audio-visualizer");
  const audioVisualizerCtx = audioVisualizerCanvas?.getContext("2d");

  const miniPlayer = document.getElementById("mini-player");
  const miniCover = document.getElementById("mini-cover");
  const miniTrackName = document.getElementById("mini-track-name");
  const miniTrackArtist = document.getElementById("mini-track-artist");
  const miniPlayPauseBtn = document.getElementById("mini-play-pause-btn");
  const miniProgressFill = document.getElementById("mini-progress-fill");
  const fullPlayer = document.getElementById("full-player");
  const fullPlayerBackdrop = document.getElementById("full-player-backdrop");
  const collapsePlayerBtn = document.getElementById("collapse-player-btn");
  const trackReactionsEl = document.getElementById("track-reactions");

  /* STATE */
  let currentUser = null;
  let isAdmin = false;
  let allTracks = [];
  let profilesById = {}; // userId -> { email }
  let playlists = [];
  let playlistTracksMap = {}; // playlistId -> [trackId, ...]
  let albums = [];
  let albumTracksMap = {}; // albumId -> [trackId, ...]
  let favoriteTrackIds = new Set(); // preferiti PERSONALI dell'utente loggato
  let userPlayStats = {}; // trackId -> { count, lastPlayedAt } PERSONALI dell'utente loggato
  let reactionCountsByTrack = {}; // trackId -> { emoji: count } di TUTTI gli utenti
  let myReactionsByTrack = {}; // trackId -> Set(emoji) SOLO dell'utente loggato
  const REACTION_EMOJIS = ["🔥", "❤️", "😂", "👏", "🤯"];
  let currentView = "library"; // "library" | "favorites" | "history" | "artists" (sotto-viste della pagina Libreria)
  let searchTerm = "";
  let albumSearchTerm = "";
  let playlistSearchTerm = "";
  let sortBy = "date"; // "date" | "title" | "artist" | "plays"

  let currentQueue = [];
  let currentIndex = -1;
  let nowPlayingId = null;

  /* Signed URL dei brani: createSignedUrl genera un token diverso ogni
     volta. Il riuso qui serve solo a evitare chiamate inutili all'API di
     Supabase entro la validità del link; la cache vera e propria
     dell'audio (che evita di riscaricare i byte) è quella sotto,
     indicizzata su storage_path invece che sull'URL firmato. */
  const signedUrlCache = new Map(); // storage_path -> { url, expiresAt }
  const SIGNED_URL_TTL_SECONDS = 3600;
  const SIGNED_URL_REFRESH_MARGIN_SECONDS = 120;

  async function getTrackAudioUrl(storagePath) {
    const cached = signedUrlCache.get(storagePath);
    if (cached && cached.expiresAt > Date.now()) return cached.url;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      console.error(error);
      return null;
    }

    signedUrlCache.set(storagePath, {
      url: data.signedUrl,
      expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - SIGNED_URL_REFRESH_MARGIN_SECONDS) * 1000,
    });
    return data.signedUrl;
  }

  /* Cache audio persistente lato pagina: le richieste che il tag <audio>
     genera da solo (per src/seek) non passano in modo affidabile dal
     Service Worker in tutti i browser (su Safari, in particolare,
     saltano il fetch handler del SW). Scaricando qui con fetch() e
     mettendo in Cache API teniamo il file per storage_path (stabile,
     a differenza del signed URL che cambia token ogni volta) e lo
     riproduciamo da un blob locale: niente nuova richiesta di rete
     per un brano già ascoltato, indipendentemente dal browser. */
  const AUDIO_CACHE_NAME = "fioxify-audio-v1";
  let currentObjectUrl = null;

  async function getTrackAudioBlob(storagePath, signedUrl) {
    if (!("caches" in window)) {
      const response = await fetch(signedUrl);
      return response.blob();
    }

    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cached = await cache.match(storagePath);
    if (cached) return cached.blob();

    const response = await fetch(signedUrl);
    if (response.ok) await cache.put(storagePath, response.clone());
    return response.blob();
  }

  let shuffleOn = false;
  let repeatMode = "none"; // "none" | "all" | "one"
  let expandedPlaylistId = null;
  let expandedAlbumId = null;
  let expandedGroupKey = null;

  let selectionMode = false;
  let selectedTrackIds = new Set();

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

    const profile = await fetchOwnProfileStatus(currentUser.id);
    if (!profile.is_admin && profile.status !== "approved") {
      await supabase.auth.signOut();
      window.location.href = `index.html?blocked=${profile.status === "rejected" ? "rejected" : "pending"}`;
      return;
    }

    isAdmin = !!profile.is_admin;
    userEmailSpan.textContent = currentUser.email || "Utente";

    if (isAdmin) {
      adminNavTab.hidden = false;
      adminNavTabMobile.hidden = false;
      await refreshAdminPendingBadge();
    }

    await loadData();
    // solo ora la libreria è piena: nascondere prima farebbe vedere
    // l'app montarsi a pezzi
    hideAppLoader();
    subscribeToRealtimeUpdates();
    registerMediaSessionActions();
  })();

  /* ============================================================
     CAMBIO PASSWORD (riusa il flusso nativo "recupero password":
     invia all'utente loggato un'email con il link per impostarne
     una nuova, senza bisogno di un provider email esterno)
  ============================================================ */
  changePasswordBtn?.addEventListener("click", async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: new URL("reset-password.html", window.location.href).toString(),
    });
    if (error) {
      showToast(error.message || "Errore durante l'invio dell'email.", "error");
      return;
    }
    showToast("Ti abbiamo inviato un'email per impostare la nuova password.", "success");
  });

  /* ============================================================
     ADMIN: approvazione nuove registrazioni
  ============================================================ */
  async function refreshAdminPendingBadge() {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    const n = count || 0;
    adminPendingBadge.hidden = n === 0;
    adminPendingBadge.textContent = String(n);
  }

  async function setProfileStatus(userId, status) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
    if (error) {
      showToast(error.message || "Operazione non riuscita.", "error");
      return false;
    }
    return true;
  }

  function renderAdminUserRow(profile, { showActions }) {
    const li = document.createElement("li");
    li.className = "playlist-item";

    const row = document.createElement("div");
    row.className = "playlist-item-row";

    const email = document.createElement("span");
    email.className = "admin-user-email";
    email.textContent = profile.email;
    row.appendChild(email);

    const pill = document.createElement("span");
    pill.className = `admin-status-pill status-${profile.status}`;
    pill.textContent = profile.status === "approved" ? "Approvato" : profile.status === "rejected" ? "Rifiutato" : "In attesa";
    row.appendChild(pill);

    if (showActions) {
      const actions = document.createElement("div");
      actions.className = "playlist-actions";

      const approveBtn = document.createElement("button");
      approveBtn.className = "icon-btn";
      approveBtn.textContent = "✓ Approva";
      approveBtn.addEventListener("click", async () => {
        if (await setProfileStatus(profile.id, "approved")) {
          showToast(`${profile.email} è stato approvato.`, "success");
          await renderAdmin();
        }
      });

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "icon-btn";
      rejectBtn.textContent = "✕ Rifiuta";
      rejectBtn.addEventListener("click", async () => {
        if (await setProfileStatus(profile.id, "rejected")) {
          showToast(`${profile.email} è stato rifiutato.`, "success");
          await renderAdmin();
        }
      });

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);
      row.appendChild(actions);
    }

    li.appendChild(row);
    return li;
  }

  async function renderAdmin() {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, status, is_admin, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      showToast(error.message || "Impossibile caricare gli utenti.", "error");
      return;
    }

    const pending = data.filter((p) => p.status === "pending");
    const others = data.filter((p) => p.status !== "pending");

    adminPendingList.innerHTML = "";
    pending.forEach((p) => adminPendingList.appendChild(renderAdminUserRow(p, { showActions: true })));
    adminPendingEmpty.textContent = pending.length === 0 ? "Nessuna richiesta in attesa." : "";

    adminUsersList.innerHTML = "";
    others.forEach((p) => adminUsersList.appendChild(renderAdminUserRow(p, { showActions: false })));

    await refreshAdminPendingBadge();
    await loadAdminStats();
  }

  /* ============================================================
     ADMIN: dashboard statistiche
     track_plays ha RLS che limita la select alle proprie righe:
     l'aggregazione su tutti gli utenti passa dalla RPC
     admin_get_stats(), che fa lei stessa il check is_admin invece
     di affidarsi alla RLS (security definer).
  ============================================================ */
  async function loadAdminStats() {
    if (!isAdmin || !statTotalTracks) return;
    const { data, error } = await supabase.rpc("admin_get_stats");
    if (error) {
      console.error(error);
      return;
    }

    statTotalTracks.textContent = data.total_tracks ?? "–";
    statTotalPlays.textContent = data.total_plays ?? "–";
    statTotalUsers.textContent = data.total_users ?? "–";

    renderStatList(statTopTracks, data.top_tracks, (row) => ({
      name: row.artist ? `${row.title} — ${row.artist}` : row.title,
      value: `${row.play_count} ▶`,
    }));

    renderStatList(statTopUploaders, data.top_uploaders, (row) => ({
      name: row.email,
      value: `${row.track_count} brani`,
    }));

    renderStatBarChart(data.plays_last_30_days || []);
  }

  function renderStatList(listEl, rows, mapRow) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!rows || !rows.length) {
      const li = document.createElement("li");
      li.className = "stat-empty";
      li.textContent = "Ancora nessun dato.";
      listEl.appendChild(li);
      return;
    }
    rows.forEach((row) => {
      const { name, value } = mapRow(row);
      const li = document.createElement("li");
      const nameSpan = document.createElement("span");
      nameSpan.className = "stat-list-name";
      nameSpan.textContent = name;
      const valueSpan = document.createElement("span");
      valueSpan.className = "stat-list-value";
      valueSpan.textContent = value;
      li.appendChild(nameSpan);
      li.appendChild(valueSpan);
      listEl.appendChild(li);
    });
  }

  function renderStatBarChart(days) {
    if (!statPlaysChart) return;
    statPlaysChart.innerHTML = "";
    if (!days.length) {
      statPlaysChart.innerHTML = '<p class="stat-empty">Ancora nessun ascolto negli ultimi 30 giorni.</p>';
      return;
    }
    const maxPlays = Math.max(...days.map((d) => d.plays), 1);
    days.forEach((d) => {
      const bar = document.createElement("div");
      bar.className = "stat-bar";
      bar.style.height = `${Math.max((d.plays / maxPlays) * 100, 4)}%`;
      bar.title = `${d.day}: ${d.plays} ascolti`;
      statPlaysChart.appendChild(bar);
    });
  }

  /* ============================================================
     AGGIORNAMENTO IN TEMPO REALE (libreria condivisa)
     Quando un altro utente carica/modifica/elimina un brano, una
     playlist o un album, la vista si aggiorna da sola senza dover
     ricaricare la pagina.
  ============================================================ */
  function notifyNewTrack(track) {
    if (!track) return;
    if (track.user_id === currentUser.id) return; // chi carica sa già di averlo fatto
    if (track.is_private) return;

    const who = profilesById[track.user_id]?.email || "Qualcuno";
    showToast(`${who} ha aggiunto "${track.title}"`, "success");
  }

  function subscribeToRealtimeUpdates() {
    let refreshTimer = null;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadData(), 600);
    };

    const tables = ["tracks", "playlists", "playlist_tracks", "albums", "album_tracks", "track_reactions"];
    let channel = supabase.channel("fioxify-shared-library");
    tables.forEach((table) => {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    });

    // avviso immediato quando un altro utente pubblica un brano: il refresh
    // della libreria arriva comunque poco dopo, ma la notifica non deve
    // aspettarlo. Le righe di brani privati altrui non arrivano nemmeno,
    // perché il realtime applica le stesse policy RLS della select.
    channel = channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tracks" },
      (payload) => notifyNewTrack(payload.new)
    );

    channel.subscribe();
  }

  /* MENU ACCOUNT (tendina con Cambia password / Esci / Logout) */
  function closeAccountMenu() {
    accountMenuDropdown.hidden = true;
    accountMenu?.classList.remove("open");
    accountMenuBtn?.setAttribute("aria-expanded", "false");
  }

  accountMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = accountMenuDropdown.hidden;
    if (willOpen) {
      accountMenuDropdown.hidden = false;
      accountMenu?.classList.add("open");
      accountMenuBtn.setAttribute("aria-expanded", "true");
    } else {
      closeAccountMenu();
    }
  });

  accountMenuDropdown?.addEventListener("click", (e) => {
    if (e.target.closest(".account-menu-item")) closeAccountMenu();
  });

  document.addEventListener("click", (e) => {
    if (!accountMenuDropdown.hidden && !accountMenu.contains(e.target)) closeAccountMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !accountMenuDropdown.hidden) closeAccountMenu();
  });

  /* LOGOUT */
  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  /* ESCI (interrompe l'audio ed esce dall'app, senza fare logout) */
  exitBtn?.addEventListener("click", () => {
    audioPlayer.pause();

    // Dentro l'APK (guscio Capacitor) il bridge nativo è disponibile anche
    // caricando il sito remoto, e l'app si può chiudere davvero. Nel browser
    // invece window.close() è consentita solo sulle finestre aperte da script:
    // se dopo il tentativo la pagina è ancora lì, spieghiamo come uscire.
    const capApp = window.Capacitor?.Plugins?.App;
    if (capApp?.exitApp) {
      capApp.exitApp();
      return;
    }
    if (navigator.app?.exitApp) {
      navigator.app.exitApp();
      return;
    }

    window.close();
    setTimeout(() => {
      if (!document.hidden) {
        showToast('Chiudi la scheda o l\'app dal tuo dispositivo per uscire.');
      }
    }, 300);
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
          // il titolo resta sempre quello del nome file (es. Suno spesso
          // scrive lo stesso tag ID3 "title" su più varianti dello stesso
          // brano, il che le farebbe passare per duplicati)
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
      const reason = `"${title}" (${file.name}): esiste già un brano con lo stesso nome.`;
      showToast(reason);
      return { ok: false, reason };
    }

    const ext = file.name.split(".").pop();
    const fileName = `${slugify(title)}-${Date.now()}.${ext}`;
    const audioPath = `${currentUser.id}/${fileName}`;

    // audio immutabile una volta caricato (path univoco per file): cache lunga lato browser/CDN
    const { error: audioErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(audioPath, file, { cacheControl: "31536000" });
    if (audioErr) {
      console.error(audioErr);
      const reason = `"${file.name}": errore di caricamento (${audioErr.message || audioErr}).`;
      showToast(`Errore durante il caricamento di "${file.name}".`);
      return { ok: false, reason };
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
      const reason = `"${title}" (${file.name}): errore nel salvataggio metadata (${dbErr.message || dbErr}).`;
      showToast(`Errore nel salvataggio dei metadata di "${title}".`);
      return { ok: false, reason };
    }

    existingTitles.add(normalizedTitle(title));
    return { ok: true };
  }

  async function uploadFiles(files) {
    if (!files.length) return;

    const existingTitles = new Set(allTracks.map((t) => normalizedTitle(t.title)));
    let successCount = 0;
    const failures = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadStatus.textContent =
        files.length > 1 ? `Caricamento ${i + 1}/${files.length}: ${file.name}` : `Caricamento di "${file.name}"...`;
      const result = await uploadSingleFile(file, existingTitles);
      if (result.ok) successCount++;
      else failures.push(result.reason);
    }

    fileInput.value = "";
    currentTags = [];
    renderUploadTags();

    const failCount = files.length - successCount;
    if (failures.length) console.warn("[upload] brani non caricati:\n" + failures.join("\n"));

    if (successCount > 0) {
      uploadStatus.textContent =
        failCount > 0
          ? `${successCount} caricati, ${failCount} non caricati. Motivi in console (F12).`
          : `${successCount} brano/i caricato/i!`;
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
      // il drag & drop dal file explorer (a differenza di <input type="file">)
      // spesso non valorizza file.type per l'audio: si usa anche l'estensione come fallback
      const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm|wma)$/i;
      const rawFiles = Array.from(e.dataTransfer.files || []);
      console.log(
        "[drop debug]",
        rawFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }))
      );
      const files = rawFiles.filter((f) => f.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(f.name));
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
  // loadData parte sia all'avvio sia ad ogni evento realtime sulla libreria
  // condivisa (debounced): se una chiamata più vecchia risponde dopo che
  // un'azione locale (es. deleteTrack) ha già aggiornato lo stato, la
  // risposta stale lo sovrascriverebbe riportando indietro dati già
  // cancellati/modificati. loadDataToken scarta le risposte fuori ordine.
  let loadDataToken = 0;
  async function loadData() {
    const requestToken = ++loadDataToken;
    const [
      { data: trackRows, error: trackErr },
      { data: playlistRows },
      { data: ptRows },
      { data: albumRows },
      { data: atRows },
      { data: profileRows },
      { data: favoriteRows },
      { data: playRows },
      { data: reactionRows },
    ] = await Promise.all([
      supabase.from("tracks").select("*").order("created_at", { ascending: false }),
      supabase.from("playlists").select("*").order("created_at", { ascending: false }),
      supabase.from("playlist_tracks").select("*").order("position", { ascending: true }),
      supabase.from("albums").select("*").order("created_at", { ascending: false }),
      supabase.from("album_tracks").select("*").order("position", { ascending: true }),
      supabase.rpc("list_profile_emails"),
      supabase.from("track_favorites").select("track_id").eq("user_id", currentUser.id),
      supabase.from("track_plays").select("track_id, played_at").eq("user_id", currentUser.id),
      supabase.from("track_reactions").select("track_id, user_id, emoji"),
    ]);

    if (trackErr) {
      console.error(trackErr);
      showToast("Errore nel caricamento della libreria.");
    }

    if (requestToken !== loadDataToken) return; // superata da una loadData() più recente

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

    reactionCountsByTrack = {};
    myReactionsByTrack = {};
    (reactionRows || []).forEach((row) => {
      const counts = reactionCountsByTrack[row.track_id] || {};
      counts[row.emoji] = (counts[row.emoji] || 0) + 1;
      reactionCountsByTrack[row.track_id] = counts;
      if (row.user_id === currentUser.id) {
        if (!myReactionsByTrack[row.track_id]) myReactionsByTrack[row.track_id] = new Set();
        myReactionsByTrack[row.track_id].add(row.emoji);
      }
    });
    if (nowPlayingId) renderTrackReactions(nowPlayingId);

    // libreria, album e playlist sono ora sezioni indipendenti (non più
    // sotto-viste esclusive), quindi vanno tenute fresche tutte insieme
    render();
    renderPlaylists();
    renderAlbums();

    // skeleton solo per il primissimo caricamento: una volta arrivati i
    // dati reali (anche vuoti) non serve più, questa chiamata dopo un
    // hide precedente è un no-op innocuo
    if (tracksSkeleton) tracksSkeleton.hidden = true;
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

  albumsSearchInput?.addEventListener("input", () => {
    albumSearchTerm = albumsSearchInput.value;
    renderAlbums();
  });

  playlistsSearchInput?.addEventListener("input", () => {
    playlistSearchTerm = playlistsSearchInput.value;
    renderPlaylists();
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

    const isGroupedView = currentView === "artists";
    const isListView = !isGroupedView;

    groupsPanel.style.display = isGroupedView ? "block" : "none";
    tracksList.style.display = isListView ? "block" : "none";
    sortSelect.style.display = isListView ? "" : "none";
    selectModeBtn.style.display = isListView ? "" : "none";

    // la selezione multipla ha senso solo nella lista brani semplice:
    // uscendo verso artisti la si chiude automaticamente
    if (!isListView && selectionMode) {
      selectionMode = false;
      selectedTrackIds.clear();
      selectModeBtn.classList.remove("active");
      bulkBar.hidden = true;
      bulkTagRow.hidden = true;
    }

    searchInput.placeholder = isGroupedView ? "Cerca per artista..." : "Cerca per titolo, artista o tag...";

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
      tracksList.appendChild(buildTrackItem(track, list, { selectable: selectionMode }));
    });
  }

  /* ============================================================
     AZIONI MULTIPLE (selezione di più brani)
  ============================================================ */
  function updateBulkBar() {
    const count = selectedTrackIds.size;
    bulkCount.textContent = count === 1 ? "1 selezionato" : `${count} selezionati`;

    const selectedTracks = [...selectedTrackIds].map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);
    const hasOwned = selectedTracks.some((t) => isOwner(t));

    bulkAddPlaylistBtn.disabled = count === 0;
    bulkAddAlbumBtn.disabled = count === 0;
    bulkTagBtn.disabled = !hasOwned;
    bulkDeleteBtn.disabled = !hasOwned;
  }

  selectModeBtn?.addEventListener("click", () => {
    selectionMode = !selectionMode;
    if (!selectionMode) selectedTrackIds.clear();
    selectModeBtn.classList.toggle("active", selectionMode);
    bulkBar.hidden = !selectionMode;
    if (!selectionMode) bulkTagRow.hidden = true;
    updateBulkBar();
    render();
  });

  bulkCancelBtn?.addEventListener("click", () => {
    selectionMode = false;
    selectedTrackIds.clear();
    selectModeBtn.classList.remove("active");
    bulkBar.hidden = true;
    bulkTagRow.hidden = true;
    render();
  });

  function populateBulkMenu(menuEl, collection, addFn) {
    menuEl.innerHTML = "";
    if (!collection.length) {
      const empty = document.createElement("span");
      empty.textContent = "Nessuna disponibile";
      empty.style.cssText = "display:block;padding:6px 8px;color:var(--text-secondary);font-size:0.75rem;";
      menuEl.appendChild(empty);
      return;
    }
    collection.forEach((c) => {
      const item = document.createElement("button");
      item.textContent = c.name;
      item.addEventListener("click", async (e) => {
        e.stopPropagation();
        menuEl.classList.remove("open");
        const ids = [...selectedTrackIds];
        await Promise.all(ids.map((trackId) => addFn(trackId, c.id, { silent: true })));
        showToast(`Aggiunti ${ids.length} brani a "${c.name}".`, "success");
        render();
      });
      menuEl.appendChild(item);
    });
  }

  bulkAddPlaylistBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (bulkAddPlaylistBtn.disabled) return;
    document.querySelectorAll(".add-to-playlist-menu.open").forEach((m) => {
      if (m !== bulkPlaylistMenu) m.classList.remove("open");
    });
    populateBulkMenu(bulkPlaylistMenu, playlists.filter((p) => isOwner(p)), addTrackToPlaylist);
    bulkPlaylistMenu.classList.toggle("open");
  });

  bulkAddAlbumBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (bulkAddAlbumBtn.disabled) return;
    document.querySelectorAll(".add-to-playlist-menu.open").forEach((m) => {
      if (m !== bulkAlbumMenu) m.classList.remove("open");
    });
    populateBulkMenu(bulkAlbumMenu, albums.filter((a) => isOwner(a)), addTrackToAlbum);
    bulkAlbumMenu.classList.toggle("open");
  });

  bulkTagBtn?.addEventListener("click", () => {
    if (bulkTagBtn.disabled) return;
    bulkTagRow.hidden = !bulkTagRow.hidden;
    if (!bulkTagRow.hidden) bulkTagInput.focus();
  });

  bulkTagApplyBtn?.addEventListener("click", async () => {
    const newTag = bulkTagInput.value.trim();
    if (!newTag) return;

    const ownedSelected = [...selectedTrackIds]
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t) => t && isOwner(t) && !(t.tags || []).includes(newTag));

    if (!ownedSelected.length) {
      showToast("Nessun brano da aggiornare (tag già presente o nessun brano di tua proprietà selezionato).");
      return;
    }

    const results = await Promise.all(
      ownedSelected.map((t) => {
        const newTags = [...(t.tags || []), newTag];
        return supabase.from("tracks").update({ tags: newTags }).eq("id", t.id).then(({ error }) => {
          if (!error) t.tags = newTags;
          return error;
        });
      })
    );

    const failCount = results.filter(Boolean).length;
    if (failCount) showToast(`Tag aggiunto a ${ownedSelected.length - failCount} brani, ${failCount} falliti.`);
    else showToast(`Tag "${newTag}" aggiunto a ${ownedSelected.length} brani.`, "success");

    bulkTagInput.value = "";
    bulkTagRow.hidden = true;
    render();
  });

  bulkDeleteBtn?.addEventListener("click", () => {
    if (bulkDeleteBtn.disabled) return;
    const ownedSelected = [...selectedTrackIds].map((id) => allTracks.find((t) => t.id === id)).filter((t) => t && isOwner(t));
    if (!ownedSelected.length) return;

    confirmDelete({
      title: `Eliminare ${ownedSelected.length} brani?`,
      message: "I brani selezionati verranno rimossi definitivamente dallo storage e dalla libreria: non si può annullare.",
      onConfirm: async () => {
        for (const t of ownedSelected) {
          await deleteTrack(t, { silent: true });
        }
        showToast(`${ownedSelected.length} brani eliminati.`, "success");
        selectedTrackIds.clear();
        selectionMode = false;
        selectModeBtn.classList.remove("active");
        bulkBar.hidden = true;
        render();
      },
    });
  });

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
    if (opts.selectable && selectedTrackIds.has(track.id)) li.classList.add("selected");
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

    let selectCheckbox = null;
    if (opts.selectable) {
      selectCheckbox = document.createElement("input");
      selectCheckbox.type = "checkbox";
      selectCheckbox.className = "track-select-checkbox";
      selectCheckbox.checked = selectedTrackIds.has(track.id);
      selectCheckbox.addEventListener("click", (e) => e.stopPropagation());
      selectCheckbox.addEventListener("change", () => {
        if (selectCheckbox.checked) selectedTrackIds.add(track.id);
        else selectedTrackIds.delete(track.id);
        li.classList.toggle("selected", selectCheckbox.checked);
        updateBulkBar();
      });
      row.appendChild(selectCheckbox);
    }

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

    // CLICK PLAY (solo sul li, non sui pulsanti) — in modalità selezione,
    // il click seleziona/deseleziona invece di riprodurre
    li.addEventListener("click", () => {
      if (opts.selectable && selectCheckbox) {
        selectCheckbox.checked = !selectCheckbox.checked;
        selectCheckbox.dispatchEvent(new Event("change"));
        return;
      }
      play(track, queueList);
    });

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
  async function deleteTrack(track, opts = {}) {
    const { error: storageErr } = await supabase.storage.from(BUCKET_NAME).remove([track.storage_path]);
    if (storageErr) {
      console.error(storageErr);
      if (!opts.silent) showToast("Errore nell'eliminare il file audio dallo storage.");
    }

    const { error: dbErr } = await supabase.from("tracks").delete().eq("id", track.id);
    if (dbErr) {
      console.error(dbErr);
      if (!opts.silent) showToast("Errore nell'eliminare il brano.");
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
    selectedTrackIds.delete(track.id);
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
      if (fullPlayerBackdrop) fullPlayerBackdrop.style.backgroundImage = "";
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

    if (selectionMode) updateBulkBar();

    if (!opts.silent) {
      showToast("Brano eliminato.", "success");
      render();
    }
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

  async function addTrackToPlaylist(trackId, playlistId, opts = {}) {
    const nextPosition = (playlistTracksMap[playlistId] || []).length;

    const { error } = await supabase
      .from("playlist_tracks")
      .insert({ playlist_id: playlistId, track_id: trackId, position: nextPosition });

    if (error && error.code !== "23505") {
      console.error(error);
      if (!opts.silent) showToast("Errore nell'aggiungere il brano alla playlist.");
      return;
    }

    if (!playlistTracksMap[playlistId]) playlistTracksMap[playlistId] = [];
    if (!playlistTracksMap[playlistId].includes(trackId)) {
      playlistTracksMap[playlistId].push(trackId);
      if (!opts.silent) {
        const pl = playlists.find((p) => p.id === playlistId);
        showToast(pl ? `Aggiunto a "${pl.name}".` : "Aggiunto alla playlist.", "success");
      }
    }

    if (!opts.silent) renderPlaylists();
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

  /* ============================================================
     PLAYLIST SMART (calcolate al volo, non salvate su DB)
     "Aggiunti di recente" e "Più ascoltati": bastano i dati che
     l'app ha già in memoria (allTracks arriva ordinato per
     created_at desc dal DB; userPlayStats tiene i conteggi
     dell'utente corrente), niente da persistere né sincronizzare.
  ============================================================ */
  function buildSmartPlaylists() {
    const recent = allTracks.slice(0, 20);

    const mostPlayed = allTracks
      .filter((t) => (userPlayStats[t.id]?.count || 0) > 0)
      .sort((a, b) => (userPlayStats[b.id]?.count || 0) - (userPlayStats[a.id]?.count || 0))
      .slice(0, 20);

    const lists = [];
    if (recent.length) lists.push({ id: "smart-recent", name: "🕐 Aggiunti di recente", tracks: recent });
    if (mostPlayed.length) lists.push({ id: "smart-most-played", name: "🔥 Più ascoltati", tracks: mostPlayed });
    return lists;
  }

  function renderSmartPlaylists() {
    if (!smartPlaylistsPanel || !smartPlaylistsList) return;
    const lists = buildSmartPlaylists();
    smartPlaylistsPanel.hidden = lists.length === 0;
    smartPlaylistsList.innerHTML = "";

    lists.forEach((sp) => {
      const li = document.createElement("li");
      li.className = "playlist-item";

      const row = document.createElement("div");
      row.className = "playlist-item-row";

      const name = document.createElement("span");
      name.className = "playlist-name";
      name.textContent = sp.name;
      row.appendChild(name);

      const count = document.createElement("span");
      count.className = "playlist-count";
      count.textContent = `${sp.tracks.length} brani`;
      row.appendChild(count);

      const actions = document.createElement("div");
      actions.className = "playlist-actions";

      const playBtn = document.createElement("button");
      playBtn.className = "icon-btn";
      playBtn.textContent = "▶";
      playBtn.title = "Riproduci";
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        play(sp.tracks[0], sp.tracks);
      });
      actions.appendChild(playBtn);
      row.appendChild(actions);

      li.appendChild(row);
      smartPlaylistsList.appendChild(li);
    });
  }

  function renderPlaylists() {
    renderSmartPlaylists();
    playlistsList.innerHTML = "";

    const term = playlistSearchTerm.trim().toLowerCase();
    const visiblePlaylists = term ? playlists.filter((pl) => pl.name.toLowerCase().includes(term)) : playlists;

    if (!visiblePlaylists.length) {
      playlistsEmptyMessage.textContent = term ? "Nessuna playlist trovata." : "Nessuna playlist creata.";
      playlistsEmptyMessage.style.display = "block";
      return;
    }
    playlistsEmptyMessage.style.display = "none";

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

  async function addTrackToAlbum(trackId, albumId, opts = {}) {
    const nextPosition = (albumTracksMap[albumId] || []).length;

    const { error } = await supabase
      .from("album_tracks")
      .insert({ album_id: albumId, track_id: trackId, position: nextPosition });

    if (error && error.code !== "23505") {
      console.error(error);
      if (!opts.silent) showToast("Errore nell'aggiungere il brano all'album.");
      return;
    }

    if (!albumTracksMap[albumId]) albumTracksMap[albumId] = [];
    if (!albumTracksMap[albumId].includes(trackId)) {
      albumTracksMap[albumId].push(trackId);
      if (!opts.silent) {
        const al = albums.find((a) => a.id === albumId);
        showToast(al ? `Aggiunto a "${al.name}".` : "Aggiunto all'album.", "success");
      }
    }

    if (!opts.silent) renderAlbums();
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

    const term = albumSearchTerm.trim().toLowerCase();
    const visibleAlbums = term ? albums.filter((al) => al.name.toLowerCase().includes(term)) : albums;

    if (!visibleAlbums.length) {
      albumsEmptyMessage.textContent = term ? "Nessun album trovato." : "Nessun album creato.";
      albumsEmptyMessage.style.display = "block";
      return;
    }
    albumsEmptyMessage.style.display = "none";

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
     SFONDO AMBIENT (colore dominante estratto dalla cover art)
     Le cover sono già data URI (immagine di default o tag ID3 letto
     in upload), quindi niente problemi di canvas "tainted" da CORS.
  ============================================================ */
  const ambientColorCache = new Map(); // cover url -> "r, g, b"

  function extractDominantColor(imageUrl) {
    if (ambientColorCache.has(imageUrl)) return Promise.resolve(ambientColorCache.get(imageUrl));
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = 24; // downsample: basta la tendenza di colore, non il dettaglio
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
          const rgb = `${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`;
          ambientColorCache.set(imageUrl, rgb);
          resolve(rgb);
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  }

  function applyAmbientBackdrop(coverUrl, trackId) {
    extractDominantColor(coverUrl).then((rgb) => {
      // il brano potrebbe essere già cambiato mentre l'estrazione era in corso
      if (!fullPlayerBackdrop || nowPlayingId !== trackId) return;
      fullPlayerBackdrop.style.backgroundImage = rgb
        ? `radial-gradient(circle at 28% 18%, rgba(${rgb}, 0.85) 0%, transparent 62%), url("${coverUrl}")`
        : `url("${coverUrl}")`;
    });
  }

  /* ============================================================
     WEB AUDIO CONDIVISA (visualizer + decodifica per la waveform)
     createMediaElementSource si può chiamare una sola volta per
     l'intera vita dell'elemento <audio>: va creata lazy al primo
     play (richiede comunque un gesto utente) e riusata sempre,
     instradando sorgente -> analyser -> uscita così l'audio continua
     a sentirsi normalmente.
  ============================================================ */
  let sharedAudioCtx = null;
  let audioAnalyser = null;

  function getAudioAnalyser() {
    if (audioAnalyser) return audioAnalyser;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      sharedAudioCtx = new Ctx();
      const source = sharedAudioCtx.createMediaElementSource(audioPlayer);
      audioAnalyser = sharedAudioCtx.createAnalyser();
      audioAnalyser.fftSize = 128;
      audioAnalyser.smoothingTimeConstant = 0.75;
      source.connect(audioAnalyser);
      audioAnalyser.connect(sharedAudioCtx.destination);
    } catch (err) {
      console.error(err);
      return null;
    }
    return audioAnalyser;
  }

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#3b82f6";
  const accent2Color = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim() || "#38bdf8";

  let visualizerRAF = null;
  function drawVisualizerFrame() {
    const analyser = audioAnalyser;
    if (!analyser || !audioVisualizerCtx || !audioVisualizerCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = audioVisualizerCanvas.clientWidth;
    const height = audioVisualizerCanvas.clientHeight;
    if (width && (audioVisualizerCanvas.width !== width * dpr || audioVisualizerCanvas.height !== height * dpr)) {
      audioVisualizerCanvas.width = width * dpr;
      audioVisualizerCanvas.height = height * dpr;
    }
    audioVisualizerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    audioVisualizerCtx.clearRect(0, 0, width, height);

    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(data);

    const barCount = Math.min(bufferLength, 48);
    const gap = 3;
    const barWidth = Math.max((width - gap * (barCount - 1)) / barCount, 1);
    const gradient = audioVisualizerCtx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, accentColor);
    gradient.addColorStop(1, accent2Color);
    audioVisualizerCtx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
      const value = data[i] / 255;
      const barHeight = Math.max(value * height, 2);
      const x = i * (barWidth + gap);
      audioVisualizerCtx.beginPath();
      const r = Math.min(barWidth / 2, 3);
      const y = height - barHeight;
      audioVisualizerCtx.roundRect ? audioVisualizerCtx.roundRect(x, y, barWidth, barHeight, r) : audioVisualizerCtx.rect(x, y, barWidth, barHeight);
      audioVisualizerCtx.fill();
    }

    visualizerRAF = requestAnimationFrame(drawVisualizerFrame);
  }

  function startVisualizer() {
    const analyser = getAudioAnalyser();
    if (!analyser) return;
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
    if (visualizerRAF) cancelAnimationFrame(visualizerRAF);
    drawVisualizerFrame();
  }

  function stopVisualizer() {
    if (visualizerRAF) cancelAnimationFrame(visualizerRAF);
    visualizerRAF = null;
    if (audioVisualizerCtx && audioVisualizerCanvas) {
      audioVisualizerCtx.clearRect(0, 0, audioVisualizerCanvas.width, audioVisualizerCanvas.height);
    }
  }

  /* ============================================================
     SEEKBAR A FORMA D'ONDA
     Riusa il blob audio già scaricato per la cache (vedi
     getTrackAudioBlob) per decodificarlo ed estrarne i picchi:
     nessun download aggiuntivo. La parte già ascoltata viene
     ridisegnata in accent invece della vecchia barra piatta.
  ============================================================ */
  const waveformPeaksCache = new Map(); // storage_path -> Float32Array
  let currentWaveformPeaks = null;

  async function extractWaveformPeaks(storagePath, blob) {
    if (waveformPeaksCache.has(storagePath)) return waveformPeaksCache.get(storagePath);
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = sharedAudioCtx || new Ctx();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const raw = audioBuffer.getChannelData(0);
      const buckets = 120;
      const bucketSize = Math.max(Math.floor(raw.length / buckets), 1);
      const peaks = new Float32Array(buckets);
      for (let i = 0; i < buckets; i++) {
        let max = 0;
        const start = i * bucketSize;
        const end = Math.min(start + bucketSize, raw.length);
        for (let j = start; j < end; j++) {
          const v = Math.abs(raw[j]);
          if (v > max) max = v;
        }
        peaks[i] = max;
      }
      const globalMax = Math.max(...peaks, 0.01);
      for (let i = 0; i < buckets; i++) peaks[i] = Math.max(peaks[i] / globalMax, 0.06);
      waveformPeaksCache.set(storagePath, peaks);
      return peaks;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  function drawWaveform(progressRatio) {
    if (!waveformCtx || !waveformCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = waveformCanvas.clientWidth;
    const height = waveformCanvas.clientHeight;
    if (!width || !height) return;
    if (waveformCanvas.width !== width * dpr || waveformCanvas.height !== height * dpr) {
      waveformCanvas.width = width * dpr;
      waveformCanvas.height = height * dpr;
    }
    waveformCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    waveformCtx.clearRect(0, 0, width, height);

    const peaks = currentWaveformPeaks;
    if (!peaks) return;

    const barCount = peaks.length;
    const gap = 2;
    const barWidth = Math.max((width - gap * (barCount - 1)) / barCount, 1);
    const playedBars = Math.floor((progressRatio || 0) * barCount);

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.max(peaks[i] * height, 2);
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;
      waveformCtx.fillStyle = i < playedBars ? accentColor : "rgba(154, 161, 176, 0.35)";
      waveformCtx.fillRect(x, y, barWidth, barHeight);
    }
  }

  let lastSeekProgressRatio = 0;
  window.addEventListener("resize", () => drawWaveform(lastSeekProgressRatio));

  /* ============================================================
     CROSSFADE
     Negli ultimi CROSSFADE_SECONDS del brano corrente, il prossimo
     parte in sordina su un secondo <audio> e si sovrappone mentre
     quello attuale sfuma: una vera dissolvenza incrociata, non un
     semplice fade-out. Al termine il controllo torna al player
     principale (così tutta la UI esistente - seekbar, waveform,
     visualizer - continua a funzionare senza doverla duplicare).
  ============================================================ */
  const audioPlayerCrossfade = document.getElementById("audio-player-crossfade");
  const CROSSFADE_SECONDS = 5;
  let isCrossfading = false;
  let crossfadeTimer = null;

  function seekWhenReady(el, time) {
    if (el.readyState >= 1) el.currentTime = time;
    else el.addEventListener("loadedmetadata", () => (el.currentTime = time), { once: true });
  }

  function cancelCrossfade() {
    if (!isCrossfading && !audioPlayerCrossfade.src) return;
    isCrossfading = false;
    if (crossfadeTimer) clearInterval(crossfadeTimer);
    crossfadeTimer = null;
    audioPlayerCrossfade.pause();
    audioPlayerCrossfade.removeAttribute("src");
    audioPlayer.volume = 1;
  }

  async function maybeStartCrossfade() {
    if (isCrossfading) return;
    if (repeatMode === "one") return;
    if (!audioPlayer.duration || !isFinite(audioPlayer.duration)) return;
    const remaining = audioPlayer.duration - audioPlayer.currentTime;
    if (remaining > CROSSFADE_SECONDS || remaining <= 0.15) return;

    const nextIndex = pickNextIndex();
    if (nextIndex < 0) return;
    const nextTrack = currentQueue[nextIndex];
    if (!nextTrack) return;

    isCrossfading = true;
    try {
      const nextUrl = await getTrackAudioUrl(nextTrack.storage_path);
      if (!nextUrl || !isCrossfading) return; // annullato nel frattempo (utente ha navigato a mano)
      const blob = await getTrackAudioBlob(nextTrack.storage_path, nextUrl);
      if (!isCrossfading) return;

      const objectUrl = URL.createObjectURL(blob);
      audioPlayerCrossfade.src = objectUrl;
      audioPlayerCrossfade.volume = 0;
      await audioPlayerCrossfade.play();

      // la dissolvenza deve chiudersi poco PRIMA della fine naturale del
      // brano: chiudendosi nello stesso istante, finishCrossfade ed "ended"
      // facevano a gara e quando vinceva "ended" la coda restava ferma
      const fadeDurationMs = Math.max(Math.min(CROSSFADE_SECONDS, remaining - 0.4), 0.5) * 1000;
      const startTime = performance.now();
      const startVolumeOut = audioPlayer.volume;

      // un timer, non requestAnimationFrame: a schermo spento le animazioni
      // vengono sospese e la dissolvenza non si chiuderebbe mai, lasciando
      // la riproduzione bloccata sul brano corrente
      crossfadeTimer = setInterval(() => {
        if (!isCrossfading) {
          clearInterval(crossfadeTimer);
          crossfadeTimer = null;
          return;
        }
        const t = Math.min((performance.now() - startTime) / fadeDurationMs, 1);
        audioPlayer.volume = Math.max(startVolumeOut * (1 - t), 0);
        audioPlayerCrossfade.volume = Math.min(t, 1);
        if (t >= 1) finishCrossfade(nextTrack, nextIndex, objectUrl, blob);
      }, 50);
    } catch (err) {
      console.error(err);
      isCrossfading = false;
    }
  }

  function finishCrossfade(nextTrack, nextIndex, objectUrl, blob) {
    if (crossfadeTimer) clearInterval(crossfadeTimer);
    crossfadeTimer = null;

    const resumeTime = audioPlayerCrossfade.currentTime;
    audioPlayerCrossfade.pause();
    audioPlayerCrossfade.removeAttribute("src");

    currentIndex = nextIndex;
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = objectUrl;
    audioPlayer.src = objectUrl;
    audioPlayer.volume = 1;
    seekWhenReady(audioPlayer, resumeTime);
    audioPlayer.play();

    currentWaveformPeaks = waveformPeaksCache.get(nextTrack.storage_path) || null;
    drawWaveform(lastSeekProgressRatio);
    if (!currentWaveformPeaks) {
      extractWaveformPeaks(nextTrack.storage_path, blob).then((peaks) => {
        if (nowPlayingId !== nextTrack.id) return;
        currentWaveformPeaks = peaks;
        drawWaveform(lastSeekProgressRatio);
      });
    }

    applyNowPlayingUI(nextTrack);
    registerPlay(nextTrack);

    isCrossfading = false;
  }

  /* ============================================================
     MEDIA SESSION (autoradio Bluetooth, cuffie, schermata di blocco)
     Una WebView non pubblica da sola una sessione media al sistema:
     senza questo l'autoradio non vede né il titolo né i comandi.
     Dentro l'APK la pubblica il plugin nativo, nel browser si usa
     l'API standard. Nota: sulla pagina remota Capacitor.Plugins resta
     vuoto (l'SDK JS non è impacchettato nel sito), ma il bridge
     iniettato espone nativePromise/nativeCallback, che è la via usata qui.
  ============================================================ */
  const nativeBridge =
    window.Capacitor && typeof window.Capacitor.nativePromise === "function" ? window.Capacitor : null;
  const webMediaSession = "mediaSession" in navigator ? navigator.mediaSession : null;

  function nativeMediaCall(method, options) {
    return nativeBridge.nativePromise("MediaSession", method, options).catch((err) => console.error(err));
  }

  function publishMediaMetadata(track) {
    // il lato nativo sa decodificare solo bitmap: le cover dei tag ID3 sono
    // data URI base64 e vanno bene, quella di default è un SVG e verrebbe
    // ignorata, quindi non la passiamo nemmeno
    const cover = track.cover || "";
    const artwork = cover.includes(";base64,") ? [{ src: cover, sizes: "512x512", type: "image/png" }] : [];
    const metadata = {
      title: track.title || "Fioxify",
      artist: track.artist || "",
      album: track.album || "",
      artwork,
    };

    if (nativeBridge) {
      nativeMediaCall("setMetadata", metadata);
      return;
    }
    if (webMediaSession && window.MediaMetadata) {
      webMediaSession.metadata = new window.MediaMetadata(metadata);
    }
  }

  function publishPlaybackState(state) {
    if (nativeBridge) {
      nativeMediaCall("setPlaybackState", { playbackState: state });
      return;
    }
    if (webMediaSession) webMediaSession.playbackState = state;
  }

  let lastPositionPublish = 0;
  function publishPositionState(force) {
    if (!audioPlayer.duration || !isFinite(audioPlayer.duration)) return;
    // timeupdate scatta ~4 volte al secondo: attraversare il bridge così
    // spesso è inutile, all'autoradio basta un aggiornamento al secondo
    const now = Date.now();
    if (!force && now - lastPositionPublish < 1000) return;
    lastPositionPublish = now;

    const payload = {
      duration: audioPlayer.duration,
      position: audioPlayer.currentTime,
      playbackRate: audioPlayer.playbackRate || 1,
    };
    if (nativeBridge) {
      nativeMediaCall("setPositionState", payload);
      return;
    }
    if (webMediaSession?.setPositionState) {
      try {
        webMediaSession.setPositionState(payload);
      } catch (err) {
        // durante un cambio brano durata e posizione possono essere incoerenti
      }
    }
  }

  function registerMediaSessionActions() {
    const handlers = {
      play: () => audioPlayer.play(),
      pause: () => audioPlayer.pause(),
      stop: () => audioPlayer.pause(),
      nexttrack: () => {
        const idx = pickNextIndex();
        if (idx >= 0) play(currentQueue[idx], currentQueue);
      },
      previoustrack: () => {
        const idx = pickPrevIndex();
        if (idx >= 0) play(currentQueue[idx], currentQueue);
      },
      seekto: (data) => {
        if (data && typeof data.seekTime === "number") audioPlayer.currentTime = data.seekTime;
      },
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      if (nativeBridge) {
        nativeBridge.nativeCallback("MediaSession", "setActionHandler", { action }, handler);
        return;
      }
      if (webMediaSession) {
        try {
          webMediaSession.setActionHandler(action, handler);
        } catch (err) {
          // azione non supportata da questo browser: le altre restano valide
        }
      }
    });
  }

  /* ============================================================
     PLAYER: PLAY / CODA / SHUFFLE / REPEAT
  ============================================================ */
  async function play(track, queueList) {
    cancelCrossfade();
    currentQueue = queueList.slice();
    currentIndex = currentQueue.findIndex((t) => t.id === track.id);

    const audioUrl = await getTrackAudioUrl(track.storage_path);
    if (!audioUrl) {
      showToast("Errore nella riproduzione del brano.");
      return;
    }

    // creata qui (dentro un gesto utente: click su un brano) cosicché
    // sia già pronta per il visualizer e riusabile per decodificare la waveform
    getAudioAnalyser();

    currentWaveformPeaks = null;
    drawWaveform(0);

    try {
      const blob = await getTrackAudioBlob(track.storage_path, audioUrl);
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(blob);
      audioPlayer.src = currentObjectUrl;

      extractWaveformPeaks(track.storage_path, blob).then((peaks) => {
        if (nowPlayingId !== track.id) return; // brano già cambiato nel frattempo
        currentWaveformPeaks = peaks;
        drawWaveform(lastSeekProgressRatio);
      });
    } catch (err) {
      console.error(err);
      audioPlayer.src = audioUrl; // fallback diretto se fetch/cache manuale fallisce
    }
    audioPlayer.volume = 1;
    audioPlayer.play();

    seekBar.value = 0;
    seekBar.max = 0;
    seekBar.style.setProperty("--progress", "0%");
    lastSeekProgressRatio = 0;
    if (miniProgressFill) miniProgressFill.style.width = "0%";
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";

    applyNowPlayingUI(track);
    registerPlay(track);
  }

  // stato/UI del "brano in riproduzione": estratto da play() così il
  // crossfade può aggiornarlo al termine della dissolvenza senza dover
  // rifare fetch/decodifica di un audio già in riproduzione sul layer
  // di crossfade
  function applyNowPlayingUI(track) {
    const metaLine = [track.artist, track.album].filter(Boolean).join(" — ");

    nowPlayingId = track.id;
    currentTrackName.textContent = track.title;
    currentTrackArtist.textContent = metaLine;
    currentCover.src = track.cover || DEFAULT_COVER;
    if (fullPlayerBackdrop) {
      const coverUrl = track.cover || DEFAULT_COVER;
      fullPlayerBackdrop.style.backgroundImage = `url("${coverUrl}")`;
      applyAmbientBackdrop(coverUrl, track.id);
    }
    updateLikeCurrentBtn(track);
    updatePlayingHighlight();
    renderTrackReactions(track.id);
    publishMediaMetadata(track);

    miniTrackName.textContent = track.title;
    miniTrackArtist.textContent = metaLine;
    miniCover.src = track.cover || DEFAULT_COVER;
    miniPlayer.hidden = false;
    document.body.classList.add("has-mini-player");
  }

  /* ============================================================
     REAZIONI RAPIDE (emoji sul brano in riproduzione)
  ============================================================ */
  function renderTrackReactions(trackId) {
    if (!trackReactionsEl) return;
    trackReactionsEl.innerHTML = "";
    const counts = reactionCountsByTrack[trackId] || {};
    const mine = myReactionsByTrack[trackId] || new Set();

    REACTION_EMOJIS.forEach((emoji) => {
      const chip = document.createElement("button");
      chip.className = "reaction-chip" + (mine.has(emoji) ? " mine" : "");
      chip.type = "button";
      chip.title = mine.has(emoji) ? "Togli reazione" : "Reagisci";

      const emojiSpan = document.createElement("span");
      emojiSpan.textContent = emoji;
      chip.appendChild(emojiSpan);

      const count = counts[emoji] || 0;
      if (count > 0) {
        const countSpan = document.createElement("span");
        countSpan.className = "reaction-chip-count";
        countSpan.textContent = String(count);
        chip.appendChild(countSpan);
      }

      chip.addEventListener("click", () => toggleReaction(trackId, emoji));
      trackReactionsEl.appendChild(chip);
    });
  }

  async function toggleReaction(trackId, emoji) {
    const mine = myReactionsByTrack[trackId] || new Set();
    const hasIt = mine.has(emoji);

    // ottimistico: la conferma/correzione arriva comunque dal prossimo
    // loadData() (anche via realtime, se lo stesso brano è aperto altrove)
    const counts = reactionCountsByTrack[trackId] || {};
    if (hasIt) {
      mine.delete(emoji);
      counts[emoji] = Math.max((counts[emoji] || 1) - 1, 0);
    } else {
      mine.add(emoji);
      counts[emoji] = (counts[emoji] || 0) + 1;
    }
    myReactionsByTrack[trackId] = mine;
    reactionCountsByTrack[trackId] = counts;
    if (nowPlayingId === trackId) renderTrackReactions(trackId);

    const { error } = hasIt
      ? await supabase.from("track_reactions").delete().eq("track_id", trackId).eq("user_id", currentUser.id).eq("emoji", emoji)
      : await supabase.from("track_reactions").insert({ track_id: trackId, user_id: currentUser.id, emoji });

    if (error) {
      console.error(error);
      showToast("Errore nel salvare la reazione.");
      await loadData(); // riallinea lo stato ottimistico con quello reale
    }
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
    // stesso tracciato, cambia solo il riempimento: il cuore "si riempie"
    // invece di sostituirsi con un'emoji diversa
    likeCurrentBtn.innerHTML = ICONS.heart;
    likeCurrentBtn.title = liked ? "Togli dai preferiti" : "Aggiungi ai preferiti";
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
    repeatBtn.innerHTML = repeatMode === "one" ? ICONS.repeatOne : ICONS.repeat;
    repeatBtn.title =
      repeatMode === "one" ? "Ripeti il brano" : repeatMode === "all" ? "Ripeti la coda" : "Ripeti";
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
    const icon = isPlaying ? ICONS.pause : ICONS.play;
    const label = isPlaying ? "Pausa" : "Play";
    if (playPauseBtn) {
      playPauseBtn.innerHTML = icon;
      playPauseBtn.title = label;
    }
    if (miniPlayPauseBtn) {
      miniPlayPauseBtn.innerHTML = icon;
      miniPlayPauseBtn.title = label;
    }
  }

  audioPlayer.addEventListener("play", () => {
    document.body.classList.add("audio-playing");
    setPlayPauseIcon(true);
    startVisualizer();
    publishPlaybackState("playing");
    publishPositionState(true);
  });

  audioPlayer.addEventListener("pause", () => {
    document.body.classList.remove("audio-playing");
    setPlayPauseIcon(false);
    stopVisualizer();
    cancelCrossfade();
    publishPlaybackState("paused");
  });

  audioPlayer.addEventListener("ended", () => {
    document.body.classList.remove("audio-playing");
    setPlayPauseIcon(false);
    stopVisualizer();
    publishPlaybackState("paused");
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
    publishPositionState(true);
  });

  audioPlayer.addEventListener("timeupdate", () => {
    seekBar.value = audioPlayer.currentTime;
    currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
    const ratio = audioPlayer.duration ? audioPlayer.currentTime / audioPlayer.duration : 0;
    seekBar.style.setProperty("--progress", `${ratio * 100}%`);
    if (miniProgressFill) miniProgressFill.style.width = `${ratio * 100}%`;
    lastSeekProgressRatio = ratio;
    drawWaveform(ratio);
    publishPositionState();
    maybeStartCrossfade();
  });

  seekBar?.addEventListener("input", () => {
    audioPlayer.currentTime = Number(seekBar.value);
    currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
    const ratio = seekBar.max ? seekBar.value / seekBar.max : 0;
    seekBar.style.setProperty("--progress", `${ratio * 100}%`);
    if (miniProgressFill) miniProgressFill.style.width = `${ratio * 100}%`;
    lastSeekProgressRatio = ratio;
    drawWaveform(ratio);
  });

  audioPlayer.addEventListener("ended", () => {
    // se la dissolvenza risulta ancora in corso vuol dire che non ha fatto
    // in tempo a subentrare: va annullata e si prosegue comunque, altrimenti
    // la riproduzione resta ferma qui (era il caso degli album che non
    // andavano avanti da soli)
    if (isCrossfading) cancelCrossfade();
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
      if (targetPage === "library") render();
      else if (targetPage === "albums") renderAlbums();
      else if (targetPage === "playlists") renderPlaylists();
      else if (targetPage === "admin") renderAdmin();
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
