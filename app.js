/* ============================================================
   CONFIG SUPABASE
============================================================ */
const SUPABASE_URL = "https://ostajdhuaxrjrwroayja.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdGFqZGh1YXhyanJ3cm9heWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTcyOTQsImV4cCI6MjA5MjE3MzI5NH0.YVzjs5VDHfGC8taGvlGxJiXb8Bh-NnZY1TjNeSTuGsY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = "Fioxisongs";

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
  const currentCover = document.getElementById("current-cover");

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
  let currentUser = null;

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

  /* LOGOUT */
  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  /* ============================================================
     UPLOAD AUDIO + METADATA + TAGS
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

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}_${currentUser.id}.${ext}`;
    const audioPath = `${currentUser.id}/${fileName}`;

    const { error: audioErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(audioPath, file);

    if (audioErr) {
      uploadStatus.textContent = "Errore upload audio.";
      console.error(audioErr);
      return;
    }

    const metadata = {
      title: extractedTitle,
      cover: extractedCover,
      originalName: file.name,
      tags: currentTags,
    };

    const jsonBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });

    const jsonPath = audioPath.replace(/\.[^/.]+$/, ".json");

    const { error: jsonErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(jsonPath, jsonBlob, { upsert: true });

    if (jsonErr) {
      uploadStatus.textContent = "Errore upload metadata.";
      console.error(jsonErr);
      return;
    }

    uploadStatus.textContent = "Caricato!";
    fileInput.value = "";
    currentTags = [];
    renderUploadTags();

    await loadTracks();
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
     LOAD TRACKS
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
        .createSignedUrl(track.jsonPath, 3600);

      if (!jsonSigned?.signedUrl) continue;

      const metadata = await fetch(jsonSigned.signedUrl).then((r) => r.json());

      const li = document.createElement("li");
      li.className = "track-item";

      const row = document.createElement("div");
      row.className = "track-main-row";

      const img = document.createElement("img");
      img.className = "track-cover-small";
      img.src = metadata.cover;

      const title = document.createElement("span");
      title.className = "track-title";
      title.textContent = metadata.title;

      const tagsRow = document.createElement("div");
      tagsRow.className = "track-tags-row";

      const tagsBox = document.createElement("div");
      tagsBox.className = "track-tags";
      tagsBox.innerHTML = (metadata.tags || [])
        .map((t) => `<span class="tag">${t}</span>`)
        .join(" ");

      const editBtn = document.createElement("button");
      editBtn.className = "edit-tags-btn";
      editBtn.textContent = "Modifica tag";

      tagsRow.appendChild(tagsBox);
      tagsRow.appendChild(editBtn);

      row.appendChild(img);
      row.appendChild(title);
      row.appendChild(tagsRow);

      li.appendChild(row);

      // EDITOR INLINE
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

      // CLICK PLAY (solo sul li, non su edit)
      li.addEventListener("click", async () => {
        const { data: audioSigned } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(track.audioPath, 3600);

        audioPlayer.src = audioSigned.signedUrl;
        audioPlayer.play();

        currentTrackName.textContent = metadata.title;
        currentCover.src = metadata.cover;
      });

      // APRI/CHIUDI EDITOR
      let editorController = null;

      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = editor.style.display === "block";
        editor.style.display = isOpen ? "none" : "block";

        if (!isOpen) {
          editorController = setupTagEditor(editor, metadata.tags || []);
        }
      });

      // SALVA TAG MODIFICATI
      editor.querySelector(".tag-editor-save").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!editorController) return;

        const newTags = editorController.getTags();
        metadata.tags = newTags;

        const newJsonBlob = new Blob([JSON.stringify(metadata)], {
          type: "application/json",
        });

        const { error: updErr } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(track.jsonPath, newJsonBlob, { upsert: true });

        if (updErr) {
          console.error("Errore aggiornamento tag:", updErr);
          return;
        }

        tagsBox.innerHTML = newTags.map((t) => `<span class="tag">${t}</span>`).join(" ");
        editor.style.display = "none";
      });

      tracksList.appendChild(li);
    }
  }

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