// ==UserScript==
// @name         MangaDex++ Enhanced v2.6.4
// @version      2.6.4
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @description  Read / Ignore / Clear buttons on every manga card - Optimized performance + API validation
// @author       @ Theo1996, MangaDexPP, patched by Workik
// @homepageURL  https://github.com/lordmage/MangaDex-Combined
// @updateURL    http://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @downloadURL  http://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @match        https://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @grant        none
// ==/UserScript==

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

  /* ================ API HELPERS ================ */
  const MangaDexAPI = {
    baseURL: "https://api.mangadex.org",
    
    async validateMangaIdWithAPI(mangaId) {
      try {
       const response = await fetch(`${this.baseURL}/manga/${mangaId}`);
        if (response.status === 200) return true;
        if (response.status === 404) return false;
        return null;
      } catch (e) {
        console.error("Validation error:", e);
        return null;
      }
    },

    async batchValidateMangaIds(limit = 10) {
      const mangadexppData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (UUID_RE.test(key) && (value == "1" || value == "-1")) {
          mangadexppData[key] = value;
        }
      }

      const ids = Object.keys(mangadexppData);
      console.log(`Validating ${ids.length} manga IDs...`);
      
      let validCount = 0;
      let invalidIds = [];
      let checked = 0;

      for (const id of ids) {
        if (checked >= limit) break;
        const isValid = await this.validateMangaIdWithAPI(id);
        if (isValid === true) {
          validCount++;
        } else if (isValid === false) {
          invalidIds.push(id);
        }
        checked++;
        console.log(`[${checked}/${Math.min(limit, ids.length)}] ${id}: ${isValid ? "✓ VALID" : "✗ INVALID"}`);
        await new Promise(r => setTimeout(r, 500)); // Rate limiting
      }

      alert(`Validation complete!\nValid: ${validCount}\nInvalid: ${invalidIds.length}\nChecked: ${checked}/${ids.length}\n\nInvalid IDs:\n${invalidIds.join('\n') || 'None'}`);
      return { validCount, invalidIds, checked };
    },

    async getMangaDetails(mangaId) {
      try {
       const response = await fetch(`${this.baseURL}/manga/${mangaId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.data) {
          console.log("Manga Details:", data.data.attributes);
          return data.data;
        }
      } catch (e) {
        console.error("Failed to get manga details:", e);
      }
    },

    async getMangaFeed(mangaId, limit = 5) {
      try {
        const response = await fetch(`${this.baseURL}/manga/${mangaId}/feed?translatedLanguage[]=en&limit=${limit}`);
        const data = await response.json();
        if (data.data) {
          console.log(`Found ${data.data.length} chapters:`, data.data);
          return data.data;
        }
      } catch (e) {
        console.error("Failed to get manga feed:", e);
      }
    },

    async searchManga(title, limit = 5) {
      try {
        const response = await fetch(`${this.baseURL}/manga?title=${encodeURIComponent(title)}&limit=${limit}`);
        const data = await response.json();
        if (data.data) {
          console.log(`Found ${data.data.length} results for "${title}":`, data.data);
          return data.data;
        }
      } catch (e) {
        console.error("Search failed:", e);
      }
    },

    async cleanupInvalidMangaIds() {
      const result = await this.batchValidateMangaIds(100);
      if (result.invalidIds.length > 0) {
        const confirmDelete = confirm(`Delete ${result.invalidIds.length} invalid entries?`);
        if (confirmDelete) {
          result.invalidIds.forEach(id => localStorage.removeItem(id));
          alert(`Deleted ${result.invalidIds.length} invalid entries.`);
          console.log("Cleanup complete:", result.invalidIds);
        }
      } else {
        alert("entries are processed!");
      }
    }
  };

  // Expose API to global scope for console access
  window.MangaDexAPI = MangaDexAPI;

  /* ================ UTILITIES ================ */
  function isInTitlesSidebar(el) {
    return !!el.closest("#section-Titles");
  }
  
  function extractIdFromHref(href) {
    if (!href) return null;

    // First try UUID pattern
    const m = href.match(UUID_RE);
    if (m) return m[0];

    // Try to extract from URL path
    try {
      const url = new URL(href);
      const pathParts = url.pathname.split('/');

      const titleIndex = pathParts.indexOf('title');
      if (titleIndex !== -1 && titleIndex + 1 < pathParts.length) {
        const potentialId = pathParts[titleIndex + 1];
        if (potentialId && potentialId.trim() !== '') {
          return potentialId;
        }
      }

      const commonWords = ['title', 'chapter', 'manga', 'tag', 'group', 'user', 'settings', 'login', 'register'];
      for (const part of pathParts) {
        if (part && part.trim() !== '' && !commonWords.includes(part.toLowerCase())) {
          return part;
        }
      }
    } catch (e) {
      const parts = href.split("/");
      for (const p of parts) {
        if (p && p.length >= 1 && !p.includes('http') && !p.includes('www.') && !p.includes('.org') && !p.includes('.com')) {
          return p;
        }
      }
    }
    return null;
  }

  /* ================ EXPORT / IMPORT ================ */
  function isMangaDexPPKey(key, value) {
    return UUID_RE.test(key) && (value == "1" || value == "-1");
  }

  function exportLocalStorage() {
    try {
      const mangadexppData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (isMangaDexPPKey(key, value)) {
          mangadexppData[key] = value;
        }
      }
      const data = JSON.stringify(mangadexppData, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mangadexpp-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      console.log(`MangaDex++ exported ${Object.keys(mangadexppData).length} entries (auth tokens excluded)`);
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
          let importedCount = 0;
          let skippedCount = 0;
          Object.entries(parsed).forEach(([k, v]) => {
            if (isMangaDexPPKey(k, v)) {
              localStorage.setItem(k, v);
              importedCount++;
            } else {
              console.warn(`Skipped invalid key: ${k}=${v}`);
              skippedCount++;
            }
          });
          alert(`Import complete: ${importedCount} entries imported, ${skippedCount} invalid entries skipped.\nRefresh if needed.`);
          console.log(`MangaDex++ import: ${importedCount} valid, ${skippedCount} skipped (auth tokens protected)`);
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
    menu.style.minWidth = "220px";
    menu.style.padding = "8px";
    menu.style.boxSizing = "border-box";
    menu.style.color = "#eee";

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
    imBtn.style.marginBottom = "12px";
    imBtn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); importLocalStorage(); });
    menu.appendChild(imBtn);

    // API Validation section
    const apiTitle = document.createElement("div");
    apiTitle.textContent = "API Validation";
    apiTitle.style.fontWeight = "700";
    apiTitle.style.marginBottom = "6px";
    apiTitle.style.borderTop = "1px solid #444";
    apiTitle.style.paddingTop = "8px";
    menu.appendChild(apiTitle);

    const validateBtn = document.createElement("button");
    validateBtn.textContent = "Validate All IDs";
    validateBtn.style.width = "100%";
    validateBtn.style.marginBottom = "6px";
    validateBtn.style.fontSize = "12px";
    validateBtn.title = "Checks first 100 manga IDs against MangaDex API";
    validateBtn.addEventListener("click", e => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      menu.style.display = "none";
      console.log("Starting validation...");
      MangaDexAPI.batchValidateMangaIds(100);
    });
    menu.appendChild(validateBtn);

    const cleanupBtn = document.createElement("button");
    cleanupBtn.textContent = "Cleanup Invalid IDs";
    cleanupBtn.style.width = "100%";
    cleanupBtn.style.marginBottom = "6px";
    cleanupBtn.style.fontSize = "12px";
    cleanupBtn.title = "Remove invalid manga IDs from storage";
    cleanupBtn.addEventListener("click", e => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      menu.style.display = "none";
      console.log("Starting cleanup...");
      MangaDexAPI.cleanupInvalidMangaIds();
    });
    menu.appendChild(cleanupBtn);

    const searchBtn = document.createElement("button");
    searchBtn.textContent = "Search Manga (Demo)";
    searchBtn.style.width = "100%";
    searchBtn.style.marginBottom = "6px";
    searchBtn.style.fontSize = "12px";
    searchBtn.title = "Example: Search for 'Naruto' - check console";
    searchBtn.addEventListener("click", e => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      menu.style.display = "none";
      const query = prompt("Enter manga title to search:", "Naruto");
      if (query) {
        console.log(`Searching for "${query}"...`);
        MangaDexAPI.searchManga(query, 5);
      }
    });
    menu.appendChild(searchBtn);

    const consoleBtn = document.createElement("button");
    consoleBtn.textContent = "Console Commands Help";
    consoleBtn.style.width = "100%";
    consoleBtn.style.marginBottom = "6px";
    consoleBtn.style.fontSize = "12px";
    consoleBtn.style.backgroundColor = "#333";
    consoleBtn.addEventListener("click", e => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      alert(
        "Available Console Commands:\n\n" +
        "window.MangaDexAPI.validateMangaIdWithAPI('UUID')\n" +
        "  → Check if a single manga ID is valid\n\n" +
        "window.MangaDexAPI.batchValidateMangaIds(100)\n" +
        "  → Validate up to 100 stored IDs\n\n" +
        "window.MangaDexAPI.cleanupInvalidMangaIds()\n" +
        "  → Remove invalid IDs from storage\n\n" +
        "window.MangaDexAPI.searchManga('title', 5)\n" +
        "  → Search for manga by title\n\n" +
        "window.MangaDexAPI.getMangaDetails('UUID')\n" +
        "  → Get metadata for a manga\n\n" +
        "window.MangaDexAPI.getMangaFeed('UUID', 5)\n" +
        "  → Get chapter list for a manga\n\n" +
        "Check browser console for detailed output."
      );
    });
    menu.appendChild(consoleBtn);

    document.addEventListener("click", e => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.style.display = "none";
      }
    });

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
    row.style.marginTop = "4px";
    row.style.display = "flex";
    row.style.gap = "4px";
    row.style.justifyContent = "flex-start";
    row.style.flexDirection = "row";

    row.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); return false; });

    function mk(label, cls, cb) {
      const b = document.createElement("input");
      b.type = "button";
      b.value = label;
      b.className = cls;
      b.setAttribute("entryid", entryID);
      b.style.padding = "2px 6px";
      b.style.borderRadius = "3px";
      b.style.cursor = "pointer";
      b.style.background = "transparent";
      b.style.fontSize = "14px";
      b.style.minWidth = "70px";
      b.style.height = "28px";
      b.style.lineHeight = "24px";
      b.style.boxSizing = "border-box";
      b.style.whiteSpace = "nowrap";
      b.style.fontFamily = "inherit";
      b.style.fontWeight = "500";
      b.style.border = "1px solid rgba(255, 255, 255, 0.1)";
      b.style.transition = "all 0.15s ease";
      b.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        cb(entryID);
        applyFilters();
        return false;
      });

      b.addEventListener("mouseenter", () => {
        b.style.opacity = "0.9";
        b.style.transform = "translateY(-1px)";
        b.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
      });
      b.addEventListener("mouseleave", () => {
        b.style.opacity = "1";
        b.style.transform = "translateY(0)";
        b.style.boxShadow = "none";
      });

      return b;
    }

    row.appendChild(mk("Read", "mangadexpp-read", id => localStorage.setItem(id, "1")));
    row.appendChild(mk("Ignore", "mangadexpp-ignore", id => localStorage.setItem(id, "-1")));
    row.appendChild(mk("Clear", "mangadexpp-clear", id => localStorage.removeItem(id)));

    return row;
  }

  /* ================ INSERTION HELPERS ================ */
  function getCandidateContainerForAnchor(a) {
    return (
      a.closest(".chapter-feed__container") ||
      a.closest(".chapter-feed__cover") ||
      a.closest(".manga-card") ||
      a.closest(".md-card") ||
      a.closest(".group.md-card") ||
      a.closest(".card") ||
      a.closest("li") ||
      a.closest("article") ||
      a.parentElement
    );
  }

  /* ================ ★ FIXED: INSERT ON DETAIL PAGE AFTER STATS ROW ================ */
  function insertControlsUnderTitleForAnchor(a) {
    try {
      if (a.closest(".mangadexpp-controls")) return;

      const href = a.getAttribute("href") || a.href || "";
      const id = extractIdFromHref(href);
      if (!id) return;

      const isDetailPage = window.location.pathname.startsWith("/title/");
      const pageMangaId = isDetailPage ? extractIdFromHref(window.location.pathname) : null;

      // Global duplicate prevention on detail page
      if (isDetailPage && id === pageMangaId) {
        if (document.querySelector(`.mangadexpp-controls input[entryid="${id}"]`)) return;
      }

      const cont = getCandidateContainerForAnchor(a);
      if (!cont) return;

      // Local duplicate check
      if (cont.querySelector(`.mangadexpp-controls input[entryid="${id}"]`)) return;

      const controls = createControlsRow(id);

      // ---- DETAIL PAGE: Insert after the stats / eye icon row ----
      if (isDetailPage && id === pageMangaId) {
        // Find the span with the eye icon (Area 1 – preferred)
        const eyeSpan = document.querySelector('span.flex.items-center.opacity-40 svg.feather-eye');
        const statsElement = eyeSpan ? eyeSpan.closest('span.flex.items-center') : null;

        if (statsElement) {
          statsElement.parentNode.insertBefore(controls, statsElement.nextSibling);
          // Make buttons fit inline next to the stats
          controls.style.display = "inline-flex";
          controls.style.marginLeft = "12px";
          controls.style.marginTop = "0";
          return; // Success, done.
        }

        // Fallback: insert after the main <h1> title element
        const titleHeader = document.querySelector('h1');
        if (titleHeader) {
          titleHeader.parentNode.insertBefore(controls, titleHeader.nextSibling);
          return;
        }
      }

      // ---- List / grid view: existing logic ----
      const titleElement =
        cont.querySelector(".chapter-feed__cover") ||
        cont.querySelector(".chapter-feed__cover-image") ||
        a;

      try {
        titleElement.parentNode.insertBefore(controls, titleElement.nextSibling);
      } catch {
        const tagsRow = cont.querySelector(".flex.flex-wrap.gap-1.tags-row.tags.self-start");
        if (tagsRow) {
          tagsRow.parentNode.insertBefore(controls, tagsRow);
        } else {
          cont.appendChild(controls);
        }
      }
    } catch (e) {
      // silently fail
    }
  }

  function addControlsToAll() {
    const titleLinks = document.querySelectorAll("a[href*='/title/']");
    const processedContainers = new Set();

    const isDetailPage = window.location.pathname.startsWith("/title/");
    const pageMangaId = isDetailPage ? extractIdFromHref(window.location.pathname) : null;
    let mainDetailInjected = false;

    titleLinks.forEach(a => {
      if (
        a.closest("nav") ||
        a.closest("header") ||
        a.closest(".mangadexpp-settings-container") ||
        isInTitlesSidebar(a)
      ) return;

      const id = extractIdFromHref(a.getAttribute("href") || a.href || "");

      // On detail page skip if we already injected for the main manga
      if (isDetailPage && id === pageMangaId) {
        if (mainDetailInjected || document.querySelector(`.mangadexpp-controls input[entryid="${id}"]`)) {
          mainDetailInjected = true;
          return;
        }
      }

      const cont = getCandidateContainerForAnchor(a);
      if (!cont || processedContainers.has(cont)) return;

      insertControlsUnderTitleForAnchor(a);
      processedContainers.add(cont);

      if (isDetailPage && id === pageMangaId) mainDetailInjected = true;
    });
  }

  /* ================ FEED UNREAD DETECTION (Hide-All-Read) ================ */
  function hasUnreadChaptersInFeedContainer(container) {
    const list = container.querySelector(".chapter-feed__chapters-list");
    if (!list) return null;
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
      if (unread === null) return;
      const allRead = unread === false;
      if (allRead) { cont.style.display = "none"; cont.setAttribute("feed-allread-hide", "true"); }
      else { if (cont.hasAttribute("feed-allread-hide")) { cont.removeAttribute("feed-allread-hide"); cont.style.display = ""; } }
    });
  }

  /* ================ FILTER LOGIC ================ */
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

    hideAllReadFeed();
  }

  /* ================ TOP CONTROLS ================ */
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
      b.style.padding = "0 0.8em";
      b.style.marginLeft = "4px";
      b.style.borderRadius = "3px";
      b.style.cursor = "pointer"; b.style.backgroundColor = get() ? color : "transparent";
      b.style.fontSize = "14px";
      b.style.height = "28px";
      b.style.lineHeight = "28px";
      b.style.boxSizing = "border-box";
      b.style.fontFamily = "inherit";
      b.style.fontWeight = "500";
      b.style.border = "1px solid rgba(255, 255, 255, 0.1)";
      b.style.transition = "all 0.15s ease";
      b.addEventListener("click", () => {
        const v = !get();
        set(v);
        b.style.backgroundColor = v ? color : "transparent";
        applyFilters();
        if (typeof cb === "function") cb();
      });

      b.addEventListener("mouseenter", () => {
        b.style.opacity = "0.9";
        b.style.transform = "translateY(-1px)";
        b.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
      });
      b.addEventListener("mouseleave", () => {
        b.style.opacity = "1";
        b.style.transform = "translateY(0)";
        b.style.boxShadow = "none";
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

  /* ================ OPTIMIZED MUTATION OBSERVER ================ */
  function runOnce() {
    addTopControls();
    addControlsToAll();
    applyFilters();
  }

  let scheduled = false;
  let lastRunTime = 0;
  const MIN_RUN_INTERVAL = 100;
  const DEBOUNCE_DELAY = 50;

  let debounceTimer = null;
  let mutationCount = 0;
  const MAX_MUTATIONS_BEFORE_IMMEDIATE = 10;

  function scheduleRun() {
    mutationCount++;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const now = Date.now();
    const timeSinceLastRun = now - lastRunTime;

    if (mutationCount >= MAX_MUTATIONS_BEFORE_IMMEDIATE) {
      if (!scheduled) {
        scheduled = true;
        mutationCount = 0;
        setTimeout(() => {
          scheduled = false;
          lastRunTime = Date.now();
          try { runOnce(); } catch (e) { console.error(e); }
        }, 0);
      }
      return;
    }

    if (timeSinceLastRun >= MIN_RUN_INTERVAL && !scheduled) {
      scheduled = true;
      mutationCount = 0;
      setTimeout(() => {
        scheduled = false;
        lastRunTime = Date.now();
        try { runOnce(); } catch (e) { console.error(e); }
      }, 0);
      return;
    }

    debounceTimer = setTimeout(() => {
      if (!scheduled) {
        scheduled = true;
        mutationCount = 0;
        setTimeout(() => {
          scheduled = false;
          lastRunTime = Date.now();
          try { runOnce(); } catch (e) { console.error(e); }
        }, 0);
      }
    }, DEBOUNCE_DELAY);
  }

  const observer = new MutationObserver((mutations) => {
    const hasRelevantMutations = mutations.some(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) return true;
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.classList && (
          target.classList.contains('chapter-feed__container') ||
          target.classList.contains('manga-card') ||
          target.classList.contains('md-card') ||
          target.tagName === 'A'
        )) return true;
      }
      return false;
    });

    if (hasRelevantMutations) scheduleRun();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'href', 'style'],
    characterData: false
  });

  scheduleRun();

})();
