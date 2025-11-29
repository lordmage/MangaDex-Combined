// ==UserScript==
// @name         MangaDex++ Enhanced v2.5.5 (Tag Blacklist, Stable Controls, Hide Read Fixed)
// @version      2.5.5
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @description  Read / Ignore / Clear buttons on every manga card, tag blacklist, export/import, feed unread detection, no duplicate control bars, stable filtering.
// @author       @ Theo1996, MangaDexPP, patched by Workik
// @homepageURL  https://github.com/lordmage/MangaDex-Combined
// @updateURL    http://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @downloadURL  http://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @match        https://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @match        https://mangadex.org/*
// @grant        none
// ==/UserScript==
/* global localStorage, URL, Blob, FileReader, fetch */
/* eslint-disable no-unused-vars */

(function () {
  "use strict";

  /* ===================== CONFIG / STATE ===================== */
  const READ_BUTTON_COLOR = "#13ab493d";
  const IGNORE_BUTTON_COLOR = "#ab13133d";
  const UNMARKED_BUTTON_COLOR = "#4242cd3d";
  const HIDE_ALL_READ_BUTTON_COLOR = "#ff80003d";
  const SETTINGS_BUTTON_COLOR = "#6b72803d";
  const DOES_HIDE_ALL_READ = true;

  let hideRead = false;
  let hideIgnore = true;
  let hideUnmarked = false;
  let hideAllRead = true;

  // Tag blacklist storage key
  const TAG_BLACKLIST_KEY = "mangadexpp_tag_blacklist";

  const API_REQUEST_INTERVAL = 500;
  const MAX_BATCH = 100;
  const MIN_DELAY_BETWEEN_API = 300;
  let queue = [];
  let lastAPICall = 0;

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  /* ===================== Helpers: tags + storage ===================== */
  const safeLower = v => (v || "").toString().toLowerCase();

  function loadTagBlacklist() {
    try {
      return JSON.parse(localStorage.getItem(TAG_BLACKLIST_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function saveTagBlacklist(arr) {
    localStorage.setItem(TAG_BLACKLIST_KEY, JSON.stringify(arr || []));
  }
  let tagBlacklist = loadTagBlacklist();

  function addTagToBlacklist(tag) {
    const t = safeLower(tag).trim();
    if (!t) return;
    if (!tagBlacklist.includes(t)) {
      tagBlacklist.push(t);
      saveTagBlacklist(tagBlacklist);
      renderTagUI();
      queueVisibleIdsForMetadata();
      applyFilters();
    }
  }
  function removeTagFromBlacklist(tag) {
    tagBlacklist = tagBlacklist.filter(x => x !== safeLower(tag));
    saveTagBlacklist(tagBlacklist);
    renderTagUI();
    queueVisibleIdsForMetadata();
    applyFilters();
  }

  /* ===================== Export / Import ===================== */
  function exportLocalStorage() {
    try {
      const data = JSON.stringify(localStorage, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mangadexpp-localstorage.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed — see console.");
    }
  }
  function importLocalStorage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(r.result);
          Object.entries(parsed).forEach(([k, v]) => localStorage.setItem(k, v));
          alert("Import complete. Refresh if needed.");
        } catch (err) {
          console.error("Import failed", err);
          alert("Invalid JSON file.");
        }
      };
      r.readAsText(f);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  /* ===================== Settings cog + Tag UI ===================== */
  function createSettingsCog() {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.classList.add("mangadexpp-settings-container");

    const btn = document.createElement("input");
    btn.type = "button";
    btn.value = "⚙";
    btn.title = "MangaDex++ Settings";
    btn.style.padding = "0 0.8em";
    btn.style.marginLeft = "6px";
    btn.style.borderRadius = "4px";
    btn.style.backgroundColor = SETTINGS_BUTTON_COLOR;
    btn.style.cursor = "pointer";

    const menu = document.createElement("div");
    menu.style.display = "none";
    menu.style.position = "absolute";
    menu.style.top = "110%";
    menu.style.left = "0";
    menu.style.background = "#1a1a1a";
    menu.style.border = "1px solid #333";
    menu.style.borderRadius = "6px";
    menu.style.zIndex = "999999";
    menu.style.minWidth = "280px";
    menu.style.padding = "8px";
    menu.style.boxSizing = "border-box";
    menu.style.color = "#eee";

    // Export / Import
    const titleData = document.createElement("div"); titleData.textContent = "Data"; titleData.style.fontWeight = "700"; menu.appendChild(titleData);
    const exBtn = document.createElement("button"); exBtn.textContent = "Export Data"; exBtn.style.width = "100%"; exBtn.style.marginBottom = "6px"; exBtn.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); exportLocalStorage(); }; menu.appendChild(exBtn);
    const imBtn = document.createElement("button"); imBtn.textContent = "Import Data"; imBtn.style.width = "100%"; imBtn.style.marginBottom = "10px"; imBtn.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); importLocalStorage(); }; menu.appendChild(imBtn);

    // Tag blacklist UI
    const tagTitle = document.createElement("div"); tagTitle.textContent = "Tag blacklist (auto-ignore)"; tagTitle.style.fontWeight = "700"; tagTitle.style.marginTop = "6px"; menu.appendChild(tagTitle);
    const tagListContainer = document.createElement("div"); tagListContainer.style.maxHeight = "180px"; tagListContainer.style.overflow = "auto"; tagListContainer.style.marginBottom = "8px"; menu.appendChild(tagListContainer);

    const addRow = document.createElement("div"); addRow.style.display = "flex"; addRow.style.gap = "6px";
    const addInput = document.createElement("input"); addInput.type = "text"; addInput.placeholder = "tag name (e.g. boys' love)"; addInput.style.flex = "1"; addInput.style.padding = "6px"; addInput.style.borderRadius = "4px"; addInput.style.border = "1px solid #444";
    const addBtn = document.createElement("button"); addBtn.textContent = "Add"; addBtn.style.padding = "6px 8px"; addBtn.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); const v = addInput.value.trim(); if (v) { addTagToBlacklist(v); addInput.value=""; } };
    addRow.appendChild(addInput); addRow.appendChild(addBtn);
    menu.appendChild(addRow);

    function renderTagList() {
      tagListContainer.innerHTML = "";
      const list = tagBlacklist || [];
      if (list.length === 0) {
        const none = document.createElement("div"); none.textContent = "No tags blacklisted."; none.style.color = "#999"; tagListContainer.appendChild(none);
        return;
      }
      list.forEach(tag => {
        const row = document.createElement("div");
        row.style.display = "flex"; row.style.justifyContent = "space-between"; row.style.alignItems = "center"; row.style.padding = "6px"; row.style.borderBottom = "1px solid #333";
        const t = document.createElement("div"); t.textContent = tag; t.style.color = "#eee";
        const rem = document.createElement("button"); rem.textContent = "Remove"; rem.style.cursor="pointer"; rem.onclick = (e) => { e.preventDefault(); e.stopPropagation(); removeTagFromBlacklist(tag); };
        row.appendChild(t); row.appendChild(rem); tagListContainer.appendChild(row);
      });
      const clearAll = document.createElement("button"); clearAll.textContent = "Clear all"; clearAll.style.width = "100%"; clearAll.style.marginTop = "6px"; clearAll.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); tagBlacklist=[]; saveTagBlacklist([]); renderTagList(); applyFilters(); }; menu.appendChild(clearAll);
    }

    btn.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      menu.style.display = menu.style.display === "block" ? "none" : "block";
      if (menu.style.display === "block") renderTagList();
    });

    wrapper._renderTagUI = renderTagList;
    wrapper.appendChild(btn); wrapper.appendChild(menu);
    document.addEventListener("click", ()=>{ try{ menu.style.display = "none"; }catch(e){} });
    return wrapper;
  }

  function renderTagUI() {
    const cog = document.querySelector(".mangadexpp-settings-container");
    if (cog && typeof cog._renderTagUI === "function") cog._renderTagUI();
  }

  /* ===================== Controls row (per-title) ===================== */
  function createControlsRow(entryID) {
    const container = document.createElement("div");
    container.className = "mangadexpp-controls";
    container.style.marginTop = "6px";
    container.style.display = "flex";
    container.style.gap = "6px";

    // block bubbling so clicks don't navigate
    container.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); return false; });

    function mk(label, cls, cb) {
      const b = document.createElement("input");
      b.type = "button"; b.value = label; b.className = cls; b.setAttribute("entryid", entryID);
      b.style.padding = "0 8px"; b.style.borderRadius = "4px"; b.style.cursor = "pointer"; b.style.background = "transparent";
      b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); cb(entryID); applyFilters(); return false; });
      return b;
    }

    container.appendChild(mk("Read", "mangadexpp-read", id => localStorage.setItem(id, "1")));
    container.appendChild(mk("Ignore", "mangadexpp-ignore", id => localStorage.setItem(id, "-1")));
    container.appendChild(mk("Clear", "mangadexpp-clear", id => localStorage.removeItem(id)));

    return container;
  }

  /* ===================== ID helpers & insertion ===================== */
  function extractId(href) {
    if (!href) return null;
    const m = href.match(UUID_RE); if (m) return m[0];
    const parts = href.split("/"); for (const p of parts) if (p && p.length >= 10) return p;
    return null;
  }

  function getCandidateContainerForAnchor(a) {
    // Expanded to include new /titles/latest cards (.md-card)
    return (
      a.closest(".chapter-feed__container") ||
      a.closest(".manga-card") ||
      a.closest(".md-card") ||          // NEW: main site card class
      a.closest(".group.md-card") ||    // NEW variant
      a.closest("li") ||
      a.closest("article") ||
      a.closest(".card") ||
      a.parentElement
    );
  }

  function insertControlsUnderTitleForAnchor(a) {
    try {
      if (a.closest(".mangadexpp-controls")) return;
      const href = a.getAttribute("href") || a.href || "";
      const id = extractId(href);
      if (!id) return;
      const container = getCandidateContainerForAnchor(a);
      if (!container) return;
      if (container.querySelector(`.mangadexpp-controls input[entryid="${id}"]`)) return;

      // Prefer to insert under visible title anchor
      const title =
        container.querySelector(".chapter-feed__title") ||
        container.querySelector(".title") ||
        container.querySelector("a[href*='/title/']") || // ensure anchor inside card
        a;

      const controls = createControlsRow(id);
      try { title.parentNode.insertBefore(controls, title.nextSibling); } catch (e) { container.appendChild(controls); }
    } catch (e) {
      // swallow
    }
  }

  function addControlsToAll() {
    Array.from(document.querySelectorAll("a[href*='/title/']")).forEach(a => {
      if (a.closest("nav") || a.closest("header") || a.closest(".mangadexpp-settings-container")) return;
      insertControlsUnderTitleForAnchor(a);
    });
  }

  /* ===================== Feed unread detection (HideAllRead) ===================== */
  function hasUnreadInFeedContainer(container) {
    const list = container.querySelector(".chapter-feed__chapters-list");
    if (!list) return null; // can't decide
    const unread = list.querySelector(".readMarker:not(.opacity-40)");
    return !!unread;
  }

  function hideAllReadFeed() {
    if (!DOES_HIDE_ALL_READ) return;
    document.querySelectorAll(".chapter-feed__container").forEach(cont => {
      if (cont.closest(".layout-container")) { cont.style.display = ""; return; }
      if (!hideAllRead) { if (cont.hasAttribute("feed-allread-hide")) { cont.removeAttribute("feed-allread-hide"); cont.style.display=""; } return; }
      const unread = hasUnreadInFeedContainer(cont);
      // unread === null => skip (can't determine)
      if (unread === null) return;
      const allRead = unread === false;
      if (allRead) { cont.style.display = "none"; cont.setAttribute("feed-allread-hide", "true"); }
      else { if (cont.hasAttribute("feed-allread-hide")) { cont.removeAttribute("feed-allread-hide"); cont.style.display=""; } }
    });
  }

  /* ===================== Filtering (safe unmarked) ===================== */
  function syncColors(row, flag) {
    try {
      const readBtn = row.querySelector(".mangadexpp-read");
      const ignoreBtn = row.querySelector(".mangadexpp-ignore");
      if (readBtn) readBtn.style.background = flag === "1" ? READ_BUTTON_COLOR : "transparent";
      if (ignoreBtn) ignoreBtn.style.background = flag === "-1" ? IGNORE_BUTTON_COLOR : "transparent";
    } catch (e) {}
  }

  function isMangaContainer(cont) {
    if (!cont) return false;
    // treat these as manga containers
    return !!(
      cont.closest(".chapter-feed__container") ||
      cont.closest(".manga-card") ||
      cont.closest(".md-card") ||
      cont.closest(".group.md-card")
    );
  }

  function applyFilters() {
    // hide duplicate top controls if any
    document.querySelectorAll(".controls").forEach((c, i) => { if (i > 0) c.style.display = "none"; });

    document.querySelectorAll(".mangadexpp-controls").forEach(row => {
      const inp = row.querySelector("input[entryid]");
      if (!inp) return;
      const id = inp.getAttribute("entryid");
      const flag = localStorage.getItem(id);
      const cont =
        row.closest(".chapter-feed__container") ||
        row.closest(".manga-card") ||
        row.closest(".md-card") ||
        row.closest(".group.md-card") ||
        row.closest("li") ||
        row.closest("article") ||
        row.parentElement;

      if (!cont) return;

      // Never hide detail page containers
      if (cont.closest(".layout-container")) {
        syncColors(row, flag);
        cont.style.display = "";
        return;
      }

      // Apply guarded "unmarked" hiding: only hide unmarked if cont is a manga container
      let shouldHide = false;
      if (flag === "1") shouldHide = hideRead;
      else if (flag === "-1") shouldHide = hideIgnore;
      else shouldHide = hideUnmarked && isMangaContainer(cont);

      cont.style.display = shouldHide ? "none" : "";
      syncColors(row, flag);
    });

    // feed-specific hide-all-read (chapter markers)
    hideAllReadFeed();
  }

  /* ===================== API batching + tag blacklist check ===================== */
  async function apiRateLimit() {
    const now = Date.now();
    const diff = now - lastAPICall;
    if (diff < MIN_DELAY_BETWEEN_API) await new Promise(r => setTimeout(r, MIN_DELAY_BETWEEN_API - diff));
    lastAPICall = Date.now();
  }

  function queueVisibleIdsForMetadata() {
    document.querySelectorAll(".mangadexpp-controls input[entryid]").forEach(i => {
      const id = i.getAttribute("entryid");
      if (id && !queue.includes(id)) queue.push(id);
    });
  }

  async function processQueue() {
    if (queue.length === 0) return;
    const batch = queue.splice(0, MAX_BATCH);
    const url = new URL("https://api.mangadex.org/manga");
    batch.forEach(id => url.searchParams.append("ids[]", id));
    url.searchParams.set("limit", MAX_BATCH);
    await apiRateLimit();
    try {
      const res = await fetch(url.toString(), { credentials: "same-origin" });
      if (!res.ok) { queue = batch.concat(queue); return; }
      const json = await res.json();
      if (!json || !json.data) { queue = batch.concat(queue); return; }
      json.data.forEach(m => {
        try {
          const tags = m.attributes?.tags || [];
          for (const t of tags) {
            const name = t.attributes?.name?.en || Object.values(t.attributes?.name || {})[0] || "";
            if (tagBlacklist.some(bl => bl.toLowerCase() === name.toLowerCase())) {
              localStorage.setItem(m.id, "-1");
              break;
            }
          }
        } catch (e) {}
      });
      applyFilters();
    } catch (err) {
      console.error("processQueue error", err);
      queue = batch.concat(queue);
    }
  }

  /* ===================== Top controls (no duplicates) ===================== */
  function addTopControls() {
    const allControls = document.querySelectorAll(".controls");
    if (!allControls || allControls.length === 0) return;
    const controls = allControls[0];
    if (controls.classList.contains("mangadexpp-has-controls")) return;
    controls.classList.add("mangadexpp-has-controls");
    // hide other bars
    for (let i = 1; i < allControls.length; i++) try { allControls[i].style.display = "none"; } catch(e){}
    function mk(label, get, set, color, extraCb) {
      const b = document.createElement("input");
      b.type = "button"; b.value = label; b.style.padding = "0 1em"; b.style.marginLeft = "6px"; b.style.borderRadius = "4px";
      b.style.cursor = "pointer"; b.style.backgroundColor = get() ? color : "transparent";
      b.addEventListener("click", () => { const v = !get(); set(v); b.style.backgroundColor = v ? color : "transparent"; applyFilters(); if (typeof extraCb === "function") extraCb(); });
      return b;
    }
    controls.appendChild(mk("Toggle Read", () => hideRead, v => hideRead = v, READ_BUTTON_COLOR));
    controls.appendChild(mk("Toggle Ignore", () => hideIgnore, v => hideIgnore = v, IGNORE_BUTTON_COLOR));
    controls.appendChild(mk("Toggle Unmarked", () => hideUnmarked, v => hideUnmarked = v, UNMARKED_BUTTON_COLOR));
    if (DOES_HIDE_ALL_READ) controls.appendChild(mk("Hide All Read?", () => hideAllRead, v => hideAllRead = v, HIDE_ALL_READ_BUTTON_COLOR, hideAllReadFeed));
    const cog = createSettingsCog(); cog.classList.add("mangadexpp-settings-cog"); controls.appendChild(cog);
    // render tag UI if present
    renderTagUI();
  }

  /* ===================== Runner & observe ===================== */
  function run() {
    addTopControls();
    addControlsToAll();
    applyFilters();
    // queue visible IDs for metadata scanning (tag blacklist)
    queueVisibleIdsForMetadata();
  }

  let scheduled = false;
  function scheduleRun() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; try { run(); } catch (e) { console.error(e); } }, 150);
  }

  new MutationObserver(scheduleRun).observe(document.body, { childList: true, subtree: true });
  setInterval(processQueue, API_REQUEST_INTERVAL);

  scheduleRun();

})();
