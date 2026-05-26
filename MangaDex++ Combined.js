// ==UserScript==
// @name         MangaDex++ Enhanced v2.6.3 (Strict ID Fix)
// @version      2.6.3
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @description  Read / Ignore / Clear buttons on every manga card - Fixed UUID reset issues
// @author       @ Theo1996, MangaDexPP, patched by Workik
// @match        https://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  /* ================= CONFIG / STATE ================= */
  const STORAGE_PREFIX = "MDPP_"; // Prevents collisions with site data
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

  /* ================ STORAGE WRAPPER ================ */
  // Migration: Move old raw UUID keys to namespaced keys
  (function migrate() {
    const keysToMigrate = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (UUID_RE.test(key) && !key.startsWith(STORAGE_PREFIX)) {
        keysToMigrate.push(key);
      }
    }
    if (keysToMigrate.length > 0) {
      console.log(`MangaDex++: Migrating ${keysToMigrate.length} legacy entries...`);
      keysToMigrate.forEach(k => {
        const val = localStorage.getItem(k);
        localStorage.setItem(STORAGE_PREFIX + k, val);
        localStorage.removeItem(k);
      });
    }
  })();

  const db = {
    get: (id) => localStorage.getItem(STORAGE_PREFIX + id),
    set: (id, val) => localStorage.setItem(STORAGE_PREFIX + id, val),
    remove: (id) => localStorage.removeItem(STORAGE_PREFIX + id),
    getAll: () => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(STORAGE_PREFIX)) {
                data[key.replace(STORAGE_PREFIX, "")] = localStorage.getItem(key);
            }
        }
        return data;
    }
  };

  /* ================ UTILITIES ================ */
  function isInTitlesSidebar(el) {
    return !!el.closest("#section-Titles");
  }

  function extractIdFromHref(href) {
    if (!href) return null;
    // STRICT FIX: Only extract UUID if it follows the "/title/" path.
    // This prevents accidental chapter-id or user-id grabbing.
    const match = href.match(/\/title\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return match ? match[1] : null;
  }

  /* ================ EXPORT / IMPORT ================ */
  function exportLocalStorage() {
    try {
      const data = JSON.stringify(db.getAll(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mangadexpp-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error("Export failed", e);
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
          Object.entries(parsed).forEach(([k, v]) => {
            if (UUID_RE.test(k)) db.set(k, v);
          });
          alert("Import complete. Refreshing...");
          window.location.reload();
        } catch (err) {
          alert("Invalid JSON file.");
        }
      };
      r.readAsText(f);
    };
    input.click();
  }

  /* ================ SETTINGS COG ================ */
  function createSettingsCog() {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.classList.add("mangadexpp-settings-container");

    const btn = document.createElement("input");
    btn.type = "button";
    btn.value = "⚙";
    btn.style.cssText = `padding: 0 0.8em; margin-left: 6px; border-radius: 4px; background-color: ${SETTINGS_BUTTON_COLOR}; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);`;

    const menu = document.createElement("div");
    menu.style.cssText = `display: none; position: absolute; top: 110%; left: 0; background: #1a1a1a; border: 1px solid #333; border-radius: 6px; z-index: 999999; min-width: 200px; padding: 8px; color: #eee;`;

    menu.innerHTML = `<div style="font-weight:700; margin-bottom:6px;">MangaDex++ Data</div>`;

    const exBtn = document.createElement("button");
    exBtn.textContent = "Export Data";
    exBtn.style.cssText = "width:100%; margin-bottom:6px; cursor:pointer;";
    exBtn.onclick = exportLocalStorage;

    const imBtn = document.createElement("button");
    imBtn.textContent = "Import Data";
    imBtn.style.cssText = "width:100%; cursor:pointer;";
    imBtn.onclick = importLocalStorage;

    menu.appendChild(exBtn);
    menu.appendChild(imBtn);

    btn.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    };

    document.addEventListener("click", () => menu.style.display = "none");
    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    return wrapper;
  }

  /* ================ PER-TITLE CONTROLS ================ */
  function createControlsRow(entryID) {
    const row = document.createElement("div");
    row.className = "mangadexpp-controls";
    row.dataset.entryid = entryID;
    row.style.cssText = "margin-top: 4px; display: flex; gap: 4px; justify-content: flex-start;";

    function mk(label, cls, color, action) {
      const b = document.createElement("input");
      b.type = "button";
      b.value = label;
      b.className = cls;
      b.style.cssText = `padding: 2px 6px; border-radius: 3px; cursor: pointer; background: transparent; font-size: 14px; min-width: 70px; height: 28px; font-weight: 500; border: 1px solid rgba(255,255,255,0.1); transition: all 0.1s ease; color: white;`;

      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        applyFilters();
      };
      return b;
    }

    row.appendChild(mk("Read", "mangadexpp-read", READ_BUTTON_COLOR, () => db.set(entryID, "1")));
    row.appendChild(mk("Ignore", "mangadexpp-ignore", IGNORE_BUTTON_COLOR, () => db.set(entryID, "-1")));
    row.appendChild(mk("Clear", "mangadexpp-clear", null, () => db.remove(entryID)));

    return row;
  }

  /* ================ CORE LOGIC ================ */
  function getCandidateContainerForAnchor(a) {
    return a.closest(".chapter-feed__container, .manga-card, .md-card, .group.md-card, .card, li, article") || a.parentElement;
  }

  function addControlsToAll() {
    const titleLinks = document.querySelectorAll("a[href*='/title/']");
    const processed = new Set();

    titleLinks.forEach(a => {
      if (a.closest("nav, header, .mangadexpp-settings-container") || isInTitlesSidebar(a)) return;

      const cont = getCandidateContainerForAnchor(a);
      if (!cont || processed.has(cont) || cont.querySelector(".mangadexpp-controls")) return;

      const id = extractIdFromHref(a.href);
      if (!id) return;

      const titleEl = cont.querySelector(".chapter-feed__cover, .chapter-feed__cover-image, a[data-v-58880355]") || a;
      if (titleEl && titleEl.parentNode) {
        titleEl.parentNode.insertBefore(createControlsRow(id), titleEl.nextSibling);
        processed.add(cont);
      }
    });
  }

  function applyFilters() {
    const data = db.getAll(); // Bulk read to memory

    document.querySelectorAll(".mangadexpp-controls").forEach(row => {
      const id = row.dataset.entryid;
      const flag = data[id];
      const cont = getCandidateContainerForAnchor(row);

      if (!cont) return;

      // Sync button colors
      row.querySelector(".mangadexpp-read").style.background = flag === "1" ? READ_BUTTON_COLOR : "transparent";
      row.querySelector(".mangadexpp-ignore").style.background = flag === "-1" ? IGNORE_BUTTON_COLOR : "transparent";

      if (cont.closest(".layout-container")) {
        cont.style.display = ""; // Never hide on the detail page itself
        return;
      }

      let shouldHide = false;
      if (flag === "1") shouldHide = hideRead;
      else if (flag === "-1") shouldHide = hideIgnore;
      else shouldHide = hideUnmarked;

      cont.style.display = shouldHide ? "none" : "";
    });

    if (DOES_HIDE_ALL_READ) hideAllReadFeed();
  }

  function hideAllReadFeed() {
    document.querySelectorAll(".chapter-feed__container").forEach(cont => {
      if (cont.closest(".layout-container")) return;
      const list = cont.querySelector(".chapter-feed__chapters-list");
      if (!list) return;

      const hasUnread = !!list.querySelector(".readMarker:not(.opacity-40)");
      cont.style.display = (hideAllRead && !hasUnread) ? "none" : (cont.style.display === "none" ? "none" : "");
    });
  }

  /* ================ TOP BAR CONTROLS ================ */
  function addTopControls() {
    const controls = document.querySelector(".controls");
    if (!controls || controls.classList.contains("mdpp-ready")) return;
    controls.classList.add("mdpp-ready");

    function mk(label, get, set, color) {
      const b = document.createElement("input");
      b.type = "button"; b.value = label;
      b.style.cssText = `padding: 0 0.8em; margin-left: 4px; border-radius: 3px; cursor: pointer; font-size: 14px; height: 28px; border: 1px solid rgba(255,255,255,0.1); color: white; transition: background 0.2s;`;
      b.style.backgroundColor = get() ? color : "transparent";

      b.onclick = () => {
        set(!get());
        b.style.backgroundColor = get() ? color : "transparent";
        applyFilters();
      };
      return b;
    }

    controls.appendChild(mk("Hide Read", () => hideRead, v => hideRead = v, READ_BUTTON_COLOR));
    controls.appendChild(mk("Hide Ignored", () => hideIgnore, v => hideIgnore = v, IGNORE_BUTTON_COLOR));
    controls.appendChild(mk("Hide New", () => hideUnmarked, v => hideUnmarked = v, UNMARKED_BUTTON_COLOR));
    controls.appendChild(createSettingsCog());
  }

  /* ================ OBSERVER ================ */
  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      addTopControls();
      addControlsToAll();
      applyFilters();
    }, 50);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  addTopControls();
  addControlsToAll();
})();
