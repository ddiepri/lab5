import { state, persist, signIn, signOut, toggleFollow } from "./state.js";

const toast = document.getElementById("toast");

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function downloadApp() {
  const content = `Darify demo bundle
Version: 0.1
This is a placeholder download for the coursework demo (HTML/CSS/JS).`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "darify-demo.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Demo bundle downloaded");
}


function renderListening() {
  const container = document.getElementById("last-listening");
  if (!container) return;
  container.innerHTML = state.lastListening
    .map(
      (item) => `
      <div class="circle-card" style="scroll-snap-align:start;">
        <div class="circle">♫</div>
        <p class="card-title">${item.title}</p>
        <p class="card-sub">${item.description}</p>
      </div>`
    )
    .join("");
}

function renderReleases() {
  const container = document.getElementById("releases");
  if (!container) return;
  container.innerHTML = state.releases
    .map(
      (item) => `
      <div class="circle-card" style="scroll-snap-align:start;">
        <div class="circle">◎</div>
        <p class="card-title">${item.title}</p>
        <p class="card-sub">${item.artist}</p>
      </div>`
    )
    .join("");
}

function wireDownload() {
  const btn = document.getElementById("download-app");
  if (btn) btn.addEventListener("click", downloadApp);
}

function renderArtists(filter = "") {
  const list = document.getElementById("artist-list");
  const empty = document.getElementById("artist-empty");
  if (!list) return;
  const query = filter.trim().toLowerCase();
  const artists = state.artists.filter((a) => a.name.toLowerCase().includes(query));
  if (!artists.length) {
    list.innerHTML = "";
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent = query ? `No artists match “${filter}”.` : "No artists found. Try another name.";
    }
    return;
  }
  empty?.classList.add("hidden");
  list.innerHTML = artists
    .map(
      (artist) => `
      <div class="circle-card" style="scroll-snap-align:start;">
        <div class="circle avatar" aria-hidden="true">
          <span>${artist.name.slice(0, 2).toUpperCase()}</span>
        </div>
        <p class="card-title">${artist.name}</p>
        <p class="card-sub">${artist.tagline || ""}</p>
        ${
          state.user.signedIn
            ? `<button class="btn ghost" data-follow="${artist.id}">
                ${state.followedArtists.includes(artist.id) ? "Following" : "Follow"}
              </button>`
            : ""
        }
      </div>`
    )
    .join("");
  if (state.user.signedIn) {
    list.querySelectorAll("[data-follow]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const artistId = btn.getAttribute("data-follow");
        const nowFollowing = toggleFollow(artistId);
        persist();
        renderArtists(filter);
        showToast(nowFollowing ? "Followed" : "Unfollowed");
      })
    );
  }
}

function styleProgress(range) {
  if (!range) return;
  const val = range.value;
  range.style.background = `linear-gradient(90deg, var(--accent) ${val}%, rgba(15,23,42,0.1) 0)`;
}

function wireProgress() {
  const range = document.getElementById("player-progress");
  if (!range) return;
  styleProgress(range);
  range.addEventListener("input", () => styleProgress(range));
  range.addEventListener("change", () => {
    styleProgress(range);
    showToast(`Seeked to ${range.value}%`);
  });
}

function setupActions() {
  document.getElementById("player-play")?.addEventListener("click", (e) => {
    e.target.textContent = e.target.textContent === "▶" ? "⏸" : "▶";
  });

  const artistSearchInput = document.getElementById("artist-search");
  const artistSearchBtn = document.getElementById("artist-search-btn");
  const runSearch = () => renderArtists(artistSearchInput?.value || "");
  artistSearchBtn?.addEventListener("click", runSearch);
  artistSearchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });
}

function updateAuthUI() {
  const authStatus = document.getElementById("auth-status");
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");

  if (state.user.signedIn) {
    if (authStatus) {
      authStatus.classList.remove("hidden");
      authStatus.textContent = `Signed in as ${state.user.email}`;
    }
    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
  } else {
    authStatus?.classList.add("hidden");
    loginBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
  }
}


function setupAuth() {
  const loginModal = document.getElementById("login-modal");
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");

  // открыть модалку
  loginBtn?.addEventListener("click", () => {
    loginModal?.classList.remove("hidden");
  });

  // закрыть модалку
  document.getElementById("login-cancel")?.addEventListener("click", () => {
    loginModal?.classList.add("hidden");
  });

  // submit формы логина
  document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const email = data.get("email");

    signIn(email);
    updateAuthUI();
    renderArtists(document.getElementById("artist-search")?.value || "");
    loginModal?.classList.add("hidden");
    showToast("Signed in");
  });

  // logout
  logoutBtn?.addEventListener("click", () => {
    signOut();
    updateAuthUI();
    renderArtists(document.getElementById("artist-search")?.value || "");
    showToast("Signed out");
  });
}

function init() {
  updateAuthUI();
  setupAuth();
  renderListening();
  renderReleases();
  renderArtists();
  wireDownload();
  wireProgress();
  persist();
  setupActions();
}

document.addEventListener("DOMContentLoaded", init);
