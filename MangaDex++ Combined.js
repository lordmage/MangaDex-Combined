// ==UserScript==
// @name         MangaDex++ Enhanced v2.6.5
// @version      2.6.5
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @description  Read / Ignore / Clear buttons on every manga card - Optimized performance 
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

  const UUID_RE =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;


  /* ============================================================
     PAGE DETECTION
     ============================================================ */

  function isTitleDetailPage() {
    return /^\/title\/[0-9a-f-]+(?:\/|$)/i.test(
      window.location.pathname
    );
  }

  function getCurrentTitleId() {
    const match =
      window.location.pathname.match(
        /^\/title\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i
      );

    return match ? match[1] : null;
  }

  function isInTitlesSidebar(el) {
    return !!el.closest("#section-Titles");
  }


  /* ============================================================
     ID EXTRACTION
     ============================================================ */

  function extractIdFromHref(href) {
    if (!href) return null;

    const m = href.match(UUID_RE);

    if (m) {
      return m[0];
    }

    try {
      const url = new URL(href);

      const pathParts =
        url.pathname.split("/");

      const titleIndex =
        pathParts.indexOf("title");

      if (
        titleIndex !== -1 &&
        titleIndex + 1 < pathParts.length
      ) {
        const potentialId =
          pathParts[titleIndex + 1];

        if (
          potentialId &&
          potentialId.trim() !== ""
        ) {
          return potentialId;
        }
      }

      const commonWords = [
        "title",
        "chapter",
        "manga",
        "tag",
        "group",
        "user",
        "settings",
        "login",
        "register"
      ];

      for (const part of pathParts) {
        if (
          part &&
          part.trim() !== "" &&
          !commonWords.includes(
            part.toLowerCase()
          )
        ) {
          return part;
        }
      }
    } catch (e) {
      const parts =
        href.split("/");

      for (const p of parts) {
        if (
          p &&
          p.length >= 1 &&
          !p.includes("http") &&
          !p.includes("www.") &&
          !p.includes(".org") &&
          !p.includes(".com")
        ) {
          return p;
        }
      }
    }

    return null;
  }


  /* ============================================================
     EXPORT / IMPORT
     ============================================================ */

  function isMangaDexPPKey(key, value) {
    return (
      UUID_RE.test(key) &&
      (value == "1" || value == "-1")
    );
  }

  function exportLocalStorage() {
    try {
      const mangadexppData = {};

      for (
        let i = 0;
        i < localStorage.length;
        i++
      ) {
        const key =
          localStorage.key(i);

        const value =
          localStorage.getItem(key);

        if (
          isMangaDexPPKey(
            key,
            value
          )
        ) {
          mangadexppData[key] =
            value;
        }
      }

      const data =
        JSON.stringify(
          mangadexppData,
          null,
          2
        );

      const blob =
        new Blob(
          [data],
          {
            type:
              "application/json"
          }
        );

      const a =
        document.createElement(
          "a"
        );

      a.href =
        URL.createObjectURL(
          blob
        );

      a.download =
        "mangadexpp-data.json";

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(
        a.href
      );

      console.log(
        `MangaDex++ exported ${Object.keys(mangadexppData).length} entries (auth tokens excluded)`
      );
    } catch (e) {
      console.error(
        "Export failed",
        e
      );

      alert(
        "Export failed — see console."
      );
    }
  }

  function importLocalStorage() {
    const input =
      document.createElement(
        "input"
      );

    input.type = "file";
    input.accept =
      "application/json";

    input.onchange = e => {
      const f =
        e.target.files[0];

      if (!f) return;

      const r =
        new FileReader();

      r.onload = () => {
        try {
          const parsed =
            JSON.parse(
              r.result
            );

          let importedCount = 0;
          let skippedCount = 0;

          Object.entries(
            parsed
          ).forEach(
            ([k, v]) => {
              if (
                isMangaDexPPKey(
                  k,
                  v
                )
              ) {
                localStorage.setItem(
                  k,
                  v
                );

                importedCount++;
              } else {
                console.warn(
                  `Skipped invalid key: ${k}=${v}`
                );

                skippedCount++;
              }
            }
          );

          alert(
            `Import complete: ${importedCount} entries imported, ${skippedCount} invalid entries skipped.\nRefresh if needed.`
          );

          console.log(
            `MangaDex++ import: ${importedCount} valid, ${skippedCount} skipped (auth tokens protected)`
          );
        } catch (err) {
          console.error(
            "Import failed",
            err
          );

          alert(
            "Invalid JSON file."
          );
        }
      };

      r.readAsText(f);
    };

    document.body.appendChild(
      input
    );

    input.click();

    input.remove();
  }


  /* ============================================================
     SETTINGS COG
     ============================================================ */

  function createSettingsCog() {
    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.style.position =
      "relative";

    wrapper.classList.add(
      "mangadexpp-settings-container"
    );

    const btn =
      document.createElement(
        "input"
      );

    btn.type = "button";
    btn.value = "⚙";
    btn.title =
      "MangaDex++ Settings";

    btn.style.padding =
      "0 0.8em";

    btn.style.marginLeft =
      "6px";

    btn.style.borderRadius =
      "4px";

    btn.style.backgroundColor =
      SETTINGS_BUTTON_COLOR;

    btn.style.cursor =
      "pointer";

    const menu =
      document.createElement(
        "div"
      );

    menu.style.display =
      "none";

    menu.style.position =
      "absolute";

    menu.style.top =
      "110%";

    menu.style.left = "0";

    menu.style.background =
      "#1a1a1a";

    menu.style.border =
      "1px solid #333";

    menu.style.borderRadius =
      "6px";

    menu.style.zIndex =
      "999999";

    menu.style.minWidth =
      "200px";

    menu.style.padding =
      "8px";

    menu.style.boxSizing =
      "border-box";

    menu.style.color =
      "#eee";

    menu.addEventListener(
      "click",
      e =>
        e.stopPropagation()
    );

    const dataTitle =
      document.createElement(
        "div"
      );

    dataTitle.textContent =
      "Data";

    dataTitle.style.fontWeight =
      "700";

    dataTitle.style.marginBottom =
      "6px";

    menu.appendChild(
      dataTitle
    );

    const cleanBtn =
      document.createElement(
        "button"
      );

        menu.appendChild(
      cleanBtn
    );

    const exBtn =
      document.createElement(
        "button"
      );

    exBtn.textContent =
      "Export Data";

    exBtn.style.width =
      "100%";

    exBtn.style.marginBottom =
      "6px";

    exBtn.addEventListener(
      "click",
      e => {
        e.preventDefault();
        e.stopPropagation();

        exportLocalStorage();
      }
    );

    menu.appendChild(
      exBtn
    );

    const imBtn =
      document.createElement(
        "button"
      );

    imBtn.textContent =
      "Import Data";

    imBtn.style.width =
      "100%";

    imBtn.style.marginBottom =
      "6px";

    imBtn.addEventListener(
      "click",
      e => {
        e.preventDefault();
        e.stopPropagation();

        importLocalStorage();
      }
    );

    menu.appendChild(
      imBtn
    );

    document.addEventListener(
      "click",
      e => {
        if (
          !menu.contains(
            e.target
          ) &&
          e.target !== btn
        ) {
          menu.style.display =
            "none";
        }
      }
    );

    btn.addEventListener(
      "click",
      e => {
        e.preventDefault();
        e.stopPropagation();

        menu.style.display =
          menu.style.display ===
          "block"
            ? "none"
            : "block";
      }
    );

    wrapper.appendChild(
      btn
    );

    wrapper.appendChild(
      menu
    );

    return wrapper;
  }


  /* ============================================================
     PER-TITLE CONTROLS
     ============================================================ */

  function createControlsRow(entryID) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "mangadexpp-controls";

    row.setAttribute(
      "data-mangadexpp-entryid",
      entryID
    );

    row.style.marginTop =
      "4px";

    row.style.marginBottom =
      "4px";

    row.style.display =
      "flex";

    row.style.gap =
      "4px";

    row.style.justifyContent =
      "flex-start";

    row.style.flexDirection =
      "row";

    row.addEventListener(
      "click",
      e => {
        e.preventDefault();
        e.stopPropagation();

        return false;
      }
    );

    function mk(
      label,
      cls,
      cb
    ) {
      const b =
        document.createElement(
          "input"
        );

      b.type = "button";

      b.value = label;

      b.className = cls;

      b.setAttribute(
        "entryid",
        entryID
      );

      b.style.padding =
        "2px 6px";

      b.style.borderRadius =
        "3px";

      b.style.cursor =
        "pointer";

      b.style.background =
        "transparent";

      b.style.fontSize =
        "14px";

      b.style.minWidth =
        "70px";

      b.style.height =
        "28px";

      b.style.lineHeight =
        "24px";

      b.style.boxSizing =
        "border-box";

      b.style.whiteSpace =
        "nowrap";

      b.style.fontFamily =
        "inherit";

      b.style.fontWeight =
        "500";

      b.style.border =
        "1px solid rgba(255, 255, 255, 0.1)";

      b.style.transition =
        "all 0.15s ease";

      b.addEventListener(
        "click",
        e => {
          e.preventDefault();
          e.stopPropagation();

          cb(entryID);

          applyFilters();

          return false;
        }
      );

      b.addEventListener(
        "mouseenter",
        () => {
          b.style.opacity =
            "0.9";

          b.style.transform =
            "translateY(-1px)";

          b.style.boxShadow =
            "0 2px 4px rgba(0,0,0,0.2)";
        }
      );

      b.addEventListener(
        "mouseleave",
        () => {
          b.style.opacity =
            "1";

          b.style.transform =
            "translateY(0)";

          b.style.boxShadow =
            "none";
        }
      );

      return b;
    }

    row.appendChild(
      mk(
        "Read",
        "mangadexpp-read",
        id =>
          localStorage.setItem(
            id,
            "1"
          )
      )
    );

    row.appendChild(
      mk(
        "Ignore",
        "mangadexpp-ignore",
        id =>
          localStorage.setItem(
            id,
            "-1"
          )
      )
    );

    row.appendChild(
      mk(
        "Clear",
        "mangadexpp-clear",
        id =>
          localStorage.removeItem(
            id
          )
      )
    );

    return row;
  }


  /* ============================================================
     TITLE DETAIL PAGE
     ============================================================ */

  /*
   * Find ONLY the Upload Chapter anchor for the CURRENT title.
   *
   * Example:
   *
   * /title/upload/93f59355-6c69-416f-a5fb-84927eb31d42
   *
   * This intentionally does NOT select the generic:
   *
   * .rounded.custom-opacity.relative.md-btn...
   *
   * because that class combination is also used by buttons
   * inside MangaDex drawers/sidebars.
   */
  function findTitleUploadAnchor() {
    if (!isTitleDetailPage()) {
      return null;
    }

    const titleID =
      getCurrentTitleId();

    if (!titleID) {
      return null;
    }

    const expectedHref =
      `/title/upload/${titleID}`;

    /*
     * First use the exact href.
     */
    const exact =
      document.querySelector(
        `a[href="${expectedHref}"]`
      );

    if (
      exact &&
      !exact.closest(
        "#section-Titles"
      ) &&
      !exact.closest(
        "[role='dialog']"
      )
    ) {
      return exact;
    }

    /*
     * Fallback for absolute URLs or
     * framework-normalized href values.
     */
    const anchors =
      document.querySelectorAll(
        "a[href]"
      );

    for (const anchor of anchors) {
      const href =
        anchor.getAttribute(
          "href"
        ) || "";

      if (
        href === expectedHref ||
        href.endsWith(
          expectedHref
        )
      ) {
        if (
          anchor.closest(
            "#section-Titles"
          ) ||
          anchor.closest(
            "[role='dialog']"
          )
        ) {
          continue;
        }

        return anchor;
      }
    }

    return null;
  }


  /*
   * Remove duplicate controls belonging to
   * the current title.
   */
  function removeDuplicateTitleControls(
    titleID,
    keepRow = null
  ) {
    const rows =
      document.querySelectorAll(
        ".mangadexpp-controls"
      );

    rows.forEach(row => {
      const input =
        row.querySelector(
          "input[entryid]"
        );

      if (!input) return;

      const rowID =
        input.getAttribute(
          "entryid"
        );

      if (
        rowID !== titleID
      ) {
        return;
      }

      if (
        keepRow &&
        row === keepRow
      ) {
        return;
      }

      try {
        row.remove();
      } catch (e) {}
    });
  }


  /*
   * Inject exactly ONE control row immediately
   * AFTER the Upload Chapter anchor.
   */
  function addTitleDetailControls() {
    if (
      !isTitleDetailPage()
    ) {
      return;
    }

    const titleID =
      getCurrentTitleId();

    if (!titleID) {
      return;
    }

    const uploadAnchor =
      findTitleUploadAnchor();

    if (
      !uploadAnchor ||
      !uploadAnchor.parentNode
    ) {
      return;
    }

    /*
     * Check whether the control is already
     * immediately after Upload Chapter.
     */
    const next =
      uploadAnchor.nextElementSibling;

    if (
      next &&
      next.classList.contains(
        "mangadexpp-controls"
      )
    ) {
      const input =
        next.querySelector(
          "input[entryid]"
        );

      if (
        input &&
        input.getAttribute(
          "entryid"
        ) === titleID
      ) {
        /*
         * Correct placement already exists.
         * Remove any additional duplicate rows
         * for this title elsewhere.
         */
        removeDuplicateTitleControls(
          titleID,
          next
        );

        return;
      }
    }

    /*
     * Remove every existing row for this
     * title before inserting the correct one.
     */
    removeDuplicateTitleControls(
      titleID
    );

    /*
     * Create the ONE title-page control row.
     */
    const controls =
      createControlsRow(
        titleID
      );

    /*
     * INSERTION POINT:
     *
     * immediately AFTER:
     *
     * <a
     *   href="/title/upload/<TITLE_ID>"
     *   class="rounded custom-opacity relative md-btn
     *          flex items-center px-3 overflow-hidden accent"
     * >
     *
     */
    uploadAnchor.parentNode.insertBefore(
      controls,
      uploadAnchor.nextSibling
    );
  }


  /* ============================================================
     GENERIC PAGE INSERTION
     ============================================================ */

  function getCandidateContainerForAnchor(a) {
    return (
      a.closest(
        ".chapter-feed__container"
      ) ||
      a.closest(
        ".chapter-feed__cover"
      ) ||
      a.closest(
        ".manga-card"
      ) ||
      a.closest(
        ".md-card"
      ) ||
      a.closest(
        ".group.md-card"
      ) ||
      a.closest(
        ".card"
      ) ||
      a.closest("li") ||
      a.closest("article") ||
      a.parentElement
    );
  }

  function insertControlsUnderTitleForAnchor(
    a
  ) {
    try {
      if (
        a.closest(
          ".mangadexpp-controls"
        )
      ) {
        return;
      }

      const href =
        a.getAttribute(
          "href"
        ) ||
        a.href ||
        "";

      const id =
        extractIdFromHref(
          href
        );

      if (!id) return;

      const cont =
        getCandidateContainerForAnchor(
          a
        );

      if (!cont) return;

      const existingControls =
        cont.querySelector(
          `.mangadexpp-controls input[entryid="${id}"]`
        );

      if (existingControls) {
        return;
      }

      const titleElement =
        cont.querySelector(
          ".chapter-feed__cover"
        ) ||
        cont.querySelector(
          ".chapter-feed__cover-image"
        ) ||
        cont.querySelector(
          "a[data-v-58880355]"
        ) ||
        a;

      const controls =
        createControlsRow(id);

      if (
        titleElement &&
        titleElement.parentNode
      ) {
        titleElement.parentNode.insertBefore(
          controls,
          titleElement.nextSibling
        );
      } else {
        const tagsRow =
          cont.querySelector(
            ".flex.flex-wrap.gap-1.tags-row.tags.self-start"
          );

        if (tagsRow) {
          tagsRow.parentNode.insertBefore(
            controls,
            tagsRow
          );
        } else {
          cont.appendChild(
            controls
          );
        }
      }
    } catch (e) {
      console.error(
        "Failed to insert controls:",
        e
      );
    }
  }


  /* ============================================================
     GENERIC PAGE CONTROL SCANNER
     ============================================================ */

  function addControlsToAll() {
    /*
     * NEVER run the generic title-link scanner
     * on a title/detail page.
     *
     * Title/detail pages are handled exclusively
     * by addTitleDetailControls().
     */
    if (
      isTitleDetailPage()
    ) {
      return;
    }

    const titleLinks =
      document.querySelectorAll(
        "a[href*='/title/']"
      );

    const processedContainers =
      new Set();

    titleLinks.forEach(a => {
      if (
        a.closest("nav") ||
        a.closest("header") ||
        a.closest(
          ".mangadexpp-settings-container"
        ) ||
        isInTitlesSidebar(a)
      ) {
        return;
      }

      const cont =
        getCandidateContainerForAnchor(
          a
        );

      if (
        !cont ||
        processedContainers.has(
          cont
        )
      ) {
        return;
      }

      insertControlsUnderTitleForAnchor(
        a
      );

      processedContainers.add(
        cont
      );
    });
  }


  /* ============================================================
     FEED UNREAD DETECTION
     ============================================================ */

  function hasUnreadChaptersInFeedContainer(
    container
  ) {
    const list =
      container.querySelector(
        ".chapter-feed__chapters-list"
      );

    if (!list) {
      return null;
    }

    const unread =
      list.querySelector(
        ".readMarker:not(.opacity-40)"
      );

    return !!unread;
  }

  function hideAllReadFeed() {
    if (
      !DOES_HIDE_ALL_READ
    ) {
      return;
    }

    document
      .querySelectorAll(
        ".chapter-feed__container"
      )
      .forEach(
        cont => {
          if (
            cont.closest(
              ".layout-container"
            )
          ) {
            cont.style.display =
              "";

            return;
          }

          if (
            !hideAllRead
          ) {
            if (
              cont.hasAttribute(
                "feed-allread-hide"
              )
            ) {
              cont.removeAttribute(
                "feed-allread-hide"
              );

              cont.style.display =
                "";
            }

            return;
          }

          const unread =
            hasUnreadChaptersInFeedContainer(
              cont
            );

          if (
            unread === null
          ) {
            return;
          }

          const allRead =
            unread === false;

          if (allRead) {
            cont.style.display =
              "none";

            cont.setAttribute(
              "feed-allread-hide",
              "true"
            );
          } else {
            if (
              cont.hasAttribute(
                "feed-allread-hide"
              )
            ) {
              cont.removeAttribute(
                "feed-allread-hide"
              );

              cont.style.display =
                "";
            }
          }
        }
      );
  }


  /* ============================================================
     FILTER LOGIC
     ============================================================ */

  function syncColors(
    row,
    flag
  ) {
    try {
      const readBtn =
        row.querySelector(
          ".mangadexpp-read"
        );

      const ignoreBtn =
        row.querySelector(
          ".mangadexpp-ignore"
        );

      if (readBtn) {
        readBtn.style.background =
          flag === "1"
            ? READ_BUTTON_COLOR
            : "transparent";
      }

      if (ignoreBtn) {
        ignoreBtn.style.background =
          flag === "-1"
            ? IGNORE_BUTTON_COLOR
            : "transparent";
      }
    } catch (e) {}
  }

  function isMangaContainer(
    cont
  ) {
    if (!cont) {
      return false;
    }

    return !!(
      cont.closest(
        ".chapter-feed__container"
      ) ||
      cont.closest(
        ".manga-card"
      ) ||
      cont.closest(
        ".md-card"
      ) ||
      cont.closest(
        ".group.md-card"
      )
    );
  }

  function applyFilters() {
    /*
     * Remove/hide duplicate native .controls
     * elements as before.
     */
    document
      .querySelectorAll(
        ".controls"
      )
      .forEach(
        (c, i) => {
          if (i > 0) {
            c.style.display =
              "none";
          }
        }
      );

    document
      .querySelectorAll(
        ".mangadexpp-controls"
      )
      .forEach(
        row => {
          const inp =
            row.querySelector(
              "input[entryid]"
            );

          if (!inp) {
            return;
          }

          const id =
            inp.getAttribute(
              "entryid"
            );

          const flag =
            localStorage.getItem(
              id
            );

          /*
           * Title/detail controls are controls
           * for the title itself and must always
           * remain visible.
           */
          if (
            isTitleDetailPage() &&
            id ===
              getCurrentTitleId()
          ) {
            syncColors(
              row,
              flag
            );

            row.style.display =
              "flex";

            return;
          }

          const cont =
            row.closest(
              ".chapter-feed__container"
            ) ||
            row.closest(
              ".manga-card"
            ) ||
            row.closest(
              ".md-card"
            ) ||
            row.closest(
              ".group.md-card"
            ) ||
            row.closest(
              ".card"
            ) ||
            row.closest("li") ||
            row.closest(
              "article"
            ) ||
            row.parentElement;

          if (!cont) {
            return;
          }

          if (
            cont.closest(
              ".layout-container"
            )
          ) {
            syncColors(
              row,
              flag
            );

            cont.style.display =
              "";

            return;
          }

          let shouldHide =
            false;

          if (
            flag === "1"
          ) {
            shouldHide =
              hideRead;
          } else if (
            flag === "-1"
          ) {
            shouldHide =
              hideIgnore;
          } else {
            shouldHide =
              hideUnmarked &&
              isMangaContainer(
                cont
              );
          }

          cont.style.display =
            shouldHide
              ? "none"
              : "";

          syncColors(
            row,
            flag
          );
        }
      );

    hideAllReadFeed();
  }


  /* ============================================================
     TOP CONTROLS
     ============================================================ */

  function addTopControls() {
    const allControls =
      document.querySelectorAll(
        ".controls"
      );

    if (
      !allControls ||
      allControls.length === 0
    ) {
      return;
    }

    const controls =
      allControls[0];

    if (
      controls.classList.contains(
        "mangadexpp-has-controls"
      )
    ) {
      return;
    }

    controls.classList.add(
      "mangadexpp-has-controls"
    );

    for (
      let i = 1;
      i < allControls.length;
      i++
    ) {
      try {
        allControls[
          i
        ].style.display =
          "none";
      } catch (e) {}
    }

    function mk(
      label,
      get,
      set,
      color,
      cb
    ) {
      const b =
        document.createElement(
          "input"
        );

      b.type = "button";

      b.value = label;

      b.style.padding =
        "0 0.8em";

      b.style.marginLeft =
        "4px";

      b.style.borderRadius =
        "3px";

      b.style.cursor =
        "pointer";

      b.style.backgroundColor =
        get()
          ? color
          : "transparent";

      b.style.fontSize =
        "14px";

      b.style.height =
        "28px";

      b.style.lineHeight =
        "28px";

      b.style.boxSizing =
        "border-box";

      b.style.fontFamily =
        "inherit";

      b.style.fontWeight =
        "500";

      b.style.border =
        "1px solid rgba(255, 255, 255, 0.1)";

      b.style.transition =
        "all 0.15s ease";

      b.addEventListener(
        "click",
        () => {
          const v =
            !get();

          set(v);

          b.style.backgroundColor =
            v
              ? color
              : "transparent";

          applyFilters();

          if (
            typeof cb ===
            "function"
          ) {
            cb();
          }
        }
      );

      b.addEventListener(
        "mouseenter",
        () => {
          b.style.opacity =
            "0.9";

          b.style.transform =
            "translateY(-1px)";

          b.style.boxShadow =
            "0 2px 4px rgba(0,0,0,0.2)";
        }
      );

      b.addEventListener(
        "mouseleave",
        () => {
          b.style.opacity =
            "1";

          b.style.transform =
            "translateY(0)";

          b.style.boxShadow =
            "none";
        }
      );

      return b;
    }

    controls.appendChild(
      mk(
        "Toggle Read",
        () => hideRead,
        v =>
          (hideRead = v),
        READ_BUTTON_COLOR
      )
    );

    controls.appendChild(
      mk(
        "Toggle Ignore",
        () => hideIgnore,
        v =>
          (hideIgnore = v),
        IGNORE_BUTTON_COLOR
      )
    );

    controls.appendChild(
      mk(
        "Toggle Unmarked",
        () => hideUnmarked,
        v =>
          (hideUnmarked = v),
        UNMARKED_BUTTON_COLOR
      )
    );

    if (
      DOES_HIDE_ALL_READ
    ) {
      controls.appendChild(
        mk(
          "Hide All Read?",
          () =>
            hideAllRead,
          v =>
            (hideAllRead = v),
          HIDE_ALL_READ_BUTTON_COLOR,
          hideAllReadFeed
        )
      );
    }

    const cog =
      createSettingsCog();

    cog.classList.add(
      "mangadexpp-settings-cog"
    );

    controls.appendChild(
      cog
    );
  }


  /* ============================================================
     MAIN RUN
     ============================================================ */

  function runOnce() {
    addTopControls();

    /*
     * Title/detail pages use ONLY the Upload Chapter
     * insertion point.
     */
    if (
      isTitleDetailPage()
    ) {
      addTitleDetailControls();
    } else {
      /*
       * All other pages retain the existing
       * generic behavior.
       */
      addControlsToAll();
    }

    applyFilters();
  }


  /* ============================================================
     OPTIMIZED MUTATION OBSERVER
     ============================================================ */

  let scheduled = false;
  let lastRunTime = 0;

  const MIN_RUN_INTERVAL =
    100;

  const DEBOUNCE_DELAY =
    50;

  let debounceTimer =
    null;

  let mutationCount =
    0;

  const MAX_MUTATIONS_BEFORE_IMMEDIATE =
    10;

  function scheduleRun() {
    mutationCount++;

    if (debounceTimer) {
      clearTimeout(
        debounceTimer
      );
    }

    const now =
      Date.now();

    const timeSinceLastRun =
      now - lastRunTime;

    if (
      mutationCount >=
      MAX_MUTATIONS_BEFORE_IMMEDIATE
    ) {
      if (!scheduled) {
        scheduled = true;

        mutationCount = 0;

        setTimeout(
          () => {
            scheduled = false;

            lastRunTime =
              Date.now();

            try {
              runOnce();
            } catch (e) {
              console.error(e);
            }
          },
          0
        );
      }

      return;
    }

    if (
      timeSinceLastRun >=
        MIN_RUN_INTERVAL &&
      !scheduled
    ) {
      scheduled = true;

      mutationCount = 0;

      setTimeout(
        () => {
          scheduled = false;

          lastRunTime =
            Date.now();

          try {
            runOnce();
          } catch (e) {
            console.error(e);
          }
        },
        0
      );

      return;
    }

    debounceTimer =
      setTimeout(
        () => {
          if (!scheduled) {
            scheduled = true;

            mutationCount = 0;

            setTimeout(
              () => {
                scheduled = false;

                lastRunTime =
                  Date.now();

                try {
                  runOnce();
                } catch (e) {
                  console.error(e);
                }
              },
              0
            );
          }
        },
        DEBOUNCE_DELAY
      );
  }


  /* ============================================================
     MUTATION OBSERVER
     ============================================================ */

  const observer =
    new MutationObserver(
      mutations => {
        const hasRelevantMutations =
          mutations.some(
            mutation => {
              if (
                mutation.addedNodes &&
                mutation.addedNodes
                  .length > 0
              ) {
                return true;
              }

              if (
                mutation.type ===
                "attributes"
              ) {
                const target =
                  mutation.target;

                if (
                  target.classList &&
                  (
                    target.classList.contains(
                      "chapter-feed__container"
                    ) ||
                    target.classList.contains(
                      "manga-card"
                    ) ||
                    target.classList.contains(
                      "md-card"
                    ) ||
                    target.tagName ===
                      "A"
                  )
                ) {
                  return true;
                }
              }

              return false;
            }
          );

        if (
          hasRelevantMutations
        ) {
          scheduleRun();
        }
      }
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "href",
        "style"
      ],
      characterData: false
    }
  );


  /* ============================================================
     INITIAL RUN
     ============================================================ */

  scheduleRun();

})();
