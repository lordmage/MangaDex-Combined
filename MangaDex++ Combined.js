// ==UserScript==
// @name         MangaDex++ Enhanced v2.6.3 (Strict ID Fix)
// @version      2.6.5
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

  // Controls:
  // hideRead         -> hide entire manga cards marked as read (existing behavior)
  // hideIgnore       -> hide manga marked as ignored
  // hideUnmarked     -> hide manga not marked (new)
  // hideReadChapters -> hide individual chapter entries that are marked as read (new)
  let hideRead = false;
  let hideIgnore = true;
  let hideUnmarked = false;
  let hideAllRead = true;
  let hideReadChapters = false;

  // Keys stored in DB that are UI state only and must NOT be exported
  const UI_STATE_KEYS = [
    "STATE_hideRead",
    "STATE_hideIgnore",
    "STATE_hideUnmarked",
    "STATE_hideAllRead",
    "STATE_hideReadChapters"
  ];

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

  function saveUIState() {
    try {
      db.set("STATE_hideRead", hideRead ? "1" : "0");
      db.set("STATE_hideIgnore", hideIgnore ? "1" : "0");
      db.set("STATE_hideUnmarked", hideUnmarked ? "1" : "0");
      db.set("STATE_hideAllRead", hideAllRead ? "1" : "0");
      db.set("STATE_hideReadChapters", hideReadChapters ? "1" : "0");
    } catch (e) {
      console.error("Failed to save UI state", e);
    }
  }

  function loadUIState() {
    try {
      const v1 = db.get("STATE_hideRead"); if (v1 !== null) hideRead = v1 === "1";
      const v2 = db.get("STATE_hideIgnore"); if (v2 !== null) hideIgnore = v2 === "1";
      const v3 = db.get("STATE_hideUnmarked"); if (v3 !== null) hideUnmarked = v3 === "1";
      const v4 = db.get("STATE_hideAllRead"); if (v4 !== null) hideAllRead = v4 === "1";
      const v5 = db.get("STATE_hideReadChapters"); if (v5 !== null) hideReadChapters = v5 === "1";
    } catch (e) {
      console.error("Failed to load UI state", e);
    }
  }

  /* ================ UTILITIES ================ */
  function isInTitlesSidebar(el) {
    return !!el.closest("#section-Titles");
  }

  function isInAnySidebar(el) {
    // Check if element is inside any navigation sidebar section
    return !!el.closest("[id^='section-'], .drawer");
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
      const all = db.getAll();
      // Remove UI state keys from export
      UI_STATE_KEYS.forEach(k => { if (k in all) delete all[k]; });
      const data = JSON.stringify(all, null, 2);
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
    btn.title = "MangaDex++: Export/Import data and settings";
    btn.style.cssText = `padding: 0 0.8em; margin-left: 6px; border-radius: 4px; background-color: ${SETTINGS_BUTTON_COLOR}; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);`;

    const menu = document.createElement("div");
    // Use a full CSS text here rather than a truncated placeholder
    menu.style.cssText = "display: none; position: absolute; top: 110%; left: 0; background: #1a1a1a; border: 1px solid #333; border-radius: 6px; z-index: 999999; min-width: 200px; padding: 8px;";

    // Fix: Replace innerHTML with createElement to comply with Trusted Types CSP
    const title = document.createElement("div");
    title.style.fontWeight = "700";
    title.style.marginBottom = "6px";
    title.textContent = "MangaDex++ Data";
    menu.appendChild(title);

    const exBtn = document.createElement("button");
    exBtn.textContent = "Export Data";
    exBtn.title = "Export MangaDex++ saved manga/ignore data (UI toggles excluded)";
    exBtn.style.cssText = "width:100%; margin-bottom:6px; cursor:pointer;";
    exBtn.onclick = exportLocalStorage;

    const imBtn = document.createElement("button");
    imBtn.textContent = "Import Data";
    imBtn.title = "Import saved manga/ignore data";
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

    function mk(label, cls, color, action, tooltip) {
      const b = document.createElement("input");
      b.type = "button";
      b.value = label;
      b.className = cls;
      // Make entry id easy to read for other code paths
      b.setAttribute("entryid", entryID);
      b.title = tooltip || label;
      // Use a complete cssText here
      b.style.cssText = "padding: 2px 6px; border-radius: 3px; cursor: pointer; background: transparent; font-size: 14px; min-width: 70px; height: 28px; line-height: 24px; box-sizing: border-box; white-space: nowrap; font-family: inherit; font-weight: 500; border: 1px solid rgba(255,255,255,0.1); transition: all 0.15s ease;";

      if (color) b.style.background = "transparent";
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        saveUIState();
        applyFilters();
      };
      return b;
    }

    row.appendChild(mk("Read", "mangadexpp-read", READ_BUTTON_COLOR, () => db.set(entryID, "1"), "Mark this manga as Read"));
    row.appendChild(mk("Ignore", "mangadexpp-ignore", IGNORE_BUTTON_COLOR, () => db.set(entryID, "-1"), "Mark this manga as Ignored"));
    row.appendChild(mk("Clear", "mangadexpp-clear", null, () => db.remove(entryID), "Clear read/ignore mark for this manga"));

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
      // UPDATED: Skip links in any sidebar section or navigation area (prevents buttons on sidebar links)
      if (a.closest("nav, header, .mangadexpp-settings-container") || isInAnySidebar(a)) return;

      // NEW: Skip anchors that are media previews (video or resource thumbnails).
      // We specifically allow anchors that contain cover <img> elements, but skip ones
      // that contain <video> or <source> elements pointing at the /img/resource/ path
      // used by preview thumbnails/webm resources.
      if (a.querySelector("video") || a.querySelector("source[src*='/img/resource/']")) return;

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
    // Bulk read storage once
    const data = db.getAll();

    // Ensure duplicate top-bars don't appear; keep color sync centralized (some pages render controls multiple times)
    document.querySelectorAll(".mangadexpp-controls").forEach(row => {
      // Support both patterns: dataset.entryid or child input[entryid]
      const id = row.dataset.entryid || (row.querySelector("input[entryid]") && row.querySelector("input[entryid]").getAttribute("entryid"));
      const flag = id ? data[id] : null;

      // Find the candidate container for this control row
      const cont = getCandidateContainerForAnchor(row);
      if (!cont) return;

      // Sync button colors (always)
      try {
        const readBtn = row.querySelector(".mangadexpp-read");
        const ignoreBtn = row.querySelector(".mangadexpp-ignore");
        if (readBtn) readBtn.style.background = flag === "1" ? READ_BUTTON_COLOR : "transparent";
        if (ignoreBtn) ignoreBtn.style.background = flag === "-1" ? IGNORE_BUTTON_COLOR : "transparent";
      } catch (e) {
        // ignore
      }

      // Never hide things on the title detail page
      if (cont.closest(".layout-container")) {
        cont.style.display = "";
        return;
      }

      let shouldHide = false;
      if (flag === "1") shouldHide = hideRead;
      else if (flag === "-1") shouldHide = hideIgnore;
      else shouldHide = hideUnmarked;

      cont.style.display = shouldHide ? "none" : "";
    });

    // Hide individual chapter entries marked as read (new control)
    document.querySelectorAll(".chapter, .chapter-row, .chapter-feed__chapter, .chapter-list__item, [class*='chapter']").forEach(ch => {
      try {
        if (ch.closest(".layout-container")) return;

        const classAttr = ch.getAttribute("class") || "";
        const hasReadClass = classAttr.split(/\s+/).includes("read") || classAttr.split(/\s+/).includes("is-read");
        const hasReadMarker = !!ch.querySelector(".readMarker.opacity-40, .readMarker.read, .chapter-read-marker");
        const ariaRead = ch.getAttribute("aria-read") === "true" || ch.getAttribute("aria-pressed") === "true";
        const classTextIndicatesRead = /\bread\b/i.test(classAttr);

        const isRead = hasReadClass || hasReadMarker || ariaRead || classTextIndicatesRead;

        ch.style.display = (hideReadChapters && isRead) ? "none" : "";
      } catch (err) {
        // Safe-guard in case some matched nodes aren't actual chapter rows
      }
    });

    if (DOES_HIDE_ALL_READ) hideAllReadFeed();
  }

  function hideAllReadFeed() {
    document.querySelectorAll(".chapter-feed__container").forEach(cont => {
      if (cont.closest(".layout-container")) return;
      const list = cont.querySelector(".chapter-feed__chapters-list");
      if (!list) return;

      // Determine if any chapter in the list is unread by checking for .readMarker without .opacity-40
      const hasUnread = !!list.querySelector(".readMarker:not(.opacity-40)");
      cont.style.display = (hideAllRead && !hasUnread) ? "none" : (cont.style.display === "none" ? "none" : "");
    });
  }

  /* ================ TOP BAR CONTROLS ================ */
  function addTopControls() {
    // Use the first .controls bar, hide duplicates, and ensure consistent toggles
    const allControls = document.querySelectorAll(".controls");
    if (!allControls || allControls.length === 0) return;
    const controls = allControls[0];
    if (controls.classList.contains("mdpp-ready")) return;
    controls.classList.add("mdpp-ready");
    // Hide duplicate control bars if page created more than one
    for (let i = 1; i < allControls.length; i++) try { allControls[i].style.display = "none"; } catch (e) {}

    function mk(label, get, set, color, tooltip) {
      const b = document.createElement("input");
      b.type = "button";
      b.value = label;
      b.title = tooltip || label;
      // Use a complete style string rather than a truncated placeholder
      b.style.cssText = "padding: 0 0.8em; margin-left: 4px; border-radius: 3px; cursor: pointer; font-size: 14px; height: 28px; line-height: 28px; box-sizing: border-box; font-family: inherit; font-weight: 500; border: 1px solid rgba(255,255,255,0.1); transition: all 0.15s ease;";
      b.style.backgroundColor = get() ? color : "transparent";
      b.setAttribute("aria-pressed", get() ? "true" : "false");

      b.onclick = () => {
        const newVal = !get();
        set(newVal);
        saveUIState();
        b.style.backgroundColor = newVal ? color : "transparent";
        b.setAttribute("aria-pressed", newVal ? "true" : "false");
        applyFilters();
      };

      // Hover effects to match other buttons
      b.addEventListener("mouseenter", function() {
        b.style.opacity = "0.9";
        b.style.transform = "translateY(-1px)";
        b.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
      });
      b.addEventListener("mouseleave", function() {
        b.style.opacity = "1";
        b.style.transform = "translateY(0)";
        b.style.boxShadow = "none";
      });

      return b;
    }

    controls.appendChild(mk("Hide Read", () => hideRead, v => hideRead = v, READ_BUTTON_COLOR, "Hide whole manga cards marked as Read"));
    controls.appendChild(mk("Hide Ignored", () => hideIgnore, v => hideIgnore = v, IGNORE_BUTTON_COLOR, "Hide whole manga cards marked as Ignored"));
    controls.appendChild(mk("Hide New", () => hideUnmarked, v => hideUnmarked = v, UNMARKED_BUTTON_COLOR, "Hide whole manga cards not marked Read or Ignored"));
    controls.appendChild(mk("👁 Hide Read Chapters", () => hideReadChapters, v => hideReadChapters = v, HIDE_ALL_READ_BUTTON_COLOR, "Hide individual chapter rows that are marked Read"));
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

  // Load UI state from storage before starting
  loadUIState();

  observer.observe(document.body, { childList: true, subtree: true });
  addTopControls();
  addControlsToAll();
})();
