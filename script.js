const DEFAULT_DATA_URL = "gallery.json";
const state = {
  photos: [],
  trash: [],
  favorites: new Set(JSON.parse(localStorage.getItem("auraFavorites") || "[]")),
  albums: JSON.parse(localStorage.getItem("auraAlbums") || "[]"),
  view: "all",
  album: null,
  query: "",
  selected: new Set(),
  selectionMode: false,
  sort: "newest",
  layout: "grid",
  currentIndex: 0,
  lightboxList: []
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const grid = $("#photoGrid");
const emptyState = $("#emptyState");
const selectionBar = $("#selectionBar");
const lightbox = $("#lightbox");
const toast = $("#toast");

function save() {
  localStorage.setItem("auraFavorites", JSON.stringify([...state.favorites]));
  localStorage.setItem("auraAlbums", JSON.stringify(state.albums));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {month:"short", day:"numeric", year:"numeric"}).format(new Date(date));
}

function photoSource(photo) {
  return photo.localData || photo.path || photo.remote;
}

function filteredPhotos() {
  let list = [...state.photos];
  if (state.view === "favorites") list = list.filter(p => state.favorites.has(p.id));
  if (state.view === "recent") list = list.filter(p => (Date.now() - new Date(p.date).getTime()) < 30 * 86400000);
  if (state.view === "screenshots") list = list.filter(p => p.category === "screenshots");
  if (state.view === "album") {
    const a = state.albums.find(x => x.id === state.album);
    list = a ? list.filter(p => a.photos.includes(p.id)) : [];
  }
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter(p => `${p.title} ${p.category} ${p.author || ""}`.toLowerCase().includes(q));
  }
  list.sort((a,b) => state.sort === "oldest"
    ? new Date(a.date) - new Date(b.date)
    : new Date(b.date) - new Date(a.date));
  return list;
}

function renderSidebar() {
  $("#allCount").textContent = state.photos.length;
  $("#favCount").textContent = state.photos.filter(p => state.favorites.has(p.id)).length;
  $("#trashCount").textContent = state.trash.length;

  const list = $("#albumList");
  list.innerHTML = state.albums.map(a => `
    <button class="album-list-item" data-album="${a.id}">
      <span class="album-dot">✦</span><span>${escapeHtml(a.name)}</span><b>${a.photos.length}</b>
    </button>`).join("");

  $$(".album-list-item").forEach(btn => btn.addEventListener("click", () => {
    state.view = "album"; state.album = btn.dataset.album; state.selected.clear(); render();
    closeSidebar();
  }));
}

function render() {
  const list = filteredPhotos();
  const activeTitle = state.view === "favorites" ? "Favorites"
    : state.view === "recent" ? "Recently Added"
    : state.view === "screenshots" ? "Screenshots"
    : state.view === "trash" ? "Recycle Bin"
    : state.view === "album" ? (state.albums.find(a=>a.id===state.album)?.name || "Album")
    : "All Photos";

  $("#pageTitle").textContent = activeTitle;
  $("#pageSubtitle").textContent = state.view === "trash"
    ? "Deleted photos stay here until you restore or permanently delete them."
    : state.view === "favorites" ? "Photos you marked as favorites."
    : "Your memories, beautifully organized.";

  $$(".side-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  $("#albumHero").classList.toggle("visible", state.view === "album");
  if (state.view === "album") {
    const a = state.albums.find(x => x.id === state.album);
    $("#heroAlbumName").textContent = a?.name || "Album";
    $("#heroAlbumCount").textContent = `${a?.photos.length || 0} photo${(a?.photos.length||0)===1?"":"s"}`;
  }

  $("#sectionLabel").textContent = state.view === "trash" ? "RECYCLE BIN" : state.query ? "SEARCH RESULTS" : "YOUR PHOTOS";
  $("#visibleCount").textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;
  emptyState.hidden = list.length !== 0;
  $(".photo-section").style.display = list.length ? "" : "none";

  if (state.view === "trash") renderTrash();
  else {
    grid.classList.toggle("list-mode", state.layout === "list");
    grid.innerHTML = list.map((p,i) => `
      <article class="photo-card ${state.selected.has(p.id) ? "selected" : ""}" data-id="${p.id}" style="animation-delay:${Math.min(i*30,240)}ms">
        <img src="${escapeAttr(photoSource(p))}" alt="${escapeAttr(p.title)}" onerror="this.src='${escapeAttr(p.remote || p.path)}'">
        <span class="check">${state.selected.has(p.id) ? "✓" : ""}</span>
        <button class="heart" data-heart="${p.id}" title="Favorite">${state.favorites.has(p.id) ? "♥" : "♡"}</button>
        <div class="caption"><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(p.category)} • ${formatDate(p.date)}</small></div>
      </article>`).join("");
    $$(".photo-card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest("[data-heart]")) return;
        const id = card.dataset.id;
        if (state.selectionMode) toggleSelected(id);
        else openLightbox(id);
      });
    });
    $$("[data-heart]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation(); toggleFavorite(b.dataset.heart);
    }));
  }
  selectionBar.classList.toggle("visible", state.selectionMode);
  $("#selectedCount").textContent = state.selected.size;
  document.body.classList.toggle("selection-mode", state.selectionMode);
  renderSidebar();
}

function renderTrash() {
  grid.classList.toggle("list-mode", false);
  grid.innerHTML = state.trash.map((p,i) => `
    <article class="photo-card" data-trash-id="${p.id}" style="animation-delay:${i*30}ms">
      <img src="${escapeAttr(photoSource(p))}" alt="${escapeAttr(p.title)}">
      <div class="caption"><strong>${escapeHtml(p.title)}</strong><small>Deleted • ${formatDate(p.deletedAt || p.date)}</small></div>
      <button class="heart restore" title="Restore" data-restore="${p.id}">↶</button>
    </article>`).join("");
  $$(".photo-card[data-trash-id]").forEach(card => card.addEventListener("click", e => {
    if (e.target.closest("[data-restore]")) return;
    openTrashLightbox(card.dataset.trashId);
  }));
  $$("[data-restore]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); restorePhoto(b.dataset.restore); }));
}

function toggleFavorite(id) {
  state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
  save(); render(); showToast(state.favorites.has(id) ? "Added to Favorites" : "Removed from Favorites");
}

function toggleSelected(id) {
  state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
  render();
}

function openLightbox(id) {
  state.lightboxList = filteredPhotos();
  state.currentIndex = Math.max(0, state.lightboxList.findIndex(p => p.id === id));
  updateLightbox();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden","false");
}

function openTrashLightbox(id) {
  state.lightboxList = state.trash;
  state.currentIndex = Math.max(0, state.trash.findIndex(p => p.id === id));
  updateLightbox(true);
  lightbox.classList.add("open");
}

function updateLightbox(isTrash=false) {
  const p = state.lightboxList[state.currentIndex];
  if (!p) return;
  $("#lbImage").src = photoSource(p);
  $("#lbImage").alt = p.title;
  $("#lbTitle").textContent = p.title;
  $("#lbCategory").textContent = isTrash ? "Recycle Bin" : p.category;
  $("#lbDate").textContent = isTrash ? `Deleted • ${formatDate(p.deletedAt || p.date)}` : `Added • ${formatDate(p.date)}`;
  $("#lbFavorite").textContent = state.favorites.has(p.id) ? "♥" : "♡";
  $("#lbTrash").textContent = isTrash ? "Delete permanently" : "Move to bin";
  $("#lbDownload").style.display = isTrash ? "none" : "";
  $("#lbFavorite").style.display = isTrash ? "none" : "";
  $("#lbTrash").onclick = () => isTrash ? permanentlyDelete(p.id) : moveToTrash(p.id);
  $("#lbFavorite").onclick = () => toggleFavorite(p.id);
  $("#lbDownload").onclick = () => downloadPhoto(p);
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden","true");
}

function moveLightbox(step) {
  if (!state.lightboxList.length) return;
  state.currentIndex = (state.currentIndex + step + state.lightboxList.length) % state.lightboxList.length;
  updateLightbox(state.view === "trash");
}

function moveToTrash(id) {
  const index = state.photos.findIndex(p => p.id === id);
  if (index < 0) return;
  const [photo] = state.photos.splice(index,1);
  photo.deletedAt = new Date().toISOString();
  state.trash.unshift(photo);
  state.selected.delete(id);
  closeLightbox(); render(); showToast("Photo moved to Recycle Bin");
}

function restorePhoto(id) {
  const index = state.trash.findIndex(p => p.id === id);
  if (index < 0) return;
  const [photo] = state.trash.splice(index,1);
  delete photo.deletedAt;
  state.photos.push(photo);
  render(); showToast("Photo restored");
}

function permanentlyDelete(id) {
  state.trash = state.trash.filter(p => p.id !== id);
  closeLightbox(); render(); showToast("Photo permanently deleted");
}

function deleteSelected() {
  [...state.selected].forEach(id => moveToTrash(id));
  state.selected.clear();
  state.selectionMode = false;
  render();
}

function createAlbum() {
  const name = $("#albumNameInput").value.trim();
  if (!name) return;
  if (state.albums.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    showToast("An album with this name already exists"); return;
  }
  const album = {id:"album-"+Date.now(), name, photos:[]};
  state.albums.push(album);
  save(); closeModal("#albumModal"); $("#albumNameInput").value="";
  render(); showToast(`Album "${name}" created`);
}

function addSelectedToAlbum(albumId) {
  const album = state.albums.find(a => a.id === albumId);
  if (!album) return;
  state.selected.forEach(id => { if (!album.photos.includes(id)) album.photos.push(id); });
  save(); closeModal("#pickerModal"); state.selectionMode=false; state.selected.clear();
  render(); showToast(`Added photos to ${album.name}`);
}

function showAlbumPicker() {
  if (!state.selected.size) return showToast("Select at least one photo first");
  $("#pickerList").innerHTML = state.albums.length
    ? state.albums.map(a=>`<button data-pick="${a.id}"><span>${escapeHtml(a.name)}</span><b>${a.photos.length}</b></button>`).join("")
    : `<p style="color:var(--muted);font-size:.85rem">No albums yet. Create one first.</p>`;
  $$("#pickerList [data-pick]").forEach(b => b.addEventListener("click",()=>addSelectedToAlbum(b.dataset.pick)));
  openModal("#pickerModal");
}

function handleFiles(files) {
  [...files].forEach(file => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
      const p = {id:"local-"+Date.now()+"-"+Math.random().toString(16).slice(2), title:file.name.replace(/\.[^/.]+$/,""), category:"uploads", date:new Date().toISOString(), path:"", remote:"", localData:e.target.result, author:"You"};
      state.photos.unshift(p);
      render(); showToast(`${file.name} added to gallery`);
    };
    reader.readAsDataURL(file);
  });
}

function downloadPhoto(p) {
  const a = document.createElement("a"); a.href = photoSource(p); a.download = `${p.title.replace(/\s+/g,"-")}.png`; a.target="_blank"; a.click();
}

function openModal(id){$(id).classList.add("open");$(id).setAttribute("aria-hidden","false")}
function closeModal(id){$(id).classList.remove("open");$(id).setAttribute("aria-hidden","true")}
function closeSidebar(){$("#sidebar").classList.remove("open");$("#overlay").classList.remove("open")}

function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escapeAttr(s=""){return escapeHtml(s)}

async function init() {
  try {
    const res = await fetch(DEFAULT_DATA_URL);
    state.photos = await res.json();
  } catch {
    state.photos = [];
    showToast("Could not load gallery.json");
  }
  // Keep a small demo state only in memory; user uploads are intentionally local to this browser session.
  render();
}

$$(".side-item[data-view]").forEach(btn => btn.addEventListener("click", () => {
  state.view = btn.dataset.view; state.album=null; state.query=""; $("#searchInput").value="";
  state.selected.clear(); state.selectionMode=false; render(); closeSidebar();
}));
$("#newAlbumBtn").onclick = () => openModal("#albumModal");
$("#newAlbumSide").onclick = () => openModal("#albumModal");
$("#createAlbum").onclick = createAlbum;
$("#modalClose").onclick = () => closeModal("#albumModal");
$("#modalCancel").onclick = () => closeModal("#albumModal");
$("#pickerClose").onclick = () => closeModal("#pickerModal");
$("#albumSelected").onclick = showAlbumPicker;
$("#favoriteSelected").onclick = () => { state.selected.forEach(id=>state.favorites.add(id)); save(); state.selected.clear(); state.selectionMode=false; render(); showToast("Selected photos added to Favorites"); };
$("#trashSelected").onclick = deleteSelected;
$("#cancelSelect").onclick = () => {state.selected.clear();state.selectionMode=false;render()};
$("#selectBtn").onclick = () => {state.selectionMode=!state.selectionMode;state.selected.clear();render()};
$("#sortBtn").onclick = () => {state.sort=state.sort==="newest"?"oldest":"newest";$("#sortBtn").textContent=state.sort==="newest"?"Newest ▾":"Oldest ▾";render()};
$("#layoutBtn").onclick = () => {state.layout=state.layout==="grid"?"list":"grid";$("#layoutBtn").textContent=state.layout==="grid"?"▦":"☷";render()};
$("#searchInput").oninput = e => {state.query=e.target.value.trim();state.view="all";render()};
$("#themeBtn").onclick = () => {document.documentElement.dataset.theme=document.documentElement.dataset.theme==="dark"?"":"dark";localStorage.setItem("auraTheme",document.documentElement.dataset.theme||"light")};
$("#mobileMenu").onclick = () => {$("#sidebar").classList.add("open");$("#overlay").classList.add("open")};
$("#overlay").onclick = closeSidebar;
$("#fileInput").onchange = e => handleFiles(e.target.files);
$("#emptyUpload").onchange = e => handleFiles(e.target.files);
$("#lbClose").onclick = closeLightbox;
$("#lbPrev").onclick = () => moveLightbox(-1);
$("#lbNext").onclick = () => moveLightbox(1);
lightbox.onclick = e => {if(e.target===lightbox)closeLightbox()};
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeLightbox();closeModal("#albumModal");closeModal("#pickerModal");}
  if(lightbox.classList.contains("open")){if(e.key==="ArrowLeft")moveLightbox(-1);if(e.key==="ArrowRight")moveLightbox(1)}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus()}
});
const savedTheme=localStorage.getItem("auraTheme"); if(savedTheme==="dark")document.documentElement.dataset.theme="dark";
init();
