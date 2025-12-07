// state.js - shared application state and helpers for the Darify demo

const STORAGE_KEY = "darify-state-v2";

const sampleTracks = [
  { id: "t1", name: "Praise The Lord", artist: "A$AP Rocky", album: "Testing", duration: "3:25" },
  { id: "t2", name: "Sundress", artist: "A$AP Rocky", album: "Single", duration: "3:12" },
  { id: "t3", name: "SICKO MODE", artist: "Travis Scott", album: "Astroworld", duration: "5:13" },
  { id: "t4", name: "HIGHEST IN THE ROOM", artist: "Travis Scott", album: "Single", duration: "2:57" },
  { id: "t5", name: "HUMBLE.", artist: "Kendrick Lamar", album: "DAMN.", duration: "2:57" },
  { id: "t6", name: "N95", artist: "Kendrick Lamar", album: "Mr. Morale & the Big Steppers", duration: "3:15" },
  { id: "t7", name: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: "3:20" },
  { id: "t8", name: "Save Your Tears", artist: "The Weeknd", album: "After Hours", duration: "3:36" },
  { id: "t9", name: "Bad Guy", artist: "Billie Eilish", album: "When We All Fall Asleep", duration: "3:14" },
  { id: "t10", name: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: "3:23" },
  { id: "t11", name: "See You Again", artist: "Tyler, The Creator", album: "Flower Boy", duration: "3:00" },
  { id: "t12", name: "Nights", artist: "Frank Ocean", album: "Blonde", duration: "5:07" }
];

const defaultState = {
  user: { signedIn: false, email: "", name: "" },

  // раньше было "p1"
  currentPlaylistId: null,

  // вообще без плейлистов по умолчанию
  playlists: [],

  // пустая очередь
  queue: [],

  artists: [
    { id: "a1", name: "Kendrick Lamar", followers: "29.8M", tagline: "West Coast storytelling and sharp bars." },
    { id: "a2", name: "The Weeknd", followers: "49.2M", tagline: "Dark R&B with stadium-scale hooks." },
    { id: "a3", name: "Billie Eilish", followers: "58.3M", tagline: "Whispery pop with cinematic edges." },
    { id: "a4", name: "Dua Lipa", followers: "32.4M", tagline: "Disco-pop grooves with global reach." },
    { id: "a5", name: "A$AP Rocky", followers: "14.1M", tagline: "Harlem grit meets luxury rap." },
    { id: "a6", name: "Travis Scott", followers: "26.4M", tagline: "Psychedelic trap and stadium energy." },
    { id: "a7", name: "Tyler, The Creator", followers: "18.2M", tagline: "Genre-blending with bold aesthetics." },
    { id: "a8", name: "Frank Ocean", followers: "19.5M", tagline: "Introspective R&B storyteller." }
  ],
  followedArtists: [],
  lastListening: [
    { id: "ll1", title: "Playlist #1", description: "Indie mix", cover: "" },
    { id: "ll2", title: "Playlist #2", description: "Focus beats", cover: "" },
    { id: "ll3", title: "Playlist #3", description: "Soft piano", cover: "" },
    { id: "ll4", title: "Playlist #4", description: "Night jazz", cover: "" }
  ],
  releases: [
    { id: "r1", title: "Album #1", artist: "Nova Echo" },
    { id: "r2", title: "Album #2", artist: "Astra Lane" },
    { id: "r3", title: "Album #3", artist: "Golden Hour" },
    { id: "r4", title: "Album #4", artist: "Paper Trails" }
  ]
};

const state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return mergeDefault(parsed);
  } catch (_) {
    return structuredClone(defaultState);
  }
}

function mergeDefault(current) {
  return {
    ...structuredClone(defaultState),
    ...current,
    playlists: current.playlists ?? structuredClone(defaultState.playlists),
    queue: current.queue ?? structuredClone(defaultState.queue),
    artists: current.artists ? structuredClone(current.artists) : structuredClone(defaultState.artists),
    followedArtists: current.followedArtists ?? structuredClone(defaultState.followedArtists),
    lastListening: current.lastListening ?? structuredClone(defaultState.lastListening),
    releases: current.releases ?? structuredClone(defaultState.releases)
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function signIn(email) {
  state.user = { signedIn: true, email, name: email.split("@")[0] || "Listener" };
  persist();
  return state.user;
}

function signOut() {
  state.user = { signedIn: false, email: "", name: "" };
  persist();
}

function toggleFollow(artistId) {
  const idx = state.followedArtists.indexOf(artistId);
  if (idx >= 0) {
    state.followedArtists.splice(idx, 1);
    persist();
    return false;
  }
  state.followedArtists.push(artistId);
  persist();
  return true;
}

function getArtist(id) {
  return state.artists.find((a) => a.id === id);
}

function getPlaylist(id) {
  return state.playlists.find((p) => p.id === id);
}

function setCurrentPlaylist(id) {
  state.currentPlaylistId = id;
  persist();
}

function createPlaylist({ name, description }) {
  const id = `p-${crypto.randomUUID?.() || Date.now()}`;
  const playlist = {
    id,
    name: name || "New playlist",
    description: description || "Just created",
    public: true,
    cover: "",
    tracks: []
  };
  state.playlists.unshift(playlist);
  state.currentPlaylistId = id;
  persist();
  return playlist;
}

function updatePlaylistMeta(id, { name, description, cover, isPublic }) {
  const playlist = getPlaylist(id);
  if (!playlist) return;
  if (name !== undefined) playlist.name = name;
  if (description !== undefined) playlist.description = description;
  if (cover !== undefined) playlist.cover = cover;
  if (isPublic !== undefined) playlist.public = isPublic;
  persist();
  return playlist;
}

function addTrackToPlaylist(playlistId, track) {
  const playlist = getPlaylist(playlistId);
  if (!playlist) return;
  const today = new Date().toISOString().slice(0, 10);
  const id = track.id || `t-${crypto.randomUUID?.() || Date.now()}`;
  const normalized = {
    id,
    name: track.name,
    artist: track.artist || "Unknown",
    album: track.album || "Single",
    addedAt: track.addedAt || today
  };
  playlist.tracks.push(normalized);
  persist();
  return normalized;
}

function removeTrack(playlistId, trackId) {
  const playlist = getPlaylist(playlistId);
  if (!playlist) return;
  playlist.tracks = playlist.tracks.filter((t) => t.id !== trackId);
  persist();
}

function addToQueue(trackId, playlistId) {
  const id = `q-${crypto.randomUUID?.() || Date.now()}`;
  state.queue.push({ id, trackId, playlistId });
  persist();
  return id;
}

function removeFromQueue(queueId) {
  state.queue = state.queue.filter((q) => q.id !== queueId);
  persist();
}

function reorderQueue(fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.queue.length || toIndex >= state.queue.length) return;
  const [item] = state.queue.splice(fromIndex, 1);
  state.queue.splice(toIndex, 0, item);
  persist();
}

function resetDemo() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

export {
  state,
  sampleTracks,
  loadState,
  persist,
  signIn,
  signOut,
  toggleFollow,
  getArtist,
  getPlaylist,
  setCurrentPlaylist,
  createPlaylist,
  updatePlaylistMeta,
  addTrackToPlaylist,
  removeTrack,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  resetDemo
};
