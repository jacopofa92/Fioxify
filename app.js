// CONFIG SUPABASE
const SUPABASE_URL = "https://ostajdhuaxrjrwroayja.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdGFqZGh1YXhyanJ3cm9heWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTcyOTQsImV4cCI6MjA5MjE3MzI5NH0.YVzjs5VDHfGC8taGvlGxJiXb8Bh-NnZY1TjNeSTuGsY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = "Fioxisongs";

// Detect page
const isAuthPage =
  window.location.pathname.endsWith("index.html") ||
  window.location.pathname === "/";
const isAppPage = window.location.pathname.endsWith("app.html");

/* ============================================================
   AUTH PAGE
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

  // Switch tab
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

  // Login
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

  // Register
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

  // Auto-login if session exists
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
  const currentCover = document.getElementById("current-cover");

  let currentUser = null;

  // Check session
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "index.html";
      return;
    }
    currentUser = data.session.user;
    userEmailSpan.textContent = currentUser.email || "Utente";
    await loadTracks();
  })();

  // Logout
  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  /* ============================================================
     UPLOAD (audio + JSON metadata)
  ============================================================ */
  uploadBtn?.addEventListener("click", async () => {
    uploadStatus.textContent = "";
    const file = fileInput.files[0];
    if (!file) {
      uploadStatus.textContent = "Seleziona un file audio.";
      return;
    }

    uploadStatus.textContent = "Lettura metadata...";

    // Estrai metadata PRIMA dell'upload
    let extractedTitle = file.name.replace(/\.[^/.]+$/, "");
    let extractedCover = null;

    await new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          if (tag.tags.title) extractedTitle = tag.tags.title;

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

    if (!extractedCover) extractedCover = "img/default-cover.png";

    uploadStatus.textContent = "Caricamento...";

    // Nome file generato (come vuoi tu)
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}_${currentUser.id}.${ext}`;
    const audioPath = `${currentUser.id}/${fileName}`;

    // 1) Upload audio
    const { error: audioErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(audioPath, file);

    if (audioErr) {
      uploadStatus.textContent = "Errore upload audio.";
      console.error(audioErr);
      return;
    }

    // 2) Upload JSON metadata
    const metadata = {
      title: extractedTitle,
      cover: extractedCover,
      originalName: file.name
    };

    const jsonBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });

    const jsonPath = audioPath.replace(/\.[^/.]+$/, ".json");

    const { error: jsonErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(jsonPath, jsonBlob);

    if (jsonErr) {
      uploadStatus.textContent = "Errore upload metadata.";
      console.error(jsonErr);
      return;
    }

    uploadStatus.textContent = "Caricato!";
    fileInput.value = "";
    await loadTracks();
  });

  /* ============================================================
     LOAD TRACKS (legge JSON metadata)
  ============================================================ */
  async function loadTracks() {
    tracksList.innerHTML = "";
    emptyMessage.style.display = "none";

    const { data: folders } = await supabase.storage
      .from(BUCKET_NAME)
      .list("", { limit: 100 });

    if (!folders?.length) {
      emptyMessage.textContent = "Nessun brano caricato.";
      emptyMessage.style.display = "block";
      return;
    }

    const allTracks = [];

    for (const folder of folders) {
      const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folder.name, { limit: 100 });

      files?.forEach((f) => {
        if (/\.(mp3|wav|m4a|flac)$/i.test(f.name)) {
          allTracks.push({
            audioPath: `${folder.name}/${f.name}`,
            jsonPath: `${folder.name}/${f.name}`.replace(/\.[^/.]+$/, ".json"),
            created_at: f.created_at,
          });
        }
      });
    }

    allTracks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    for (const track of allTracks) {
      const { data: jsonSigned } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(track.jsonPath, 60 * 60);

      if (!jsonSigned?.signedUrl) continue;

      const metadata = await fetch(jsonSigned.signedUrl).then((r) => r.json());

      const li = document.createElement("li");
      li.className = "track-item";

      const img = document.createElement("img");
      img.className = "track-cover-small";
      img.src = metadata.cover;

      const title = document.createElement("span");
      title.textContent = metadata.title;

      li.appendChild(img);
      li.appendChild(title);

      li.addEventListener("click", async () => {
        const { data: audioSigned } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(track.audioPath, 60 * 60);

        audioPlayer.src = audioSigned.signedUrl;
        audioPlayer.play();

        currentTrackName.textContent = metadata.title;
        currentCover.src = metadata.cover;
      });

      tracksList.appendChild(li);
    }
  }
}