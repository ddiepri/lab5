import {
  state,
  sampleTracks,
  getPlaylist,
  setCurrentPlaylist,
  createPlaylist,
  updatePlaylistMeta,
  addTrackToPlaylist,
  removeTrack,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  signIn,
  signOut,
  resetDemo,
  persist
} from "./state.js";

let currentPlaylist = state.currentPlaylistId ? getPlaylist(state.currentPlaylistId) : null;
let isEditingPlaylist = false;

const els = {
  name: document.getElementById("playlist-name"),
  description: document.getElementById("playlist-description"),
  privacy: document.getElementById("privacy"),
  trackCount: document.getElementById("track-count"),
  list: document.getElementById("track-list"),
  empty: document.getElementById("track-empty"),
  coverInput: document.getElementById("cover-input"),
  coverDrop: document.getElementById("cover-drop"),
  coverLabel: document.getElementById("cover-label"),
  coverImage: document.getElementById("cover-image"),
  coverRemove: document.getElementById("cover-remove"),
  coverUpload: document.querySelector(".cover-upload"),
  suggestions: document.getElementById("track-suggestions"),
  queuePanel: document.getElementById("queue-panel"),
  queueList: document.getElementById("queue-list"),
  queueEmpty: document.getElementById("queue-empty"),
  queueStatus: document.getElementById("queue-status"),
  authStatus: document.getElementById("auth-status"),
  helper: document.getElementById("helper"),
  layout: document.querySelector(".layout"),
  player: document.querySelector(".player"),
  guest: document.getElementById("playlist-guest"),
  playlistMain: document.querySelector(".playlist-main"),
  playlistEmpty: document.getElementById("playlist-empty"),
  template: document.getElementById("playlist-template"),
  librarySection: document.getElementById("library-section"),
  playlistTop: document.getElementById("playlist-top"),
  trackHeader: document.getElementById("track-header"),
  trackSection: document.getElementById("track-section"),
  editInline: document.getElementById("edit-inline"),
  editName: document.getElementById("edit-name"),
  editDescription: document.getElementById("edit-description"),
  editSave: document.getElementById("edit-save"),
  editCancel: document.getElementById("edit-cancel")
};

const toast = document.getElementById("toast");
const defaultEmptyTracksText = "The playlist is empty — add a track using the search below.";

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function downloadApp() {
  const content = `Darify demo app
Version: 1.0.0
This is a placeholder download for the lab5 (HTML/CSS/JS).`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "darify-demo.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Demo app downloaded");
}

function styleProgress(range) {
  if (!range) return;
  const val = range.value;
  range.style.background = `linear-gradient(90deg, var(--accent) ${val}%, rgba(15,23,42,0.1) 0)`;
}

function ensureSignedIn() {
  if (state.user.signedIn) return true;
  document.getElementById("login-modal")?.classList.remove("hidden");
  showToast("Sign in to manage playlists");
  return false;
}

function toggleControls(enabled) {
  const ids = ["add-from-search", "btn-edit-open", "btn-private-toggle", "btn-copy-link"];
  ids.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !enabled;
      btn.classList.toggle("disabled", !enabled);
    }
  });
  const search = document.getElementById("track-search");
  if (search) search.disabled = !enabled;
  if (els.coverInput) els.coverInput.disabled = !enabled;
}

function updateAuthUI() {
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");

  if (state.user.signedIn) {
    // текст в топбаре
    if (els.authStatus) { 
      els.authStatus.classList.remove("hidden");
      els.authStatus.textContent = `Signed in as ${state.user.email}`;
    }
    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");

    // показываем весь плейлистный UI
    els.layout?.classList.remove("hidden");
    els.player?.classList.remove("hidden");
    els.playlistMain?.classList.remove("hidden");
    els.guest?.classList.add("hidden");
  } else {
    // скрываем «музыкальный» UI
    els.authStatus?.classList.add("hidden");
    loginBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");

    els.layout?.classList.add("hidden");      // прячем сайдбар+основной контент
    els.player?.classList.add("hidden");      // прячем плеер
    els.playlistMain?.classList.add("hidden");
    els.guest?.classList.remove("hidden");    // показываем заглушку
  }
}

function showEmptyPlaylistState() {
  const hasPlaylists = state.playlists.length > 0;
  const emptyMessage = hasPlaylists ? "Pick a playlist from My library to view it." : "No playlists yet — press “＋” to create one.";
  if (els.template) els.template.classList.toggle("hidden", !hasPlaylists);
  setEditMode(false);
  els.name.textContent = "No playlist selected";
  els.description.textContent = "Create or open a playlist to manage tracks.";
  els.trackCount.textContent = "0 track(s)";
  els.privacy.textContent = "Public";
  els.privacy.style.background = "rgba(15,23,42,0.08)";
  els.privacy.style.color = "#0f172a";

  if (els.coverImage) els.coverImage.src = "";
  els.coverImage?.classList.add("hidden");
  els.coverLabel?.classList.remove("hidden");
  els.coverRemove?.classList.add("hidden");
  els.list.innerHTML = "";
  if (els.empty) {
    els.empty.textContent = emptyMessage;
    els.empty.classList.remove("hidden");
  }
  if (els.playlistEmpty) {
    els.playlistEmpty.textContent = emptyMessage;
    els.playlistEmpty.classList.remove("hidden");
  }
  const similarSection = document.querySelector(".similar");
  if (similarSection) similarSection.classList.add("hidden");
  const similarContainer = document.getElementById("similar");
  if (similarContainer) similarContainer.innerHTML = "";
  toggleControls(false);
}

function restorePlaylistState() {
  els.template?.classList.remove("hidden");
  setEditMode(isEditingPlaylist);
  els.playlistEmpty?.classList.add("hidden");
  if (els.empty) {
    els.empty.textContent = defaultEmptyTracksText;
  }
  toggleControls(true);
}


function renderPlaylist() {
  renderLibrary();
  if (!currentPlaylist) {
    showEmptyPlaylistState();
    renderQueue();
    return;
  }
  restorePlaylistState();
  els.name.textContent = currentPlaylist.name;
  els.description.textContent = currentPlaylist.description || "No description yet";
  els.trackCount.textContent = `${currentPlaylist.tracks.length} track(s)`;
  els.privacy.textContent = currentPlaylist.public ? "Public" : "Private";
  els.privacy.style.background = currentPlaylist.public ? "rgba(20,184,166,0.12)" : "rgba(239,68,68,0.12)";
  els.privacy.style.color = currentPlaylist.public ? "#0f766e" : "#b91c1c";
  const privacyBtn = document.getElementById("btn-private-toggle");
  if (privacyBtn) privacyBtn.textContent = currentPlaylist.public ? "Close access" : "Open access";

  if (currentPlaylist.cover) {
    els.coverImage.src = currentPlaylist.cover;
    els.coverImage.classList.remove("hidden");
    els.coverLabel.classList.add("hidden");
  } else {
    els.coverImage.classList.add("hidden");
    els.coverLabel.classList.remove("hidden");
  }
  toggleCoverEditVisibility();

  renderTracks();
  renderSimilar();
  renderQueue();
  if (isEditingPlaylist) {
    if (els.editName) els.editName.value = currentPlaylist.name;
    if (els.editDescription) els.editDescription.value = currentPlaylist.description;
    setEditMode(true);
  }
}

function openInlineEdit() {
  if (!currentPlaylist) return;
  if (els.editName) els.editName.value = currentPlaylist.name;
  if (els.editDescription) els.editDescription.value = currentPlaylist.description;
  setEditMode(true);
  els.editInline?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setEditMode(enabled) {
  isEditingPlaylist = enabled;
  els.editInline?.classList.toggle("hidden", !enabled);
  toggleCoverEditVisibility();
}

function toggleCoverEditVisibility() {
  const hasCover = !!currentPlaylist?.cover;
  const showEditors = isEditingPlaylist && !!currentPlaylist;
  if (els.coverUpload) els.coverUpload.classList.toggle("hidden", !showEditors);
  if (els.coverRemove) els.coverRemove.classList.toggle("hidden", !showEditors || !hasCover);
}

function renderTracks() {
  els.list.innerHTML = "";
  if (!currentPlaylist.tracks.length) {
    els.empty.classList.remove("hidden");
    return;
  }
  els.empty.classList.add("hidden");
  currentPlaylist.tracks.forEach((track, idx) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="cell">#${idx + 1}</div>
      <div class="cell">
        <strong>${track.name}</strong><br />
        <span class="card-sub">${track.artist}</span>
      </div>
      <div class="cell pill-muted">${track.album}</div>
      <div class="cell pill-muted">${formatDate(track.addedAt)}</div>
      <div class="cell action-cell">
        <button type="button" class="icon-btn danger" data-remove="${track.id}" title="Delete">🗑</button>
      </div>
    `;
    els.list.appendChild(row);
  });

  els.list.querySelectorAll("[data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (!ensureSignedIn()) return;
      removeTrack(currentPlaylist.id, btn.dataset.remove);
      renderPlaylist();
      persist();
      showToast("Track removed");
    })
  );
}

function renderSimilar() {
  const container = document.getElementById("similar");
  const section = document.getElementById("similar-block");
  const prevBtn = document.getElementById("similar-prev");
  const nextBtn = document.getElementById("similar-next");
  if (!container || !section) return;
  const items = state.playlists.filter((pl) => pl.id !== currentPlaylist?.id);
  if (!items.length) {
    container.innerHTML = "";
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  container.innerHTML = items
    .map(
      (pl) => `
      <button type="button" class="card similar-card" data-open="${pl.id}" style="text-align:left;">
        ${pl.cover ? `<img src="${pl.cover}" alt="${pl.name}" class="cover-thumb" />` : '<div class="cover-thumb"></div>'}
        <p class="card-title" style="margin:0;">${pl.name}</p>
        <p class="card-sub">${pl.description || "Playlist"}</p>
      </button>`
    )
    .join("");
  container.querySelectorAll("[data-open]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const target = getPlaylist(btn.dataset.open);
      if (!target) return;
      currentPlaylist = target;
      setCurrentPlaylist(target.id);
      renderPlaylist();
      showToast("Opened from Similar");
    })
  );

  function scrollByCard(dir) {
    const card = container.querySelector(".similar-card");
    const width = card ? card.getBoundingClientRect().width + 12 : 220;
    container.scrollTo({
      left: container.scrollLeft + dir * width * 1.4,
      behavior: "smooth"
    });
  }
  prevBtn?.addEventListener("click", () => scrollByCard(-1));
  nextBtn?.addEventListener("click", () => scrollByCard(1));
}

function renderLibrary() {
  const container = document.getElementById("library-list");
  if (!container) return;
  container.innerHTML = state.playlists
    .map(
      (pl) =>
        `<button class="btn ghost" data-pl="${pl.id}" ${
          currentPlaylist && pl.id === currentPlaylist.id ? 'style="border-color: var(--accent);"' : ""
        }>${pl.name}</button>`
    )
    .join("");
  container.querySelectorAll("[data-pl]").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentPlaylist = getPlaylist(btn.dataset.pl);
      setCurrentPlaylist(btn.dataset.pl);
      renderPlaylist();
      showToast("Playlist opened");
    })
  );
}

function renderSuggestions() {
  const query = document.getElementById("track-search").value.trim().toLowerCase();
  if (!query) {
    els.suggestions.innerHTML = "";
    return;
  }
  const matched = sampleTracks.filter(
    (t) => t.name.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)
  );
  els.suggestions.innerHTML = matched
    .slice(0, 5)
    .map((track) => `<button class="btn ghost" data-suggest="${track.id}">${track.name} — ${track.artist}</button>`)
    .join("");
  els.suggestions.querySelectorAll("[data-suggest]").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.getElementById("track-search").value = sampleTracks.find((t) => t.id === btn.dataset.suggest).name;
      handleAddTrack();
    })
  );
}

function handleAddTrack() {
  if (!ensureSignedIn()) return;
  if (!currentPlaylist) {
    showToast("Create a playlist first");
    return;
  }
  const input = document.getElementById("track-search");
  const title = input.value.trim();
  if (!title) return showToast("Enter a track name");
  const normalized = title.toLowerCase();
  const match =
    sampleTracks.find((t) => t.name.toLowerCase() === normalized) ||
    sampleTracks.find((t) => t.artist.toLowerCase() === normalized);
  const base = match || { name: title, artist: "Unknown", album: "Single" };
  const added = addTrackToPlaylist(currentPlaylist.id, base);
  addToQueue(added.id, currentPlaylist.id);
  persist();
  renderPlaylist();
  input.value = "";
  renderSuggestions();
  showToast("Track added to playlist and queue");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU");
}

function renderQueue() {
  els.queueList.innerHTML = "";
  if (!state.queue.length) {
    els.queueEmpty.classList.remove("hidden");
    return;
  }
  els.queueEmpty.classList.add("hidden");
  state.queue.forEach((item, index) => {
    const track = findTrack(item.trackId);
    const el = document.createElement("div");
    el.className = "queue-item";
    el.draggable = true;
    el.dataset.index = index;
    el.innerHTML = `
      <span style="text-align:center;">≡</span>
      <div>
        <strong>${track?.name || "Track"}</strong>
        <div class="card-sub">${track?.artist || "Unknown"}</div>
      </div>
      <span class="pill-muted">${track?.album || "-"}</span>
      <button class="btn ghost" data-remove="${item.id}">✕</button>
    `;
    els.queueList.appendChild(el);
  });

  els.queueList.querySelectorAll("[data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (!ensureSignedIn()) return;
      removeFromQueue(btn.dataset.remove);
      renderQueue();
      showToast("Track removed from queue");
    })
  );

  els.queueList.querySelectorAll(".queue-item").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      if (!ensureSignedIn()) {
        e.preventDefault();
        return;
      }
      item.classList.add("dragging");
      e.dataTransfer.setData("text/plain", item.dataset.index);
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("dragover", (e) => e.preventDefault());
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!ensureSignedIn()) return;
      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = Number(item.dataset.index);
      reorderQueue(from, to);
      renderQueue();
      showToast("Queue updated");
    });
  });
}

function findTrack(id) {
  for (const pl of state.playlists) {
    const found = pl.tracks.find((t) => t.id === id);
    if (found) return found;
  }
  return sampleTracks.find((t) => t.id === id);
}

function setupCoverUpload() {
  if (!els.coverInput) return;
  els.coverInput.addEventListener("change", (e) => {
    if (!ensureSignedIn()) return;
    if (!currentPlaylist) {
      showToast("Create a playlist first");
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updatePlaylistMeta(currentPlaylist.id, { cover: reader.result });
      currentPlaylist.cover = reader.result;
      renderPlaylist();
      showToast("Cover updated");
    };
    reader.readAsDataURL(file);
  });

  if (els.coverDrop) {
    ["dragover", "dragenter"].forEach((ev) =>
      els.coverDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        if (!ensureSignedIn()) return;
        els.coverDrop.style.borderColor = "var(--accent)";
      })
    );
    els.coverDrop.addEventListener("dragleave", () => (els.coverDrop.style.borderColor = ""));
    els.coverDrop.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!ensureSignedIn()) return;
      if (!currentPlaylist) {
        showToast("Create a playlist first");
        return;
      }
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        updatePlaylistMeta(currentPlaylist.id, { cover: reader.result });
        currentPlaylist.cover = reader.result;
        renderPlaylist();
        showToast("Cover updated");
      };
      reader.readAsDataURL(file);
      els.coverDrop.style.borderColor = "";
    });
  }

  if (els.coverRemove) {
    els.coverRemove.addEventListener("click", () => {
      if (!ensureSignedIn()) return;
      if (!currentPlaylist) {
        showToast("Create a playlist first");
        return;
      }
      updatePlaylistMeta(currentPlaylist.id, { cover: "" });
      currentPlaylist.cover = "";
      renderPlaylist();
      showToast("Cover removed");
    });
  }
}

function setupModals() {
  const loginModal = document.getElementById("login-modal");
  const loginBtn = document.getElementById("btn-login");
  const guestLogin = document.getElementById("guest-login");

  loginBtn?.addEventListener("click", () => loginModal.classList.remove("hidden"));
  guestLogin?.addEventListener("click", () => loginModal.classList.remove("hidden"));
  loginBtn?.addEventListener("click", () => loginModal.classList.remove("hidden"));

  document.getElementById("login-cancel")?.addEventListener("click", () => loginModal.classList.add("hidden"));
  document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    signIn(data.get("email"));
    updateAuthUI();
    loginModal.classList.add("hidden");
    showToast("Signed in");
  });
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    signOut();
    currentPlaylist = null;
    setCurrentPlaylist(null);
    renderPlaylist();
    updateAuthUI();
    els.queuePanel?.classList.add("hidden");
    showToast("Signed out");
  });

  const createModal = document.getElementById("create-modal");
  document.getElementById("create-playlist")?.addEventListener("click", () => {
    if (!ensureSignedIn()) return;
    createModal.classList.remove("hidden");
  });
  document.getElementById("create-cancel")?.addEventListener("click", () => createModal.classList.add("hidden"));
  document.getElementById("create-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!ensureSignedIn()) return;
    const data = new FormData(e.target);
    const playlist = createPlaylist({ name: data.get("name"), description: data.get("description") });
    currentPlaylist = playlist;
    setCurrentPlaylist(playlist.id);
    createModal.classList.add("hidden");
    renderPlaylist();
    showToast("Playlist created");
    e.target.reset();
  });
}

function setupActions() {
  document.getElementById("add-from-search")?.addEventListener("click", handleAddTrack);
  document.getElementById("track-search")?.addEventListener("input", renderSuggestions);

  document.getElementById("btn-private-toggle")?.addEventListener("click", () => {
    if (!ensureSignedIn()) return;
    if (!currentPlaylist) {
      showToast("Create a playlist first");
      return;
    }
    updatePlaylistMeta(currentPlaylist.id, { isPublic: !currentPlaylist.public });
    currentPlaylist = getPlaylist(currentPlaylist.id);
    renderPlaylist();
    showToast(currentPlaylist.public ? "Playlist is public" : "Playlist is private");
  });

  document.getElementById("btn-copy-link")?.addEventListener("click", async () => {
    if (!currentPlaylist) {
      showToast("Create a playlist first");
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#${currentPlaylist.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch {
      showToast("Copy manually: " + url);
    }
  });

  document.getElementById("queue-toggle")?.addEventListener("click", () => {
    els.queuePanel.classList.toggle("hidden");
    renderQueue();
  });
  document.getElementById("queue-close")?.addEventListener("click", () => els.queuePanel.classList.add("hidden"));
  document.getElementById("reset-demo")?.addEventListener("click", () => resetDemo());

  document.getElementById("helper-toggle")?.addEventListener("click", () => els.helper.classList.toggle("hidden"));

  document.getElementById("player-play")?.addEventListener("click", (e) => {
    e.target.textContent = e.target.textContent === "▶" ? "⏸" : "▶";
  });

  document.getElementById("download-app")?.addEventListener("click", downloadApp);

  const progress = document.getElementById("player-progress");
  if (progress) {
    styleProgress(progress);
    progress.addEventListener("input", () => styleProgress(progress));
    progress.addEventListener("change", () => showToast(`Seeked to ${progress.value}%`));
  }
  ["edit-meta", "btn-edit-open"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      if (!ensureSignedIn()) return;
      if (!currentPlaylist) {
        showToast("Create a playlist first");
        return;
      }
      openInlineEdit();
    });
  });

  els.editSave?.addEventListener("click", () => {
    if (!ensureSignedIn()) return;
    if (!currentPlaylist) return;
    updatePlaylistMeta(currentPlaylist.id, {
      name: els.editName?.value,
      description: els.editDescription?.value
    });
    currentPlaylist = getPlaylist(currentPlaylist.id);
    renderPlaylist();
    setEditMode(false);
    showToast("Updated playlist info");
  });

  els.editCancel?.addEventListener("click", () => {
    setEditMode(false);
    if (currentPlaylist && els.editName && els.editDescription) {
      els.editName.value = currentPlaylist.name;
      els.editDescription.value = currentPlaylist.description;
    }
  });
}

function init() {
  updateAuthUI();
  renderPlaylist();
  renderSuggestions();
  setupCoverUpload();
  setupModals();
  setupActions();
  persist();
}

document.addEventListener("DOMContentLoaded", init);
