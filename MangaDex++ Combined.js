// ==UserScript==
// @name         MangaDex++ Combined
// @copyright    Lordmage 2025
// @namespace    https://github.com/lordmage/MangaDex-Combined
// @version      2.5.4
// @description  Fixed: Complete null safety in button placement with multiple fallbacks
// @author       @ Theo1996, MangaDexPP, patched by Workik
// @homepageURL  https://github.com/lordmage/MangaDex-Combined
// @updateURL    https://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @downloadURL  https://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
// @match        https://mangadex.org/*
// @match        http://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @grant        none
// ==/UserScript==

/* global localStorage, URL, Blob, FileReader, fetch */
/* eslint-disable no-unused-vars */

(() => {
    'use strict';

    // ---------- CONFIGURABLE ----------
    const POLLING_TIME = 400;
    const API_REQUEST_INTERVAL = 1000;

    // Tracker colors
    const READ_BUTTON_COLOR = '#13ab493d';
    const IGNORE_BUTTON_COLOR = '#ab13133d';
    const UNMARKED_BUTTON_COLOR = '#4242cd3d';
    const HIDE_ALL_READ_BUTTON_COLOR = '#ff80003d';
    const SETTINGS_BUTTON_COLOR = '#6b72803d';

    const DOES_HIDE_ALL_READ = true;

    // block lists (all lowercase intended where appropriate)
    const USER_LIST = [];
    const GROUP_LIST = [];
    const TAG_LIST = ["boys' love"];

    // ---------- INTERNAL STATE ----------
    let hideRead = false;
    let hideIgnore = true;
    let hideUnmarked = false;
    let hideAllRead = true;
    let forceRecheckNewEntry = false;
    const queue = [];

    // Page categories
    const CATEGORY_FEED = '/titles/feed';
    const CATEGORY_FOLLOWS = '/titles/follows';
    const CATEGORY_HISTORY = '/my/history';
    const CATEGORY_ALL = '/titles';
    const CATEGORY_RECENT = '/titles/recent';
    const CATEGORY_LATEST = '/titles/latest';
    const CATEGORY_AUTHOR = '/author/';
    const CATEGORY_GROUP = '/group/';
    const CATEGORY_TITLE = '/title/';
    const CATEGORY_TAGS = '/tag/';

    const FORMAT_NOT_FOUND = 0;
    const FORMAT_LIST = 1;
    const FORMAT_THUMBNAIL = 2;
    const FORMAT_DETAIL = 3;

    // ---------------- utilities ----------------
    function getFormat(pathname) {
        if (pathname.startsWith(CATEGORY_TITLE)) return FORMAT_DETAIL;
        if (pathname.startsWith(CATEGORY_GROUP)) return FORMAT_LIST;
        if (pathname.startsWith(CATEGORY_AUTHOR)) return FORMAT_THUMBNAIL;
        if (pathname.startsWith(CATEGORY_TAGS)) return FORMAT_THUMBNAIL;
        switch (pathname) {
            case CATEGORY_FEED:     return FORMAT_LIST;
            case CATEGORY_FOLLOWS:  return FORMAT_THUMBNAIL;
            case CATEGORY_HISTORY:  return FORMAT_LIST;
            case CATEGORY_ALL:      return FORMAT_THUMBNAIL;
            case CATEGORY_RECENT:   return FORMAT_THUMBNAIL;
            case CATEGORY_LATEST:   return FORMAT_LIST;
            default:                return FORMAT_NOT_FOUND;
        }
    }

    // Clean error handler
    window.addEventListener('error', function(event) {
        if (event.filename && event.filename.includes('MangaDex%252B%252B')) {
            console.error('MangaDex++ Script Error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        }
    });

    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        const stack = reason?.stack || '';
        if (stack.includes('MangaDex%252B%252B') || stack.includes('beb556ce-fe4d-45c1-b984-348ff6245401')) {
            console.error('MangaDex++ Unhandled Promise Rejection:', { reason, promise: event.promise });
        }
        event.preventDefault();
    });

    // ---------- LocalStorage export/import ----------
    function exportLocalStorage() {
        try {
            const data = JSON.stringify(localStorage, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'mangadex-localstorage.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            console.log('MangaDex++: LocalStorage exported successfully!');
        } catch (error) {
            console.error('MangaDex++ Export error:', error);
        }
    }

    function importLocalStorage() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = function(event) {
                try {
                    const file = event.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const data = JSON.parse(e.target.result);
                            Object.keys(data).forEach(key => {
                                localStorage.setItem(key, data[key]);
                            });
                            console.log('MangaDex++: LocalStorage successfully restored!');
                            location.reload();
                        } catch (parseError) {
                            console.error('MangaDex++: Error parsing JSON:', parseError);
                        }
                    };
                    reader.readAsText(file);
                } catch (error) {
                    console.error('MangaDex++: Import file error:', error);
                }
            };
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        } catch (error) {
            console.error('MangaDex++: Import error:', error);
        }
    }

    // ---------- Settings Cog with Dropdown ----------
    function createSettingsCog() {
        try {
            const settingsButton = document.createElement('input');
            settingsButton.type = 'button';
            settingsButton.value = '⚙';
            settingsButton.title = 'MangaDex++ Settings';
            settingsButton.style.backgroundColor = SETTINGS_BUTTON_COLOR;
            settingsButton.style.padding = '0 1em';
            settingsButton.style.boxShadow = 'inset 0 0 3px 1px #ddd';
            settingsButton.style.borderRadius = '4px';
            settingsButton.style.marginLeft = '5px';
            settingsButton.style.cursor = 'pointer';
            settingsButton.style.fontSize = '14px';
            settingsButton.style.fontWeight = 'bold';
            settingsButton.style.color = '#ffffff';

            const dropdown = document.createElement('div');
            dropdown.style.display = 'none';
            dropdown.style.position = 'absolute';
            dropdown.style.backgroundColor = '#1a1a1a';
            dropdown.style.border = '1px solid #333';
            dropdown.style.borderRadius = '6px';
            dropdown.style.padding = '8px 0';
            dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
            dropdown.style.zIndex = '10000';
            dropdown.style.minWidth = '180px';
            dropdown.style.marginTop = '5px';
            dropdown.style.fontFamily = 'inherit';

            const exportButton = document.createElement('button');
            exportButton.textContent = '📤 Export Data';
            exportButton.style.width = '100%';
            exportButton.style.padding = '10px 12px';
            exportButton.style.margin = '0';
            exportButton.style.border = 'none';
            exportButton.style.borderRadius = '0';
            exportButton.style.backgroundColor = 'transparent';
            exportButton.style.cursor = 'pointer';
            exportButton.style.textAlign = 'left';
            exportButton.style.fontSize = '13px';
            exportButton.style.color = '#e0e0e0';
            exportButton.style.fontFamily = 'inherit';
            exportButton.style.transition = 'background-color 0.2s ease';
            exportButton.title = 'Export your MangaDex++ data';

            const importButton = document.createElement('button');
            importButton.textContent = '📥 Import Data';
            importButton.style.width = '100%';
            importButton.style.padding = '10px 12px';
            importButton.style.margin = '0';
            importButton.style.border = 'none';
            importButton.style.borderRadius = '0';
            importButton.style.backgroundColor = 'transparent';
            importButton.style.cursor = 'pointer';
            importButton.style.textAlign = 'left';
            importButton.style.fontSize = '13px';
            importButton.style.color = '#e0e0e0';
            importButton.style.fontFamily = 'inherit';
            importButton.style.transition = 'background-color 0.2s ease';
            importButton.title = 'Import MangaDex++ data';

            exportButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#2a2a2a';
            });
            exportButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });

            importButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#2a2a2a';
            });
            importButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });

            exportButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                exportLocalStorage();
                dropdown.style.display = 'none';
            });

            importButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                importLocalStorage();
                dropdown.style.display = 'none';
            });

            dropdown.appendChild(exportButton);

            const separator = document.createElement('div');
            separator.style.height = '1px';
            separator.style.backgroundColor = '#333';
            separator.style.margin = '4px 0';
            dropdown.appendChild(separator);

            dropdown.appendChild(importButton);

            const settingsWrapper = document.createElement('div');
            settingsWrapper.style.position = 'relative';
            settingsWrapper.style.display = 'inline-block';
            settingsWrapper.appendChild(settingsButton);
            settingsWrapper.appendChild(dropdown);

            settingsButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const isVisible = dropdown.style.display === 'block';
                dropdown.style.display = isVisible ? 'none' : 'block';

                const rect = settingsWrapper.getBoundingClientRect();
                if (rect.right + 180 > window.innerWidth) {
                    dropdown.style.right = '0';
                    dropdown.style.left = 'auto';
                } else {
                    dropdown.style.left = '0';
                    dropdown.style.right = 'auto';
                }
            });

            document.addEventListener('click', function(e) {
                if (!settingsWrapper.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && dropdown.style.display === 'block') {
                    dropdown.style.display = 'none';
                }
            });

            return settingsWrapper;

        } catch (error) {
            console.error('MangaDex++: Error creating settings cog:', error);
            return null;
        }
    }

    // ---------- Main loop ----------
    function main() {
        try {
            const lastTagList = window.localStorage.getItem('_conf_tags');
            const currentTagList = TAG_LIST.toLocaleString();
            if (lastTagList !== currentTagList) {
                forceRecheckNewEntry = true;
                window.localStorage.setItem('_conf_tags', currentTagList);
            }
            handleBaseUrl(window.location.href);
        } catch (error) {
            console.error('MangaDex++: Error in main loop:', error);
        } finally {
            setTimeout(main, POLLING_TIME);
        }
    }

    function handleBaseUrl(baseUrl) {
        try {
            const url = new URL(baseUrl);
            const format = getFormat(url.pathname);
            blockUsers(format);
            if (format === FORMAT_NOT_FOUND) return;
            if (format === FORMAT_LIST && DOES_HIDE_ALL_READ) hideAllReadFunc();
            addControllers();
            addButtons(format);
            categorize(format, url.pathname.startsWith(CATEGORY_LATEST));
        } catch (error) {
            console.error('MangaDex++: Error in handleBaseUrl:', error);
        }
    }

    // ---------- Hide all read ----------
    function hideAllReadFunc() {
        try {
            const entries = document.querySelectorAll('.chapter-feed__container, article, .chapter-list-item, .chapter-feed > div');
            entries.forEach(entry => {
                try {
                    if (!hideAllRead) {
                        if (entry.hasAttribute('hidden-override')) entry.removeAttribute('hidden-override');
                        return;
                    }
                    let allRead = true;
                    const chapters = entry.querySelectorAll('.chapter .readMarker, .chapter .feather-eye, .chapter .chapter-read');
                    for (let j = 0; j < chapters.length; j++) {
                        if (chapters[j].classList.contains('feather-eye')) {
                            allRead = false;
                            break;
                        }
                    }
                    if (allRead) {
                        toggleVisibility(entry, false);
                        entry.setAttribute('hidden-override', 'true');
                    }
                } catch (inner) {
                    // ignore per-entry errors
                }
            });
        } catch (error) {
            console.error('MangaDex++: Error in hideAllReadFunc:', error);
        }
    }

    // ---------- Track button logic ----------
    function updateEntryVisibility(entryID, buttonElement) {
        try {
            const flag = window.localStorage.getItem(entryID);
            let shouldBeVisible = true;
            if (flag === '-1') shouldBeVisible = !hideIgnore;
            else if (flag === '1') shouldBeVisible = !hideRead;
            else shouldBeVisible = !hideUnmarked;

            const container = buttonElement.closest('.chapter-feed__container, .manga-card, article, .layout-container > div:nth-child(6)');
            if (container && !container.hasAttribute('hidden-override')) {
                toggleVisibility(container, shouldBeVisible);
            }
        } catch (error) {
            console.error('MangaDex++: Error in updateEntryVisibility:', error);
        }
    }

    function safeGetEntryIdFromLink(url) {
        if (!url) return null;
        try {
            const parsed = new URL(url, window.location.origin);
            const parts = parsed.pathname.split('/').filter(Boolean);
            const idx = parts.indexOf('title');
            if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];
            for (let i = parts.length - 1; i >= 0; i--) {
                if (parts[i].length >= 6) return parts[i];
            }
        } catch (e) {
            const parts = url.split('/').filter(Boolean);
            const titleIndex = parts.indexOf('title');
            if (titleIndex >= 0 && parts.length > titleIndex + 1) return parts[titleIndex + 1];
        }
        return null;
    }

    // COMPLETELY REWRITTEN: addButtonsForElement with comprehensive null safety
    function addButtonsForElement(entryID, element, format) {
        try {
            // Validate all inputs thoroughly
            if (!entryID || !element || !element.nodeType) {
                console.warn('MangaDex++: Invalid parameters for addButtonsForElement', {
                    entryID,
                    element: element ? element.constructor.name : 'null',
                    format
                });
                return;
            }

            // Create buttons wrapper and buttons first
            const buttonsWrapper = document.createElement('div');
            buttonsWrapper.className = 'mangadex-tracker-buttons';
            buttonsWrapper.style.display = 'inline-flex';
            buttonsWrapper.style.gap = '6px';
            buttonsWrapper.style.alignItems = 'center';
            buttonsWrapper.style.marginLeft = '6px';

            const readButton = document.createElement('button');
            readButton.className = 'databtn1';
            readButton.setAttribute('entryid', entryID);
            readButton.type = 'button';
            readButton.textContent = 'Read';
            readButton.style.padding = '2px 8px';
            readButton.style.borderRadius = '4px';

            const ignoreButton = document.createElement('button');
            ignoreButton.className = 'databtn2';
            ignoreButton.setAttribute('entryid', entryID);
            ignoreButton.type = 'button';
            ignoreButton.textContent = 'Ignore';
            ignoreButton.style.padding = '2px 8px';
            ignoreButton.style.borderRadius = '4px';

            const clearButton = document.createElement('button');
            clearButton.className = 'databtn3';
            clearButton.setAttribute('entryid', entryID);
            clearButton.type = 'button';
            clearButton.textContent = 'Clear';
            clearButton.style.padding = '2px 8px';
            clearButton.style.borderRadius = '4px';

            buttonsWrapper.appendChild(readButton);
            buttonsWrapper.appendChild(ignoreButton);
            buttonsWrapper.appendChild(clearButton);

            // Wire handlers
            readButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                queueEntry(event);
            });
            ignoreButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                ignoreEntry(event);
            });
            clearButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                clearEntry(event);
            });

            // NEW: Multiple insertion strategies with comprehensive validation
            const insertionStrategies = [
                // Strategy 1: Find title and insert next to it
                () => {
                    let title = null;
                    if (format === FORMAT_LIST) {
                        title = element.querySelector('.chapter-feed__title, h3 a, .title a');
                    } else if (format === FORMAT_THUMBNAIL) {
                        title = element.querySelector('.title, a.title');
                    } else if (format === FORMAT_DETAIL) {
                        title = element.querySelector('h1, h2, .title-header, .manga-title, [class*="title"]');
                    }

                    if (title && title.parentNode && title.parentNode.nodeType === 1) {
                        try {
                            title.parentNode.insertBefore(buttonsWrapper, title.nextSibling);
                            return true;
                        } catch (e) {
                            console.debug('MangaDex++: Strategy 1 failed (insert next to title)', e);
                        }
                    }
                    return false;
                },

                // Strategy 2: Append to title directly
                () => {
                    let title = null;
                    if (format === FORMAT_LIST) {
                        title = element.querySelector('.chapter-feed__title, h3 a, .title a');
                    } else if (format === FORMAT_THUMBNAIL) {
                        title = element.querySelector('.title, a.title');
                    } else if (format === FORMAT_DETAIL) {
                        title = element.querySelector('h1, h2, .title-header, .manga-title, [class*="title"]');
                    }

                    if (title && title.nodeType === 1) {
                        try {
                            title.appendChild(buttonsWrapper);
                            return true;
                        } catch (e) {
                            console.debug('MangaDex++: Strategy 2 failed (append to title)', e);
                        }
                    }
                    return false;
                },

                // Strategy 3: Insert at beginning of element
                () => {
                    if (element && element.nodeType === 1) {
                        try {
                            element.insertBefore(buttonsWrapper, element.firstChild);
                            return true;
                        } catch (e) {
                            console.debug('MangaDex++: Strategy 3 failed (insert at beginning)', e);
                        }
                    }
                    return false;
                },

                // Strategy 4: Append to element
                () => {
                    if (element && element.nodeType === 1) {
                        try {
                            element.appendChild(buttonsWrapper);
                            return true;
                        } catch (e) {
                            console.debug('MangaDex++: Strategy 4 failed (append to element)', e);
                        }
                    }
                    return false;
                },

                // Strategy 5: Find any reasonable container in the element
                () => {
                    const containers = element.querySelectorAll('div, section, header, .flex, .mb-4, .mt-4');
                    for (const container of containers) {
                        if (container && container.nodeType === 1) {
                            try {
                                container.appendChild(buttonsWrapper);
                                return true;
                            } catch (e) {
                                // Continue to next container
                            }
                        }
                    }
                    return false;
                },

                // Strategy 6: Last resort - insert before the element
                () => {
                    if (element && element.parentNode && element.parentNode.nodeType === 1) {
                        try {
                            element.parentNode.insertBefore(buttonsWrapper, element);
                            return true;
                        } catch (e) {
                            console.debug('MangaDex++: Strategy 6 failed (insert before element)', e);
                        }
                    }
                    return false;
                },

                // Strategy 7: Absolute last resort - append to body with warning
                () => {
                    try {
                        document.body.appendChild(buttonsWrapper);
                        console.warn('MangaDex++: Buttons appended to body as last resort');
                        return true;
                    } catch (e) {
                        console.debug('MangaDex++: Strategy 7 failed (append to body)', e);
                    }
                    return false;
                }
            ];

            // Try all strategies until one works
            let success = false;
            for (let i = 0; i < insertionStrategies.length; i++) {
                if (insertionStrategies[i]()) {
                    success = true;
                    console.debug(`MangaDex++: Buttons placed successfully using strategy ${i + 1}`);
                    break;
                }
            }

            if (!success) {
                console.error('MangaDex++: All insertion strategies failed for element:', element);
            }

        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForElement:', error);
        }
    }

    function addControllers() {
        try {
            const ele = document.querySelector('.controls, .header-controls, .md-controls, .page-controls, header .flex, .toolbar');
            if (!ele) return;

            if (ele.querySelector('#toggleQueue') !== null) return;

            const createToggle = (id, text, color, initialState, onclick) => {
                const btn = document.createElement('input');
                btn.id = id;
                btn.type = 'button';
                btn.value = text;
                btn.style.backgroundColor = initialState ? color : 'transparent';
                btn.style.padding = '0 1em';
                btn.style.boxShadow = 'inset 0 0 3px 1px #ddd';
                btn.style.borderRadius = '4px';
                btn.style.color = '#ffffff';
                btn.addEventListener('click', onclick);
                return btn;
            };

            const button1 = createToggle('toggleQueue', 'Toggle Read', READ_BUTTON_COLOR, hideRead, () => {
                hideRead = !hideRead;
                document.querySelector('#toggleQueue').style.backgroundColor = hideRead ? READ_BUTTON_COLOR : 'transparent';
                console.log('MangaDex++: Toggled read flag hidden to', hideRead);
            });

            const button2 = createToggle('toggleIgnore', 'Toggle Ignore', IGNORE_BUTTON_COLOR, hideIgnore, () => {
                hideIgnore = !hideIgnore;
                document.querySelector('#toggleIgnore').style.backgroundColor = hideIgnore ? IGNORE_BUTTON_COLOR : 'transparent';
                console.log('MangaDex++: Toggled ignore flag hidden to', hideIgnore);
            });

            const button3 = createToggle('toggleUnmarked', 'Toggle Unmarked', UNMARKED_BUTTON_COLOR, hideUnmarked, () => {
                hideUnmarked = !hideUnmarked;
                document.querySelector('#toggleUnmarked').style.backgroundColor = hideUnmarked ? UNMARKED_BUTTON_COLOR : 'transparent';
                console.log('MangaDex++: Toggled unmarked flag hidden to', hideUnmarked);
            });

            const button4 = createToggle('toggleHideAllRead', 'Hide All Read?', HIDE_ALL_READ_BUTTON_COLOR, hideAllRead, () => {
                hideAllRead = !hideAllRead;
                document.querySelector('#toggleHideAllRead').style.backgroundColor = hideAllRead ? HIDE_ALL_READ_BUTTON_COLOR : 'transparent';
                console.log('MangaDex++: Toggled hide all read to', hideAllRead);
            });

            ele.appendChild(button1);
            ele.appendChild(button2);
            ele.appendChild(button3);

            if (DOES_HIDE_ALL_READ) {
                ele.appendChild(button4);

                const settingsCog = createSettingsCog();
                if (settingsCog) {
                    ele.appendChild(settingsCog);
                }
            }

        } catch (error) {
            console.error('MangaDex++: Error in addControllers:', error);
        }
    }

    function addButtons(format) {
        try {
            switch (format) {
                case FORMAT_LIST:
                    addButtonsForListFormat();
                    break;
                case FORMAT_THUMBNAIL:
                    addButtonsForThumbnailFormat();
                    break;
                case FORMAT_DETAIL:
                    addButtonsForDetailFormat();
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('MangaDex++: Error in addButtons:', error);
        }
    }

    function addButtonsForListFormat() {
        try {
            const entries = document.querySelectorAll('.chapter-feed__container, .chapter-list-item, article, .chapter-feed > div');
            for (const entry of entries) {
                if (entry.querySelector('.mangadex-tracker-buttons')) continue;
                const titleElement = entry.querySelector('.chapter-feed__title, h3 a, .title a');
                if (!titleElement) continue;
                const url = titleElement.href || titleElement.getAttribute('data-href') || (titleElement.parentNode && titleElement.parentNode.href);
                const entryID = safeGetEntryIdFromLink(url);
                if (!entryID) continue;
                addButtonsForElement(entryID, entry, FORMAT_LIST);
            }
        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForListFormat:', error);
        }
    }

    function addButtonsForThumbnailFormat() {
        try {
            const entries = document.querySelectorAll('.manga-card, .card, .thumbnail-card');
            for (const entry of entries) {
                if (entry.querySelector('.mangadex-tracker-buttons')) continue;
                const titleElement = entry.querySelector('.title, a.title, h3 a');
                if (!titleElement) continue;
                const url = titleElement.href || titleElement.getAttribute('data-href') || (titleElement.parentNode && titleElement.parentNode.href);
                const entryID = safeGetEntryIdFromLink(url);
                if (!entryID) continue;
                try {
                    titleElement.addEventListener('click', function(ev) {
                        if (this.href) {
                            ev.preventDefault();
                            window.open(this.href, '_blank');
                        }
                    });
                    titleElement.style.cursor = 'pointer';
                } catch (e) {}
                addButtonsForElement(entryID, entry, FORMAT_THUMBNAIL);
            }
        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForThumbnailFormat:', error);
        }
    }

    // IMPROVED: Better container finding for detail pages
    function addButtonsForDetailFormat() {
        try {
            // Multiple selector attempts with better fallbacks
            const possibleSelectors = [
                '.layout-container > div:nth-child(6)',
                '.manga-detail',
                '.title-detail',
                '[class*="detail"]',
                '.flex.gap-3',
                '.mb-4',
                'main > div:first-child',
                '.container',
                '.mx-auto',
                'div[class*="manga"]',
                'section'
            ];

            let entry = null;
            for (const selector of possibleSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el && el.nodeType === 1 && el.offsetParent !== null) {
                        entry = el;
                        console.debug(`MangaDex++: Found detail container with selector: ${selector}`);
                        break;
                    }
                }
                if (entry) break;
            }

            if (!entry) {
                console.debug('MangaDex++: No suitable detail container found');
                return;
            }

            // Multiple methods to get entry ID
            let entryID = safeGetEntryIdFromLink(window.location.href);
            if (!entryID) {
                const metaElement = document.querySelector('meta[property="og:url"], meta[name="twitter:url"]');
                if (metaElement) {
                    entryID = safeGetEntryIdFromLink(metaElement.getAttribute('content'));
                }
            }

            if (!entryID) {
                console.debug('MangaDex++: Could not extract entry ID from detail page');
                return;
            }

            if (entry.querySelector('.mangadex-tracker-buttons')) {
                return;
            }

            addButtonsForElement(entryID, entry, FORMAT_DETAIL);
        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForDetailFormat:', error);
        }
    }

    // ---------- Categorize & apply visibility ----------
    function categorize(format, isLatestPage) {
        try {
            if (format === FORMAT_NOT_FOUND) return;

            let selector = '.layout-container > div:nth-child(6)';
            if (format === FORMAT_LIST) selector = '.chapter-feed__container, .chapter-list-item, article';
            if (format === FORMAT_THUMBNAIL) selector = '.manga-card, .card, .thumbnail-card';

            const entries = document.querySelectorAll(selector);
            for (const entry of entries) {
                const button1 = entry.querySelector('.databtn1');
                const button2 = entry.querySelector('.databtn2');

                if (button1 !== null && button2 !== null) {
                    const entryID = button1.getAttribute('entryid');
                    let displayElement = entry;

                    const flag = window.localStorage.getItem(entryID);
                    if (flag === '-1') {
                        button1.style.backgroundColor = 'transparent';
                        button2.style.backgroundColor = IGNORE_BUTTON_COLOR;
                        if (displayElement) toggleVisibility(displayElement, !hideIgnore);
                    } else if (flag === '1') {
                        button1.style.backgroundColor = READ_BUTTON_COLOR;
                        button2.style.backgroundColor = 'transparent';
                        if (displayElement) toggleVisibility(displayElement, !hideRead);
                    } else {
                        button1.style.backgroundColor = 'transparent';
                        button2.style.backgroundColor = 'transparent';
                        if (displayElement) toggleVisibility(displayElement, !hideUnmarked);
                        if (isLatestPage && (flag === null || forceRecheckNewEntry) && !queue.includes(entryID)) {
                            queue.push(entryID);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('MangaDex++: Error in categorize:', error);
        }
    }

    function toggleVisibility(displayElement, on) {
        try {
            if (!displayElement) return;
            if (displayElement.hasAttribute('hidden-override')) return;
            if (on) {
                displayElement.style.display = '';
                displayElement.classList.remove('hidden');
            } else {
                displayElement.style.display = 'none';
            }
        } catch (error) {
            console.error('MangaDex++: Error in toggleVisibility:', error);
        }
    }

    function queueEntry(event) {
        try {
            const entryID = event.currentTarget.getAttribute('entryid');
            if (!entryID) return;
            console.log('MangaDex++: Queue', entryID);
            window.localStorage.setItem(entryID, '1');
            event.currentTarget.style.backgroundColor = READ_BUTTON_COLOR;
            const ignoreBtn = event.currentTarget.parentNode.querySelector('.databtn2');
            if (ignoreBtn) ignoreBtn.style.backgroundColor = 'transparent';
            updateEntryVisibility(entryID, event.currentTarget);
        } catch (error) {
            console.error('MangaDex++: Error in queueEntry:', error);
        }
    }

    function ignoreEntry(event) {
        try {
            const entryID = event.currentTarget.getAttribute('entryid');
            if (!entryID) return;
            console.log('MangaDex++: Ignore', entryID);
            window.localStorage.setItem(entryID, '-1');
            event.currentTarget.style.backgroundColor = IGNORE_BUTTON_COLOR;
            const readBtn = event.currentTarget.parentNode.querySelector('.databtn1');
            if (readBtn) readBtn.style.backgroundColor = 'transparent';
            updateEntryVisibility(entryID, event.currentTarget);
        } catch (error) {
            console.error('MangaDex++: Error in ignoreEntry:', error);
        }
    }

    function clearEntry(event) {
        try {
            const entryID = event.currentTarget.getAttribute('entryid');
            if (!entryID) return;
            console.log('MangaDex++: Clear', entryID);
            window.localStorage.removeItem(entryID);
            const parent = event.currentTarget.parentNode;
            if (parent) {
                const readBtn = parent.querySelector('.databtn1');
                const ignoreBtn = parent.querySelector('.databtn2');
                if (readBtn) readBtn.style.backgroundColor = 'transparent';
                if (ignoreBtn) ignoreBtn.style.backgroundColor = 'transparent';
            }
            updateEntryVisibility(entryID, event.currentTarget);
        } catch (error) {
            console.error('MangaDex++: Error in clearEntry:', error);
        }
    }

    // ---------- Queue handling (async fetch) ----------
    async function handle_queue() {
        try {
            if (queue.length > 0) {
                const entryID = queue.shift();
                try {
                    await checkPage(entryID);
                } catch (err) {
                    console.debug('MangaDex++: Error while checking, requeueing', entryID);
                    if (!queue.includes(entryID)) queue.push(entryID);
                }
            }
        } catch (error) {
            console.error('MangaDex++: Error in handle_queue:', error);
        } finally {
            setTimeout(handle_queue, API_REQUEST_INTERVAL);
        }
    }

    async function checkPage(entryID) {
        try {
            const url = `https://api.mangadex.org/manga/${entryID}?includes[]=author&includes[]=artist&includes[]=cover_art`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const resp = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            }).catch(err => { throw err; });
            clearTimeout(timeout);

            if (resp.status === 404) {
                window.localStorage.setItem(entryID, '-1');
                console.warn('MangaDex++: Entry not found (404), auto-ignored', entryID);
                return;
            }

            if (!resp.ok) {
                console.error('MangaDex++: Failed to fetch entry', entryID, 'status', resp.status);
                if (resp.status >= 500 || resp.status === 429) {
                    if (!queue.includes(entryID)) queue.push(entryID);
                }
                return;
            }

            const metadata = await resp.json();
            parseAndHandleEntry(entryID, metadata);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('MangaDex++: Timeout fetching entry', entryID);
                if (!queue.includes(entryID)) queue.push(entryID);
            } else {
                console.error('MangaDex++: Network error fetching entry', entryID, error);
                if (!queue.includes(entryID)) queue.push(entryID);
            }
        }
    }

    function parseAndHandleEntry(entryID, metadata) {
        try {
            if (!metadata || metadata.result === 'error' || metadata.result === 'failed') {
                console.error('MangaDex++: API error for entry', entryID, metadata?.message || metadata);
                window.localStorage.setItem(entryID, '-1');
                return;
            }

            if (!metadata.data || !metadata.data.attributes) {
                console.error('MangaDex++: Invalid API response for entry', entryID);
                window.localStorage.setItem(entryID, '-1');
                return;
            }

            const attributes = metadata.data.attributes;

            if (attributes.contentRating && attributes.contentRating === 'pornographic') {
                window.localStorage.setItem(entryID, '-1');
                console.log('MangaDex++: Ignored (pornographic) ->', entryID);
                return;
            }

            const tags = attributes.tags || [];
            for (let i = 0; i < tags.length; i++) {
                const tagAttributes = tags[i].attributes;
                if (!tagAttributes) continue;
                const tagName = ((tagAttributes.name && (tagAttributes.name.en || tagAttributes.name.original)) || '').toString().toLowerCase();
                if (TAG_LIST.includes(tagName)) {
                    window.localStorage.setItem(entryID, '-1');
                    console.log('MangaDex++: Ignored (blacklist tag) ->', entryID, tagName);
                    return;
                }
            }

            if (attributes.status && attributes.status === 'cancelled') {
                window.localStorage.setItem(entryID, '-1');
                console.log('MangaDex++: Ignored (cancelled) ->', entryID);
                return;
            }

            window.localStorage.setItem(entryID, '-2');
        } catch (error) {
            console.error('MangaDex++: Error in parseAndHandleEntry:', error);
        }
    }

    // ---------- Block users/groups ----------
    function blockUsers(format) {
        try {
            if (format === FORMAT_LIST) {
                const chapters = document.querySelectorAll('.chapter-feed__container, .chapter-list-item, article');
                const toRemove = [];
                for (const chapter of chapters) {
                    if (chapter.querySelectorAll('.chapter-grid.flex-grow').length === 0) {
                        toRemove.push(chapter);
                    }
                }
                for (const chapter of toRemove) {
                    const allChildren = document.querySelectorAll('.page-container > div');
                    if (allChildren.length > 0) {
                        const last = allChildren[allChildren.length - 1];
                        try { last.removeChild(chapter); } catch (e) {}
                    }
                }
            }

            const chapterRows = document.querySelectorAll('.chapter-grid.flex-grow, .chapter-row, .chapter');
            for (const row of chapterRows) {
                const uploader = row.querySelector('.user-tag > .line-clamp-1, .uploader, .user');
                const groupTag = row.querySelector('.group-tag, .group, .circle-group');

                if ((uploader && USER_LIST.includes((uploader.innerText || '').trim())) ||
                    (groupTag && GROUP_LIST.includes((groupTag.innerText || '').trim()))) {
                    const parent = row.parentNode;
                    if (parent && parent.parentNode) parent.parentNode.removeChild(parent);
                }
            }
        } catch (error) {
            console.error('MangaDex++: Error in blockUsers:', error);
        }
    }

    // ---------- Start ----------
    console.log('MangaDex++ Combined (Patched) initializing...');
    main();
    handle_queue();
    console.log('MangaDex++ Combined (Patched) initialized successfully');

})();
