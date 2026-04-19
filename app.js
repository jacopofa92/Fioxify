// CONFIG SUPABASE
const SUPABASE_URL = "https://ostajdhuaxrjrwroayja.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdGFqZGh1YXhyanJ3cm9heWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTcyOTQsImV4cCI6MjA5MjE3MzI5NH0.YVzjs5VDHfGC8taGvlGxJiXb8Bh-NnZY1TjNeSTuGsY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = "Fioxisongs"; // assicurati che esista in Supabase

// Rileva pagina
const isAuthPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/" ;
const isAppPage = window.location.pathname.endsWith("app.html");

// ---------------- AUTH PAGE (index.html) ----------------
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      loginError.textContent = error.message || "Errore di login.";
      return;
    }

    window.location.href = "app.html";
  });

  // Registrazione
  registerBtn?.addEventListener("click", async () => {
    registerError.textContent = "";
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    if (!email || !password) {
      registerError.textContent = "Inserisci email e password.";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      registerError.textContent = error.message || "Errore di registrazione.";
      return;
    }

    registerError.textContent = "Account creato. Controlla l'email (se richiesto) e poi fai login.";
  });

  // Se già loggato → vai direttamente alla libreria
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      window.location.href = "app.html";
    }
  })();
}

// ---------------- APP PAGE (app.html) ----------------
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

  let currentUser = null;

  // Controlla sessione
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

  // Upload
  uploadBtn?.addEventListener("click", async () => {
    uploadStatus.textContent = "";
    const file = fileInput.files[0];
    if (!file) {
      uploadStatus.textContent = "Seleziona un file audio.";
      return;
    }

    if (!currentUser) {
      uploadStatus.textContent = "Sessione non valida. Rieffettua il login.";
      return;
    }

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}_${currentUser.id}.${ext}`;
    const filePath = `${currentUser.id}/${fileName}`;

    uploadStatus.textContent = "Caricamento in corso...";

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (error) {
      uploadStatus.textContent = "Errore nel caricamento.";
      console.error(error);
      return;
    }

    uploadStatus.textContent = "Caricato con successo.";
    fileInput.value = "";
    await loadTracks();
  });

  // Carica lista brani
  async function loadTracks() {
  tracksList.innerHTML = "";
  emptyMessage.style.display = "none";

  // 1) Lista le cartelle (ogni cartella = user_id)
  const { data: folders, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list("", { limit: 100 });

  if (error) {
    console.error(error);
    emptyMessage.textContent = "Errore nel caricamento della libreria.";
    emptyMessage.style.display = "block";
    return;
  }

  const allFiles = [];

  // 2) Per ogni cartella, lista i file dentro
  for (const folder of folders) {
    if (folder.name) {
      const { data: files, error: err2 } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folder.name, { limit: 100 });

      if (!err2 && files?.length) {
        files.forEach((f) => {
          allFiles.push({
            folder: folder.name,
            name: f.name,
            path: `${folder.name}/${f.name}`,
            created_at: f.created_at,
          });
        });
      }
    }
  }

  // 3) Se non ci sono file
  if (!allFiles.length) {
    emptyMessage.textContent = "Nessun brano caricato.";
    emptyMessage.style.display = "block";
    return;
  }

  // 4) Ordina per data
  allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 5) Mostra i file
  allFiles.forEach((file) => {
    const li = document.createElement("li");
    li.className = "track-item";
    li.textContent = file.name.replace(/^\d+_/, "");

    li.addEventListener("click", async () => {
      const { data: signed, error: errUrl } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(file.path, 60 * 60);

      if (errUrl) {
        console.error(errUrl);
        return;
      }

      audioPlayer.src = signed.signedUrl;
      audioPlayer.play();
      currentTrackName.textContent = file.name.replace(/^\d+_/, "");
    });

    tracksList.appendChild(li);
  });
}
}
