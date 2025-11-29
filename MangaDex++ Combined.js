// ==UserScript==
// @name         MangaDex++ Enhanced v2.5.6 (Tag Blacklist no longer force closes, Stable Controls, Hide Read Fixed)
// @version      2.5.6
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @description  Read / Ignore / Clear buttons on every manga card, Stable controls + Tag blacklist (fixed menu input) + robust filtering across feed/latest/recent/follows + no duplicate top controls + export/import + feed hide-all-read detection
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

  /* ================= CONFIG / STATE ================= */
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

  // tag blacklist storage key
  const TAG_BLACKLIST_KEY = "mangadexpp_tag_blacklist";
  // API batching
  const API_REQUEST_INTERVAL = 500;
  const MAX_BATCH = 100;
  const MIN_DELAY_BETWEEN_API = 300;
  let queue = [];
  let lastAPICall = 0;

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  /* ================ UTILITIES ================ */
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

  function extractIdFromHref(href) {
    if (!href) return null;
    const m = href.match(UUID_RE);
    if (m) return m[0];
    const parts = href.split("/");
    for (const p of parts) if (p && p.length >= 10) return p;
    return null;
  }

  /* ================ EXPORT / IMPORT ================ */
  function exportLocalStorage() {
    try {
      const data = JSON.stringify(localStorage, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mangadexpp-localstorage.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
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
    input.remove();
  }

  /* ================ SETTINGS COG + TAG UI (fixed menu clicks) ================ */
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
    menu.style.minWidth = "300px";
    menu.style.padding = "8px";
    menu.style.boxSizing = "border-box";
    menu.style.color = "#eee";

    // Prevent clicks inside the menu from bubbling to document
    menu.addEventListener("click", e => e.stopPropagation());

    // Data section
    const dataTitle = document.createElement("div");
    dataTitle.textContent = "Data";
    dataTitle.style.fontWeight = "700";
    dataTitle.style.marginBottom = "6px";
    menu.appendChild(dataTitle);

    const exBtn = document.createElement("button");
    exBtn.textContent = "Export Data";
    exBtn.style.width = "100%";
    exBtn.style.marginBottom = "6px";
    exBtn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); exportLocalStorage(); });
    menu.appendChild(exBtn);

    const imBtn = document.createElement("button");
    imBtn.textContent = "Import Data";
    imBtn.style.width = "100%";
    imBtn.style.marginBottom = "10px";
    imBtn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); importLocalStorage(); });
    menu.appendChild(imBtn);

    // Tag blacklist UI
    const tagTitle = document.createElement("div");
    tagTitle.textContent = "Tag blacklist (auto-ignore)";
    tagTitle.style.fontWeight = "700";
    tagTitle.style.marginBottom = "6px";
    menu.appendChild(tagTitle);

    const tagListContainer = document.createElement("div");
    tagListContainer.style.maxHeight = "180px";
    tagListContainer.style.overflow = "auto";
    tagListContainer.style.marginBottom = "8px";
    menu.appendChild(tagListContainer);

    const addRow = document.createElement("div");
    addRow.style.display = "flex";
    addRow.style.gap = "6px";

    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = "tag name (e.g. boys' love)";
    addInput.style.flex = "1";
    addInput.style.padding = "6px";
    addInput.style.borderRadius = "4px";
    addInput.style.border = "1px solid #444";
    // stopPropagation so clicks focus the input and don't close the menu
    addInput.addEventListener("click", e => e.stopPropagation());
    addRow.appendChild(addInput);

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add";
    addBtn.style.padding = "6px 8px";
    addBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const v = addInput.value.trim();
      if (!v) return;
      const normalized = safeLower(v);
      if (!tagBlacklist.includes(normalized)) {
        tagBlacklist.push(normalized);
        saveTagBlacklist(tagBlacklist);
        renderTagUI();
        queueVisibleIdsForMetadata();
        applyFilters();
      }
      addInput.value = "";
    });
    // stopPropagation to avoid closing menu
    addBtn.addEventListener("click", e => e.stopPropagation());
    addRow.appendChild(addBtn);
    menu.appendChild(addRow);

    function renderTagUI() {
      tagListContainer.innerHTML = "";
      const list = tagBlacklist || [];
      if (list.length === 0) {
        const none = document.createElement("div");
        none.textContent = "No tags blacklisted.";
        none.style.color = "#999";
        tagListContainer.appendChild(none);
        return;
      }
      list.forEach(tag => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "6px";
        row.style.borderBottom = "1px solid #333";

        const t = document.createElement("div");
        t.textContent = tag;
        t.style.color = "#eee";

        const rem = document.createElement("button");
        rem.textContent = "Remove";
        rem.style.cursor = "pointer";
        rem.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          tagBlacklist = tagBlacklist.filter(x => x !== safeLower(tag));
          saveTagBlacklist(tagBlacklist);
          renderTagUI();
          queueVisibleIdsForMetadata();
          applyFilters();
        });
        row.appendChild(t);
        row.appendChild(rem);
        tagListContainer.appendChild(row);
      });

      const clearAll = document.createElement("button");
      clearAll.textContent = "Clear all";
      clearAll.style.marginTop = "6px";
      clearAll.style.width = "100%";
      clearAll.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        tagBlacklist = [];
        saveTagBlacklist([]);
        renderTagUI();
        queueVisibleIdsForMetadata();
        applyFilters();
      });
      menu.appendChild(clearAll);
    }

    // click outside closes the menu; click inside prevented above
    document.addEventListener("click", e => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.style.display = "none";
      }
    });

    // toggle open/close
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      menu.style.display = menu.style.display === "block" ? "none" : "block";
      if (menu.style.display === "block") renderTagUI();
    });

    wrapper._renderTagUI = renderTagUI;
    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    return wrapper;
  }

  function renderTagUIIfPresent() {
    const cog = document.querySelector(".mangadexpp-settings-container");
    if (cog && typeof cog._renderTagUI === "function") cog._renderTagUI();
  }

  /* ================ PER-TITLE CONTROLS ================ */
  function createControlsRow(entryID) {
    const row = document.createElement("div");
    row.className = "mangadexpp-controls";
    row.style.marginTop = "6px";
    row.style.display = "flex";
    row.style.gap = "6px";

    // prevent navigation when clicking buttons
    row.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); return false; });

    function mk(label, cls, cb) {
      const b = document.createElement("input");
      b.type = "button";
      b.value = label;
      b.className = cls;
      b.setAttribute("entryid", entryID);
      b.style.padding = "0 8px";
      b.style.borderRadius = "4px";
      b.style.cursor = "pointer";
      b.style.background = "transparent";
      b.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        cb(entryID);
        applyFilters();
        return false;
      });
      return b;
    }

    row.appendChild(mk("Read", "mangadexpp-read", id => localStorage.setItem(id, "1")));
    row.appendChild(mk("Ignore", "mangadexpp-ignore", id => localStorage.setItem(id, "-1")));
    row.appendChild(mk("Clear", "mangadexpp-clear", id => localStorage.removeItem(id)));

    return row;
  }

  /* ================ INSERTION HELPERS (support all card types) ================ */
  function getCandidateContainerForAnchor(a) {
    return (
      a.closest(".chapter-feed__container") ||
      a.closest(".manga-card") ||
      a.closest(".md-card") ||
      a.closest(".group.md-card") ||
      a.closest(".card") ||
      a.closest("li") ||
      a.closest("article") ||
      a.parentElement
    );
  }

  function insertControlsUnderTitleForAnchor(a) {
    try {
      if (a.closest(".mangadexpp-controls")) return;
      const href = a.getAttribute("href") || a.href || "";
      const id = extractIdFromHref(href);
      if (!id) return;
      const cont = getCandidateContainerForAnchor(a);
      if (!cont) return;
      if (cont.querySelector(`.mangadexpp-controls input[entryid="${id}"]`)) return;

      const title =
        cont.querySelector(".chapter-feed__title") ||
        cont.querySelector(".title") ||
        cont.querySelector("a[href*='/title/']") ||
        a;

      const controls = createControlsRow(id);
      try { title.parentNode.insertBefore(controls, title.nextSibling); }
      catch { cont.appendChild(controls); }
    } catch (e) {
      // ignore
    }
  }

  function addControlsToAll() {
    Array.from(document.querySelectorAll("a[href*='/title/']")).forEach(a => {
      if (a.closest("nav") || a.closest("header") || a.closest(".mangadexpp-settings-container")) return;
      insertControlsUnderTitleForAnchor(a);
    });
  }

  /* ================ FEED UNREAD DETECTION (Hide-All-Read) ================ */
  function hasUnreadChaptersInFeedContainer(container) {
    const list = container.querySelector(".chapter-feed__chapters-list");
    if (!list) return null; // can't tell
    const unread = list.querySelector(".readMarker:not(.opacity-40)");
    return !!unread;
  }

  function hideAllReadFeed() {
    if (!DOES_HIDE_ALL_READ) return;
    document.querySelectorAll(".chapter-feed__container").forEach(cont => {
      if (cont.closest(".layout-container")) { cont.style.display = ""; return; }
      if (!hideAllRead) {
        if (cont.hasAttribute("feed-allread-hide")) { cont.removeAttribute("feed-allread-hide"); cont.style.display = ""; }
        return;
      }
      const unread = hasUnreadChaptersInFeedContainer(cont);
      if (unread === null) return; // skip containers we can't determine
      const allRead = unread === false;
      if (allRead) { cont.style.display = "none"; cont.setAttribute("feed-allread-hide", "true"); }
      else { if (cont.hasAttribute("feed-allread-hide")) { cont.removeAttribute("feed-allread-hide"); cont.style.display = ""; } }
    });
  }

  /* ================ FILTER LOGIC (safe unmarked) ================ */
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
    return !!(
      cont.closest(".chapter-feed__container") ||
      cont.closest(".manga-card") ||
      cont.closest(".md-card") ||
      cont.closest(".group.md-card")
    );
  }

  function applyFilters() {
    // hide duplicate top control bars
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
        row.closest(".card") ||
        row.closest("li") ||
        row.closest("article") ||
        row.parentElement;

      if (!cont) return;

      // Never hide content on title detail pages
      if (cont.closest(".layout-container")) {
        syncColors(row, flag);
        cont.style.display = "";
        return;
      }

      let shouldHide = false;
      if (flag === "1") shouldHide = hideRead;
      else if (flag === "-1") shouldHide = hideIgnore;
      else shouldHide = hideUnmarked && isMangaContainer(cont);

      cont.style.display = shouldHide ? "none" : "";
      syncColors(row, flag);
    });

    // apply feed-only hide-all-read (chapter-marker based)
    hideAllReadFeed();
  }

  /* ================ API BATCHING & TAG BLACKLIST ================ */
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
      const blacklist = (tagBlacklist || []).map(x => safeLower(x));
      json.data.forEach(m => {
        try {
          const id = m.id;
          const tags = (m.attributes && m.attributes.tags) || [];
          for (const t of tags) {
            const name = (t.attributes && (t.attributes.name?.en || Object.values(t.attributes.name || {})[0])) || "";
            if (blacklist.includes(safeLower(name))) {
              localStorage.setItem(id, "-1"); // auto-ignore
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

  /* ================ TOP CONTROLS (no duplicates) ================ */
  function addTopControls() {
    const allControls = document.querySelectorAll(".controls");
    if (!allControls || allControls.length === 0) return;
    const controls = allControls[0];
    if (controls.classList.contains("mangadexpp-has-controls")) return;
    controls.classList.add("mangadexpp-has-controls");
    for (let i = 1; i < allControls.length; i++) try { allControls[i].style.display = "none"; } catch(e) {}
    function mk(label, get, set, color, cb) {
      const b = document.createElement("input");
      b.type = "button"; b.value = label;
      b.style.padding = "0 1em"; b.style.marginLeft = "6px"; b.style.borderRadius = "4px";
      b.style.cursor = "pointer"; b.style.backgroundColor = get() ? color : "transparent";
      b.addEventListener("click", () => {
        const v = !get();
        set(v);
        b.style.backgroundColor = v ? color : "transparent";
        applyFilters();
        if (typeof cb === "function") cb();
      });
      return b;
    }
    controls.appendChild(mk("Toggle Read", () => hideRead, v => hideRead = v, READ_BUTTON_COLOR));
    controls.appendChild(mk("Toggle Ignore", () => hideIgnore, v => hideIgnore = v, IGNORE_BUTTON_COLOR));
    controls.appendChild(mk("Toggle Unmarked", () => hideUnmarked, v => hideUnmarked = v, UNMARKED_BUTTON_COLOR));
    if (DOES_HIDE_ALL_READ) controls.appendChild(mk("Hide All Read?", () => hideAllRead, v => hideAllRead = v, HIDE_ALL_READ_BUTTON_COLOR, hideAllReadFeed));
    const cog = createSettingsCog(); cog.classList.add("mangadexpp-settings-cog");
    controls.appendChild(cog);
    renderTagUIIfPresent();
  }

  /* ================ RUNNER & OBSERVER ================ */
  function runOnce() {
    addTopControls();
    addControlsToAll();
    applyFilters();
    // queue visible IDs for tag checking
    queueVisibleIdsForMetadata();
  }

  let scheduled = false;
  function scheduleRun() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      try { runOnce(); } catch (e) { console.error(e); }
    }, 150);
  }

  new MutationObserver(scheduleRun).observe(document.body, { childList: true, subtree: true });
  setInterval(processQueue, API_REQUEST_INTERVAL);

  // kickoff
  scheduleRun();

})();
