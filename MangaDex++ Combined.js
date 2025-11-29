// ==UserScript==
// @name         MangaDex++ Enhanced v2.5.5 (Tag Blacklist, Stable Controls, Hide Read Fixed)
// @version      2.5.5
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @description  Read / Ignore / Clear buttons on every manga card, tag blacklist, export/import, feed unread detection, no duplicate control bars, stable filtering.
// @author       @ Theo1996, MangaDexPP, patched by Workik
// @homepageURL  https://github.com/lordmage/MangaDex-Combined
// @updateURL    https://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @downloadURL  https://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @match        https://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
/* global localStorage, URL, Blob, FileReader, fetch */
/* eslint-disable no-unused-vars */
// @match        https://mangadex.org/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  /* ===============================================================
     CONFIG & STATE
  =============================================================== */

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

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  const API_REQUEST_INTERVAL = 500;
  const MAX_BATCH = 100;
  const MIN_DELAY_BETWEEN_API = 300;

  let queue = [];
  let lastAPICall = 0;

  /* ===============================================================
      TAG BLACKLIST STORAGE
  =============================================================== */

  function loadTagBlacklist() {
    try {
      return JSON.parse(localStorage.getItem("mangadexpp_tag_blacklist") || "[]");
    } catch {
      return [];
    }
  }

  function saveTagBlacklist(tags) {
    localStorage.setItem("mangadexpp_tag_blacklist", JSON.stringify(tags));
  }

  let tagBlacklist = loadTagBlacklist();

  /* ===============================================================
     EXPORT / IMPORT LOCALSTORAGE
  =============================================================== */

  function exportLocalStorage() {
    try {
      const data = JSON.stringify(localStorage, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mangadexpp-localstorage.json";
      a.click();
    } catch (error) {
      alert("Export failed — see console.");
      console.error(error);
    }
  }

  function importLocalStorage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
          alert("Import successful!");
        } catch (err) {
          alert("Invalid JSON.");
          console.error(err);
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  /* ===============================================================
     SETTINGS MENU (⚙)
  =============================================================== */

  function createSettingsMenu() {
    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.classList.add("mangadexpp-settings-container");

    const btn = document.createElement("input");
    btn.type = "button";
    btn.value = "⚙";
    btn.style.padding = "0 1em";
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
    menu.style.zIndex = "99999";
    menu.style.padding = "8px";
    menu.style.width = "240px";

    function mkLabel(text) {
      const div = document.createElement("div");
      div.textContent = text;
      div.style.color = "#ccc";
      div.style.fontWeight = "bold";
      div.style.margin = "4px 0";
      return div;
    }

    function mkButton(text, action) {
      const div = document.createElement("div");
      div.textContent = text;
      div.style.cursor = "pointer";
      div.style.color = "#eee";
      div.style.padding = "6px 8px";
      div.style.borderRadius = "4px";
      div.style.background = "#2a2a2a";
      div.style.marginTop = "4px";
      div.addEventListener("click", e => {
        e.stopPropagation();
        menu.style.display = "none";
        action();
      });
      return div;
    }

    /* TAG BLACKLIST UI */
    const tagListWrap = document.createElement("div");
    updateTagListUI();

    function updateTagListUI() {
      tagListWrap.innerHTML = "";
      tagListWrap.appendChild(mkLabel("Ignored Tags:"));

      tagBlacklist.forEach(tag => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.marginBottom = "4px";
        row.style.color = "#ddd";

        const t = document.createElement("span");
        t.textContent = tag;

        const remove = document.createElement("input");
        remove.type = "button";
        remove.value = "✕";
        remove.style.cursor = "pointer";
        remove.style.background = "#522";
        remove.style.borderRadius = "4px";
        remove.style.padding = "0 5px";
        remove.style.border = "none";
        remove.style.color = "#fff";
        remove.onclick = () => {
          tagBlacklist = tagBlacklist.filter(x => x.toLowerCase() !== tag.toLowerCase());
          saveTagBlacklist(tagBlacklist);
          updateTagListUI();
          applyFilters();
        };

        row.appendChild(t);
        row.appendChild(remove);

        tagListWrap.appendChild(row);
      });

      const addWrap = document.createElement("div");
      addWrap.style.marginTop = "6px";
      addWrap.style.display = "flex";
      addWrap.style.gap = "4px";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Add tag…";
      input.style.flex = "1";

      const addBtn = document.createElement("input");
      addBtn.type = "button";
      addBtn.value = "Add";
      addBtn.style.cursor = "pointer";
      addBtn.style.background = "#225522";
      addBtn.style.color = "#fff";
      addBtn.style.borderRadius = "4px";
      addBtn.onclick = () => {
        const val = input.value.trim();
        if (!val) return;
        if (!tagBlacklist.includes(val.toLowerCase())) {
          tagBlacklist.push(val);
          saveTagBlacklist(tagBlacklist);
          updateTagListUI();
          applyFilters();
        }
      };

      addWrap.appendChild(input);
      addWrap.appendChild(addBtn);
      tagListWrap.appendChild(addWrap);
    }

    /* Settings Menu Contents */
    menu.appendChild(mkButton("Export Data", exportLocalStorage));
    menu.appendChild(mkButton("Import Data", importLocalStorage));
    menu.appendChild(tagListWrap);

    /* Open / Close handling */
    btn.onclick = e => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "block" ? "none" : "block";
    };

    wrap.appendChild(btn);
    wrap.appendChild(menu);

    document.addEventListener("click", () => {
      menu.style.display = "none";
    });

    return wrap;
  }

  /* ===============================================================
     READ / IGNORE / CLEAR BUTTONS PER CARD
  =============================================================== */

  function createControlsRow(id) {
    const row = document.createElement("div");
    row.className = "mangadexpp-controls";
    row.style.marginTop = "6px";
    row.style.display = "flex";
    row.style.gap = "6px";

    row.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    function mk(label, cls, handler) {
      const b = document.createElement("input");
      b.type = "button";
      b.value = label;
      b.className = cls;
      b.setAttribute("entryid", id);
      b.style.padding = "0 8px";
      b.style.borderRadius = "4px";
      b.style.cursor = "pointer";
      b.style.background = "transparent";
      b.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        handler(id);
        applyFilters();
        return false;
      };
      return b;
    }

    row.appendChild(mk("Read", "mangadexpp-read", id => localStorage.setItem(id, "1")));
    row.appendChild(mk("Ignore", "mangadexpp-ignore", id => localStorage.setItem(id, "-1")));
    row.appendChild(mk("Clear", "mangadexpp-clear", id => localStorage.removeItem(id)));

    return row;
  }

  /* ===============================================================
     UTILITY: ID HELPERS & INSERTING CONTROLS
  =============================================================== */

  function extractEntryId(href) {
    if (!href) return null;
    const m = href.match(UUID_RE);
    if (m) return m[0];
    const parts = href.split("/");
    return parts.find(p => p.length > 10) || null;
  }

  function getContainerForAnchor(a) {
    return (
      a.closest(".chapter-feed__container") ||
      a.closest(".manga-card") ||
      a.closest("li") ||
      a.closest("article") ||
      a.closest(".card") ||
      a.parentElement
    );
  }

  function insertControlsUnderTitleForAnchor(a) {
    if (a.closest(".mangadexpp-controls")) return;
    const id = extractEntryId(a.href || a.getAttribute("href"));
    if (!id) return;

    const cont = getContainerForAnchor(a);
    if (!cont) return;

    if (cont.querySelector(`.mangadexpp-controls input[entryid="${id}"]`)) return;

    const title = cont.querySelector(".chapter-feed__title, .title") || a;
    const controls = createControlsRow(id);

    try {
      title.parentNode.insertBefore(controls, title.nextSibling);
    } catch {
      cont.appendChild(controls);
    }
  }

  function addControlsToAll() {
    const anchors = document.querySelectorAll("a[href*='/title/']");
    anchors.forEach(a => {
      if (a.closest("nav") || a.closest("header") || a.closest(".mangadexpp-settings-container")) return;
      insertControlsUnderTitleForAnchor(a);
    });
  }

  /* ===============================================================
     FEED UNREAD DETECTION
  =============================================================== */

  function hasUnreadChapters(container) {
    const list = container.querySelector(".chapter-feed__chapters-list");
    if (!list) return null;

    const unread = list.querySelector(".readMarker:not(.opacity-40)");
    return !!unread;
  }

  function hideAllReadFeed() {
    if (!hideAllRead) {
      document.querySelectorAll("[feed-allread-hide]").forEach(c => {
        c.removeAttribute("feed-allread-hide");
        c.style.display = "";
      });
      return;
    }

    document.querySelectorAll(".chapter-feed__container").forEach(cont => {
      if (cont.closest(".layout-container")) {
        cont.style.display = "";
        return;
      }

      const unread = hasUnreadChapters(cont);
      const allRead = unread === false;

      if (allRead) {
        cont.style.display = "none";
        cont.setAttribute("feed-allread-hide", "true");
      } else {
        cont.style.display = "";
        cont.removeAttribute("feed-allread-hide");
      }
    });
  }

  /* ===============================================================
     FILTERING
  =============================================================== */

  function syncButtonColors(row, flag) {
    const readBtn = row.querySelector(".mangadexpp-read");
    const ignoreBtn = row.querySelector(".mangadexpp-ignore");

    if (readBtn) readBtn.style.background = flag === "1" ? READ_BUTTON_COLOR : "transparent";
    if (ignoreBtn) ignoreBtn.style.background = flag === "-1" ? IGNORE_BUTTON_COLOR : "transparent";
  }

  function applyFilters() {
    document.querySelectorAll(".mangadexpp-controls").forEach(row => {
      const input = row.querySelector("input[entryid]");
      if (!input) return;

      const id = input.getAttribute("entryid");
      const flag = localStorage.getItem(id);

      const cont =
        row.closest(".chapter-feed__container") ||
        row.closest(".manga-card") ||
        row.closest("li") ||
        row.closest("article") ||
        row.parentElement;

      if (!cont) return;

      // Never hide detail page content
      if (cont.closest(".layout-container")) {
        cont.style.display = "";
        syncButtonColors(row, flag);
        return;
      }

     // If this container is not a manga-card container, never hide it by "unmarked".
const isMangaContainer =
  cont.classList.contains("chapter-feed__container") ||
  cont.classList.contains("manga-card") ||
  cont.closest(".chapter-feed__container") ||
  cont.closest(".manga-card");

// Apply per-flag hiding only to manga containers
let hide = false;

if (flag === "1") {
    hide = hideRead;
} else if (flag === "-1") {
    hide = hideIgnore;
} else {
    // Only hide unmarked items IF they are real manga items
    hide = hideUnmarked && !!isMangaContainer;
}

cont.style.display = hide ? "none" : "";

      syncButtonColors(row, flag);
    });

    hideAllReadFeed();
  }

  /* ===============================================================
     TOP CONTROL BAR (NO DUPLICATES)
  =============================================================== */

  function addTopControls() {
    const allControls = document.querySelectorAll(".controls");
    if (allControls.length === 0) return;

    const controls = allControls[0];

    if (controls.classList.contains("mangadexpp-has-controls")) return;
    controls.classList.add("mangadexpp-has-controls");

    for (let i = 1; i < allControls.length; i++) {
      allControls[i].style.display = "none";
    }

    function mk(label, get, set, color, cb) {
      const b = document.createElement("input");
      b.type = "button";
      b.value = label;
      b.style.padding = "0 1em";
      b.style.marginLeft = "6px";
      b.style.borderRadius = "4px";
      b.style.cursor = "pointer";
      b.style.backgroundColor = get() ? color : "transparent";
      b.onclick = () => {
        const v = !get();
        set(v);
        b.style.backgroundColor = v ? color : "transparent";
        applyFilters();
        if (cb) cb();
      };
      return b;
    }

    controls.appendChild(mk("Toggle Read", () => hideRead, v => (hideRead = v), READ_BUTTON_COLOR));
    controls.appendChild(mk("Toggle Ignore", () => hideIgnore, v => (hideIgnore = v), IGNORE_BUTTON_COLOR));
    controls.appendChild(mk("Toggle Unmarked", () => hideUnmarked, v => (hideUnmarked = v), UNMARKED_BUTTON_COLOR));

    if (DOES_HIDE_ALL_READ) {
      controls.appendChild(
        mk("Hide All Read?", () => hideAllRead, v => (hideAllRead = v), HIDE_ALL_READ_BUTTON_COLOR, hideAllReadFeed)
      );
    }

    controls.appendChild(createSettingsMenu());
  }

  /* ===============================================================
     API BATCHING (Tag Blacklist)
  =============================================================== */

  async function apiDelay() {
    const now = Date.now();
    const diff = now - lastAPICall;
    if (diff < MIN_DELAY_BETWEEN_API) {
      await new Promise(r => setTimeout(r, MIN_DELAY_BETWEEN_API - diff));
    }
    lastAPICall = Date.now();
  }

  async function processQueue() {
    if (queue.length === 0) return;

    const batch = queue.splice(0, MAX_BATCH);

    const url = new URL("https://api.mangadex.org/manga");
    batch.forEach(id => url.searchParams.append("ids[]", id));
    url.searchParams.set("limit", MAX_BATCH);

    await apiDelay();

    try {
      const res = await fetch(url);
      if (!res.ok) {
        queue = batch.concat(queue);
        return;
      }
      const json = await res.json();

      json.data.forEach(m => {
        const tags = m.attributes?.tags || [];
        tags.forEach(t => {
          const name =
            t.attributes?.name?.en ||
            Object.values(t.attributes?.name || {})[0] ||
            "";
          if (tagBlacklist.some(bl => bl.toLowerCase() === name.toLowerCase())) {
            localStorage.setItem(m.id, "-1");
          }
        });
      });

      applyFilters();

    } catch (err) {
      console.error("Batch fetch error:", err);
      queue = batch.concat(queue);
    }
  }

  /* ===============================================================
     RUNNER + MUTATION OBSERVER
  =============================================================== */

  function runOnce() {
    addTopControls();
    addControlsToAll();
    applyFilters();
  }

  let scheduled = false;
  function scheduleRun() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      try {
        runOnce();
      } catch (e) {
        console.error(e);
      }
    }, 150);
  }

  const observer = new MutationObserver(scheduleRun);
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(processQueue, API_REQUEST_INTERVAL);

  scheduleRun();
})();
