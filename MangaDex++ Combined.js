// ==UserScript==
// @name         MangaDex++ Enhanced v2.5.6 (Stable Controls, Hide Read Fixed)
// @version      2.5.7
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @description  Read / Ignore / Clear buttons on every manga card, Stable controls + robust filtering across feed/latest/recent/follows + no duplicate top controls + export/import + feed hide-all-read detection
// @author       @ Theo1996, MangaDexPP, patched by Workik
// @homepageURL  https://github.com/lordmage/MangaDex-Combined
// @updateURL    http://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @downloadURL  http://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @match        https://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @match        https://mangadex.org/*
// @grant        none
// ==/UserScript==
/* global localStorage, URL, Blob, FileReader */
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

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  /* ================ UTILITIES ================ */
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

  /* ================ SETTINGS COG ================ */
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
    menu.style.minWidth = "200px";
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
    imBtn.style.marginBottom = "6px";
    imBtn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); importLocalStorage(); });
    menu.appendChild(imBtn);

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
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    return wrapper;
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
  }

  /* ================ RUNNER & OBSERVER ================ */
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
      try { runOnce(); } catch (e) { console.error(e); }
    }, 150);
  }

  new MutationObserver(scheduleRun).observe(document.body, { childList: true, subtree: true });

  // kickoff
  scheduleRun();

})();
