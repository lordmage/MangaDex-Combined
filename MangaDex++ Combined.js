// ==UserScript==
// @name         MangaDex++ Combined
// @namespace    https://github.com/MangaDexPP/userscript
// @version      2.2
// @description  Combined MangaDex++ QOL and LocalStorage Export/Import buttons - Clean Error Handling
// @match        https://mangadex.org/*
// @match        http://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @grant        none
// ==/UserScript==

/* global localStorage, URL, Blob, FileReader, XMLHttpRequest */
/* eslint-disable no-unused-vars */

//------------------------------------------------//
//------------------CONFIGURABLE------------------//
//------------------------------------------------//

//-------------------UNIVERSAL--------------------//
const POLLING_TIME = 100;
const API_REQUEST_INTERVAL = 1000;

//--------------------TRACKER---------------------//
const READ_BUTTON_COLOR = '#13ab493d';
const IGNORE_BUTTON_COLOR = '#ab13133d';
const UNMARKED_BUTTON_COLOR = '#4242cd3d';
const HIDE_ALL_READ_BUTTON_COLOR = '#ff80003d';

//-----------------HIDE ALL READ------------------//
const DOES_HIDE_ALL_READ = true;

//------------------BLOCK USERS-------------------//
const USER_LIST = [];
const GROUP_LIST = [];
const TAG_LIST = ['boys\' love']; // IMPORTANT: Use all lowercase

//------------------------------------------------//
//------------------DO NOT TOUCH------------------//
//--------------MANGA TRACKER CONSTS--------------//
//------------------------------------------------//
let hideRead = false;
let hideIgnore = true;
let hideUnmarked = false;
let hideAllRead = true;
let forceRecheckNewEntry = false;
const queue = [];

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

/**
 * Get page format based on pathname
 * @param {string} pathname - Current page pathname
 * @returns {number} Format constant
 */
function getFormat(pathname) {
    if (pathname.startsWith(CATEGORY_TITLE)) {
        return FORMAT_DETAIL;
    }
    if (pathname.startsWith(CATEGORY_GROUP)) {
        return FORMAT_LIST;
    }
    if (pathname.startsWith(CATEGORY_AUTHOR)) {
        return FORMAT_THUMBNAIL;
    }
    if (pathname.startsWith(CATEGORY_TAGS)) {
        return FORMAT_THUMBNAIL;
    }
    switch (pathname) {
        case CATEGORY_FEED:
            return FORMAT_LIST;
        case CATEGORY_FOLLOWS:
            return FORMAT_THUMBNAIL;
        case CATEGORY_HISTORY:
            return FORMAT_LIST;
        case CATEGORY_ALL:
            return FORMAT_THUMBNAIL;
        case CATEGORY_RECENT:
            return FORMAT_THUMBNAIL;
        case CATEGORY_LATEST:
            return FORMAT_LIST;
        case CATEGORY_TITLE:
            return FORMAT_DETAIL;
        case CATEGORY_GROUP:
            return FORMAT_LIST;
        case CATEGORY_AUTHOR:
            return FORMAT_THUMBNAIL;
        default:
            return FORMAT_NOT_FOUND;
    }
}

//------------------------------------------------//
//----------LOCALSTORAGE EXPORT/IMPORT------------//
//------------------------------------------------//
(function() {
    'use strict';

    console.log('MangaDex++ Combined v2.2 initializing...');

    // Clean error handler - only log MangaDex++ specific errors
    window.addEventListener('error', function(event) {
        // Only log errors that come from our userscript
        if (event.filename && event.filename.includes('MangaDex%252B%252B')) {
            console.error('MangaDex++ Script Error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        }
        // Ignore external script errors (Google Tag Manager, etc.)
    });

    window.addEventListener('unhandledrejection', function(event) {
        // Only log rejections that might be related to our script
        const reason = event.reason;

        // Check if this is likely from our script by examining the stack
        const stack = reason?.stack || '';
        if (stack.includes('MangaDex%252B%252B') || stack.includes('beb556ce-fe4d-45c1-b984-348ff6245401')) {
            console.error('MangaDex++ Unhandled Promise Rejection:', {
                reason: reason,
                promise: event.promise
            });
        }
        // Ignore external promise rejections (Google Tag Manager, MangaDex API 404s, etc.)

        event.preventDefault();
    });

    /**
     * Create a styled button element
     * @param {string} text - Button text
     * @param {string} title - Button title/tooltip
     * @param {Function} onClick - Click handler
     * @param {string} icon - Icon character
     * @returns {HTMLButtonElement} Created button
     */
    function createButton(text, title, onClick, icon) {
        const button = document.createElement('button');
        button.title = title;
        button.style.fontSize = '12px';
        button.style.fontWeight = 'normal';
        button.style.padding = '2px 6px';
        button.style.margin = '2px';
        button.style.backgroundColor = '#333';
        button.style.color = 'white';
        button.style.border = '1px solid #555';
        button.style.borderRadius = '4px';
        button.style.zIndex = '99999';
        button.style.position = 'relative';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.cursor = 'pointer';

        const iconElement = document.createElement('span');
        iconElement.textContent = icon;
        button.appendChild(iconElement);
        button.appendChild(document.createTextNode(' ' + text));

        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * Export localStorage data to JSON file
     */
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

    /**
     * Import localStorage data from JSON file
     */
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
                            location.reload(); // Refresh to apply changes
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

    /**
     * Add Export/Import buttons above the toggle controls
     */
    function addExportImportButtons() {
        try {
            const checkForElement = setInterval(function() {
                try {
                    // Look for the controls container where toggle buttons are added
                    const controlsContainer = document.querySelector('.controls');

                    if (controlsContainer) {
                        clearInterval(checkForElement);

                        // Check if buttons already exist to avoid duplicates
                        if (controlsContainer.querySelector('.mangadex-export-import-buttons')) {
                            return;
                        }

                        // Create export/import buttons container
                        const buttonContainer = document.createElement('div');
                        buttonContainer.className = 'mangadex-export-import-buttons';
                        buttonContainer.style.display = 'flex';
                        buttonContainer.style.flexDirection = 'row';
                        buttonContainer.style.gap = '5px';
                        buttonContainer.style.marginBottom = '10px';
                        buttonContainer.style.justifyContent = 'center';
                        buttonContainer.style.width = '100%';

                        const exportButton = createButton('Export', 'Export MangaDex++ Data', exportLocalStorage, '📤');
                        const importButton = createButton('Import', 'Import MangaDex++ Data', importLocalStorage, '📥');

                        buttonContainer.appendChild(exportButton);
                        buttonContainer.appendChild(importButton);

                        // Insert the export/import buttons ABOVE the existing toggle controls
                        controlsContainer.insertBefore(buttonContainer, controlsContainer.firstChild);

                        console.log('MangaDex++: Export/Import buttons attached successfully above toggle controls!');
                    }
                } catch (error) {
                    console.error('MangaDex++: Error in addExportImportButtons interval:', error);
                }
            }, 200);

            // Timeout after 10 seconds if element not found
            setTimeout(() => {
                clearInterval(checkForElement);
                console.log('MangaDex++: Could not find controls container for Export/Import buttons');
            }, 10000);
        } catch (error) {
            console.error('MangaDex++: Error in addExportImportButtons:', error);
        }
    }

    // Start adding Export/Import buttons
    addExportImportButtons();

    // MangaDex++ main functions
    main();

    /**
     * Main loop function
     */
    function main() {
        try {
            const lastTagList = window.localStorage.getItem('_conf_tags');
            const currentTagList = TAG_LIST.toLocaleString();
            if (lastTagList !== currentTagList) {
                forceRecheckNewEntry = true;
                window.localStorage.setItem('_conf_tags', currentTagList);
            }
            handleBaseUrl(window.location.href);
            setTimeout(main, POLLING_TIME);
        } catch (error) {
            console.error('MangaDex++: Error in main loop:', error);
            setTimeout(main, POLLING_TIME);
        }
    }

    /**
     * Handle base URL and determine page format
     * @param {string} baseUrl - Current page URL
     */
    function handleBaseUrl(baseUrl) {
        try {
            const url = new URL(baseUrl);
            const format = getFormat(url.pathname);

            blockUsers(format);
            if (format === FORMAT_NOT_FOUND) {
                return;
            }

            if (format === FORMAT_LIST && DOES_HIDE_ALL_READ) {
                hideAllReadFunc();
            }

            addControllers();
            addButtons(format);
            categorize(format, url.pathname.startsWith(CATEGORY_LATEST));
        } catch (error) {
            console.error('MangaDex++: Error in handleBaseUrl:', error);
        }
    }

    //------------------------------------------------//
    //-----------------HIDE ALL READ------------------//
    //------------------------------------------------//
    /**
     * Hide all read manga entries
     */
    function hideAllReadFunc() {
        try {
            const entries = document.querySelectorAll('.chapter-feed__container');
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                if (!hideAllRead) {
                    if (entry.attributes['hidden-override']) {
                        entry.attributes['hidden-override'] = undefined;
                    }
                    continue;
                }
                let allRead = true;
                const chapters = entry.querySelectorAll('.chapter .readMarker');
                for (let j = 0; j < chapters.length; j++) {
                    allRead = allRead && !chapters[j].classList.contains('feather-eye');
                }
                if (allRead) {
                    toggleVisibility(entry, false);
                    entry.setAttribute('hidden-override', 'true');
                }
            }
        } catch (error) {
            console.error('MangaDex++: Error in hideAllReadFunc:', error);
        }
    }

    //------------------------------------------------//
    //--------------------TRACKER---------------------//
    //------------------------------------------------//
    /**
     * Update entry visibility after button click
     * @param {string} entryID - Manga entry ID
     * @param {HTMLElement} buttonElement - Clicked button element
     */
    function updateEntryVisibility(entryID, buttonElement) {
        try {
            const flag = window.localStorage.getItem(entryID);
            let shouldBeVisible = true;

            if (flag === '-1') {
                shouldBeVisible = !hideIgnore;
            } else if (flag === '1') {
                shouldBeVisible = !hideRead;
            } else {
                shouldBeVisible = !hideUnmarked;
            }

            // Find the parent container to toggle visibility
            const container = buttonElement.closest('.chapter-feed__container') ||
                           buttonElement.closest('.manga-card') ||
                           buttonElement.closest('.layout-container > div:nth-child(6)');

            if (container && container.getAttribute('hidden-override') === null) {
                toggleVisibility(container, shouldBeVisible);
            }
        } catch (error) {
            console.error('MangaDex++: Error in updateEntryVisibility:', error);
        }
    }

    /**
     * Add tracking buttons to manga element
     * @param {string} entryID - Manga entry ID
     * @param {HTMLElement} element - DOM element to add buttons to
     * @param {number} format - Page format constant
     */
    function addButtonsForElement(entryID, element, format) {
        try {
            let title;
            if (format === FORMAT_LIST) {
                title = element.querySelector('.chapter-feed__title');
                if (!title) return;

                const wrapper = document.createElement('div');
                wrapper.innerHTML = title.outerHTML;
                title.parentNode.replaceChild(wrapper, title);

                title = wrapper.querySelector('.chapter-feed__title');
                title.style.setProperty('display', 'flex');
                title.style.setProperty('justify-content', 'space-between');
            } else if (format === FORMAT_THUMBNAIL) {
                title = element.querySelector('.title');
                if (!title) return;
            }

            const alignment = format === FORMAT_DETAIL ? 'left' : 'right';
            const padding = format === FORMAT_DETAIL ? '10px 0px 0px 0px' : '0px 10px 0px 10px';

            // Create buttons container using DOM methods instead of innerHTML
            const buttonsWrapper = document.createElement('div');
            buttonsWrapper.style.height = '100%';
            buttonsWrapper.style.float = alignment;
            buttonsWrapper.className = 'inline-block';

            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.padding = padding;
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.justifyContent = 'space-between';

            // Create Read button
            const readButton = document.createElement('input');
            readButton.className = 'databtn1';
            readButton.setAttribute('entryid', entryID);
            readButton.type = 'button';
            readButton.value = 'Read';
            readButton.style.backgroundColor = 'transparent';
            readButton.style.padding = '0 1em';
            readButton.style.boxShadow = 'inset 0 0 3px 1px #ddd';
            readButton.style.borderRadius = '4px';

            // Create Ignore button
            const ignoreButton = document.createElement('input');
            ignoreButton.className = 'databtn2';
            ignoreButton.setAttribute('entryid', entryID);
            ignoreButton.type = 'button';
            ignoreButton.value = 'Ignore';
            ignoreButton.style.backgroundColor = 'transparent';
            ignoreButton.style.padding = '0 1em';
            ignoreButton.style.boxShadow = 'inset 0 0 3px 1px #ddd';
            ignoreButton.style.borderRadius = '4px';

            // Create Clear button
            const clearButton = document.createElement('input');
            clearButton.className = 'databtn3';
            clearButton.setAttribute('entryid', entryID);
            clearButton.type = 'button';
            clearButton.value = 'Clear';
            clearButton.style.backgroundColor = 'transparent';
            clearButton.style.padding = '0 1em';
            clearButton.style.boxShadow = 'inset 0 0 3px 1px #ddd';
            clearButton.style.borderRadius = '4px';

            // Add buttons to container
            buttonsContainer.appendChild(readButton);
            buttonsContainer.appendChild(ignoreButton);
            buttonsContainer.appendChild(clearButton);
            buttonsWrapper.appendChild(buttonsContainer);

            if (format === FORMAT_LIST) {
                const url = title.href;
                if (!url) return;

                const link = document.createElement('a');
                link.href = url;
                link.innerHTML = title.innerHTML;

                // Prevent the title link from opening in current tab
                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    window.open(url, '_blank');
                });

                title.innerHTML = '';
                title.appendChild(link);
                title.appendChild(buttonsWrapper);

                // Add preventDefault to all button handlers
                readButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    queueEntry(event);
                });
                ignoreButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    ignoreEntry(event);
                });
                clearButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    clearEntry(event);
                });

                link.style.setProperty('overflow', 'hidden');
                link.style.setProperty('white-space', 'nowrap');
                link.style.setProperty('text-overflow', 'ellipsis');
                link.style.setProperty('cursor', 'pointer');

            } else if (format === FORMAT_THUMBNAIL) {
                const status = title.parentNode.querySelector('.status');
                if (!status) return;

                status.appendChild(buttonsWrapper);

                // Add preventDefault to all button handlers
                readButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    queueEntry(event);
                });
                ignoreButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    ignoreEntry(event);
                });
                clearButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    clearEntry(event);
                });

            } else if (format === FORMAT_DETAIL) {
                element.appendChild(buttonsWrapper);

                // Add preventDefault to all button handlers
                readButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    queueEntry(event);
                });
                ignoreButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    ignoreEntry(event);
                });
                clearButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    clearEntry(event);
                });
            }
        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForElement:', error);
        }
    }

    /**
     * Add control buttons to the page
     */
    function addControllers() {
        try {
            const ele = document.querySelector('.controls');
            if (ele === null) {
                return;
            }

            // Check if toggle buttons already exist
            if (ele.querySelector('#toggleQueue') !== null) {
                return;
            }

            const button1 = document.createElement('input');
            button1.setAttribute('id', 'toggleQueue');
            button1.setAttribute('type', 'button');
            button1.setAttribute('value', 'Toggle Read');
            button1.style.setProperty('background-color', hideRead ? READ_BUTTON_COLOR : 'transparent');
            button1.style.setProperty('padding', '0 1em');
            button1.style.setProperty('box-shadow', 'inset 0 0 3px 1px #ddd');
            button1.style.setProperty('border-radius', '4px');

            const button2 = document.createElement('input');
            button2.setAttribute('id', 'toggleIgnore');
            button2.setAttribute('type', 'button');
            button2.setAttribute('value', 'Toggle Ignore');
            button2.style.setProperty('background-color', hideIgnore ? IGNORE_BUTTON_COLOR : 'transparent');
            button2.style.setProperty('padding', '0 1em');
            button2.style.setProperty('box-shadow', 'inset 0 0 3px 1px #ddd');
            button2.style.setProperty('border-radius', '4px');

            const button3 = document.createElement('input');
            button3.setAttribute('id', 'toggleUnmarked');
            button3.setAttribute('type', 'button');
            button3.setAttribute('value', 'Toggle Unmarked');
            button3.style.setProperty('background-color', hideUnmarked ? UNMARKED_BUTTON_COLOR : 'transparent');
            button3.style.setProperty('padding', '0 1em');
            button3.style.setProperty('box-shadow', 'inset 0 0 3px 1px #ddd');
            button3.style.setProperty('border-radius', '4px');

            const button4 = document.createElement('input');
            button4.setAttribute('id', 'toggleHideAllRead');
            button4.setAttribute('type', 'button');
            button4.setAttribute('value', 'Hide All Read?');
            button4.style.setProperty('background-color', hideAllRead ? HIDE_ALL_READ_BUTTON_COLOR : 'transparent');
            button4.style.setProperty('padding', '0 1em');
            button4.style.setProperty('box-shadow', 'inset 0 0 3px 1px #ddd');
            button4.style.setProperty('border-radius', '4px');

            button1.onclick = function() {
                hideRead = !hideRead;
                console.log('MangaDex++: Toggled read flag hidden to ' + hideRead);
                button1.style.setProperty('background-color', hideRead ? READ_BUTTON_COLOR : 'transparent');
            };

            button2.onclick = function() {
                hideIgnore = !hideIgnore;
                console.log('MangaDex++: Toggled ignore flag hidden to ' + hideIgnore);
                button2.style.setProperty('background-color', hideIgnore ? IGNORE_BUTTON_COLOR : 'transparent');
            };

            button3.onclick = function() {
                hideUnmarked = !hideUnmarked;
                console.log('MangaDex++: Toggled unmarked flag hidden to ' + hideUnmarked);
                button3.style.setProperty('background-color', hideUnmarked ? UNMARKED_BUTTON_COLOR : 'transparent');
            };

            button4.onclick = function() {
                hideAllRead = !hideAllRead;
                console.log('MangaDex++: Toggled hide all read to ' + hideAllRead);
                button4.style.setProperty('background-color', hideAllRead ? HIDE_ALL_READ_BUTTON_COLOR : 'transparent');
            };

            ele.appendChild(button1);
            ele.appendChild(button2);
            ele.appendChild(button3);
            if (DOES_HIDE_ALL_READ) {
                ele.appendChild(button4);
            }
        } catch (error) {
            console.error('MangaDex++: Error in addControllers:', error);
        }
    }

    /**
     * Add buttons based on page format
     * @param {number} format - Page format constant
     */
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

    /**
     * Add buttons to list format pages
     */
    function addButtonsForListFormat() {
        try {
            const entries = document.querySelectorAll('.chapter-feed__container');
            for (const entry of entries) {
                if (entry.querySelector('input') === null) {
                    const titleElement = entry.querySelector('.chapter-feed__title');
                    if (!titleElement) continue;

                    const url = titleElement.href;
                    if (!url) continue;

                    const parts = url.split('/');
                    if (parts.length < 2) continue;

                    const entryID = parts[parts.length - 2];
                    if (!entryID) continue;

                    addButtonsForElement(entryID, entry, FORMAT_LIST);
                }
            }
        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForListFormat:', error);
        }
    }

    /**
     * Add buttons to thumbnail format pages
     */
    function addButtonsForThumbnailFormat() {
        try {
            const entries = document.querySelectorAll('.manga-card');
            for (const entry of entries) {
                if (entry.querySelector('input') === null) {
                    const titleElement = entry.querySelector('.title');
                    if (!titleElement) continue;

                    const url = titleElement.href;
                    if (!url) continue;

                    // Update the title link to open in new tab
                    titleElement.addEventListener('click', function(event) {
                        event.preventDefault();
                        window.open(url, '_blank');
                    });
                    titleElement.style.cursor = 'pointer';

                    const parts = url.split('/');
                    if (parts.length < 2) continue;

                    const entryID = parts[parts.length - 2];
                    if (!entryID) continue;

                    addButtonsForElement(entryID, entry, FORMAT_THUMBNAIL);
                }
            }
        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForThumbnailFormat:', error);
        }
    }

    /**
     * Add buttons to detail format pages
     */
    function addButtonsForDetailFormat() {
        try {
            const entry = document.querySelector('.layout-container > div:nth-child(6)');
            if (entry === null) {
                return;
            }

            let entryID;
            try {
                const parts = window.location.href.split('/');
                if (parts.length < 5) return;
                entryID = parts[4];
                if (!entryID) return;
            } catch (te) {
                console.error('MangaDex++: Error parsing URL for entryID:', te);
                return;
            }

            if (entry.querySelector('.databtn1') !== null) {
                return;
            }

            addButtonsForElement(entryID, entry, FORMAT_DETAIL);
        } catch (error) {
            console.error('MangaDex++: Error in addButtonsForDetailFormat:', error);
        }
    }

    /**
     * Categorize and apply visibility to entries
     * @param {number} format - Page format constant
     * @param {boolean} isLatestPage - Whether this is the latest page
     */
    function categorize(format, isLatestPage) {
        try {
            if (format === FORMAT_NOT_FOUND) {
                return;
            }

            let selector = '.layout-container > div:nth-child(6)';
            switch (format) {
                case FORMAT_LIST:
                    selector = '.chapter-feed__container';
                    break;
                case FORMAT_THUMBNAIL:
                    selector = '.manga-card';
                    break;
                default:
                    break;
            }

            const entries = document.querySelectorAll(selector);
            for (const entry of entries) {
                const button1 = entry.querySelector('.databtn1');
                const button2 = entry.querySelector('.databtn2');

                if (button1 !== null && button2 !== null) {
                    const entryID = button1.getAttribute('entryid');
                    let displayElement = null;

                    switch (format) {
                        case FORMAT_LIST:
                            displayElement = entry;
                            break;
                        case FORMAT_THUMBNAIL:
                            displayElement = entry;
                            break;
                        default:
                            break;
                    }

                    const flag = window.localStorage.getItem(entryID);
                    if (flag === '-1') {
                        button1.style.setProperty('background-color', 'transparent');
                        button2.style.setProperty('background-color', IGNORE_BUTTON_COLOR);
                        if (displayElement) {
                            toggleVisibility(displayElement, !hideIgnore);
                        }
                    } else if (flag === '1') {
                        button1.style.setProperty('background-color', READ_BUTTON_COLOR);
                        button2.style.setProperty('background-color', 'transparent');
                        if (displayElement) {
                            toggleVisibility(displayElement, !hideRead);
                        }
                    } else {
                        button1.style.setProperty('background-color', 'transparent');
                        button2.style.setProperty('background-color', 'transparent');
                        if (displayElement) {
                            toggleVisibility(displayElement, !hideUnmarked);
                        }
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

    /**
     * Toggle element visibility
     * @param {HTMLElement} displayElement - Element to toggle
     * @param {boolean} on - Whether to show the element
     */
    function toggleVisibility(displayElement, on) {
        try {
            if (displayElement === null || displayElement.getAttribute('hidden-override') !== null) {
                return;
            }
            if (on) {
                displayElement.style.removeProperty('display');
            } else {
                displayElement.style.setProperty('display', 'none');
            }
        } catch (error) {
            console.error('MangaDex++: Error in toggleVisibility:', error);
        }
    }

    /**
     * Mark entry as read
     * @param {Event} event - Click event
     */
    function queueEntry(event) {
        try {
            const entryID = event.currentTarget.getAttribute('entryid');
            console.log('MangaDex++: Queue ' + entryID);
            window.localStorage.setItem(entryID, '1');

            // Update button appearance immediately
            event.currentTarget.style.setProperty('background-color', READ_BUTTON_COLOR);
            const ignoreBtn = event.currentTarget.parentNode.querySelector('.databtn2');
            if (ignoreBtn) {
                ignoreBtn.style.setProperty('background-color', 'transparent');
            }

            // Update visibility based on current settings
            updateEntryVisibility(entryID, event.currentTarget);

        } catch (error) {
            console.error('MangaDex++: Error in queueEntry:', error);
        }
    }

    /**
     * Mark entry as ignored
     * @param {Event} event - Click event
     */
    function ignoreEntry(event) {
        try {
            const entryID = event.currentTarget.getAttribute('entryid');
            console.log('MangaDex++: Ignore ' + entryID);
            window.localStorage.setItem(entryID, '-1');

            // Update button appearance immediately
            event.currentTarget.style.setProperty('background-color', IGNORE_BUTTON_COLOR);
            const readBtn = event.currentTarget.parentNode.querySelector('.databtn1');
            if (readBtn) {
                readBtn.style.setProperty('background-color', 'transparent');
            }

            // Update visibility based on current settings
            updateEntryVisibility(entryID, event.currentTarget);

        } catch (error) {
            console.error('MangaDex++: Error in ignoreEntry:', error);
        }
    }

    /**
     * Clear entry status
     * @param {Event} event - Click event
     */
    function clearEntry(event) {
        try {
            const entryID = event.currentTarget.getAttribute('entryid');
            console.log('MangaDex++: Clear ' + entryID);
            window.localStorage.removeItem(entryID);

            // Update button appearance immediately
            event.currentTarget.style.setProperty('background-color', 'transparent');
            const readBtn = event.currentTarget.parentNode.querySelector('.databtn1');
            const ignoreBtn = event.currentTarget.parentNode.querySelector('.databtn2');
            if (readBtn) {
                readBtn.style.setProperty('background-color', 'transparent');
            }
            if (ignoreBtn) {
                ignoreBtn.style.setProperty('background-color', 'transparent');
            }

            // Update visibility based on current settings
            updateEntryVisibility(entryID, event.currentTarget);

        } catch (error) {
            console.error('MangaDex++: Error in clearEntry:', error);
        }
    }

    /**
     * Handle API request queue
     */
    function handle_queue() {
        try {
            if (queue.length > 0) {
                const entryID = queue.shift();
                console.debug('MangaDex++: Checking entry ' + entryID);
                checkPage(entryID);
            }
            setTimeout(handle_queue, API_REQUEST_INTERVAL);
        } catch (error) {
            console.error('MangaDex++: Error in handle_queue:', error);
            setTimeout(handle_queue, API_REQUEST_INTERVAL);
        }
    }

    /**
     * Check manga page via API
     * @param {string} entryID - Manga entry ID
     */
    function checkPage(entryID) {
        try {
            const xhr = new XMLHttpRequest();
            const url = `https://api.mangadex.org/manga/${entryID}?includes[]=author&includes[]=artist&includes[]=cover_art`;

            xhr.open('GET', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.timeout = 10000;

            xhr.onload = function () {
                try {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const metadata = JSON.parse(xhr.responseText);
                        parseAndHandleEntry(entryID, metadata);
                    } else if (xhr.status === 429) {
                        console.warn('MangaDex++: Rate limited, waiting 30 seconds');
                        setTimeout(function() {
                            queue.unshift(entryID);
                        }, 30000);
                    } else {
                        console.error('MangaDex++: Failed to fetch entry ' + entryID + ' with status ' + xhr.status);
                        if (xhr.status < 400 || xhr.status >= 500) {
                            queue.unshift(entryID);
                        }
                    }
                } catch (error) {
                    console.error('MangaDex++: Error in checkPage onload:', error);
                }
            };

            xhr.onerror = function () {
                console.error('MangaDex++: Network error fetching entry ' + entryID);
                queue.unshift(entryID);
            };

            xhr.ontimeout = function () {
                console.error('MangaDex++: Timeout fetching entry ' + entryID);
                queue.unshift(entryID);
            };

            xhr.send();
        } catch (error) {
            console.error('MangaDex++: Error in checkPage:', error);
        }
    }

    /**
     * Parse API response and handle entry
     * @param {string} entryID - Manga entry ID
     * @param {Object} metadata - API response data
     */
    function parseAndHandleEntry(entryID, metadata) {
        try {
            if (metadata.result !== 'ok') {
                console.error('MangaDex++: API error for entry ' + entryID + ': ' + (metadata.message || 'Unknown error'));
                return;
            }

            if (!metadata.data || !metadata.data.attributes) {
                console.error('MangaDex++: Invalid API response for entry ' + entryID);
                return;
            }

            const attributes = metadata.data.attributes;

            if (attributes.contentRating && attributes.contentRating === 'pornographic') {
                console.log('MangaDex++: Ignore ' + entryID + ' due to pornographic content rating');
                window.localStorage.setItem(entryID, '-1');
                return;
            }

            const tags = attributes.tags || [];
            for (let i = 0; i < tags.length; i++) {
                const tagAttributes = tags[i].attributes;
                if (!tagAttributes || !tagAttributes.name) continue;

                const tagName = (tagAttributes.name.en || tagAttributes.name.original || '').toLowerCase();
                if (TAG_LIST.includes(tagName)) {
                    console.log('MangaDex++: Ignore ' + entryID + ' due to blacklisted tag: ' + tagName);
                    window.localStorage.setItem(entryID, '-1');
                    return;
                }
            }

            if (attributes.status && attributes.status === 'cancelled') {
                console.log('MangaDex++: Ignore ' + entryID + ' due to cancelled status');
                window.localStorage.setItem(entryID, '-1');
                return;
            }

            window.localStorage.setItem(entryID, '-2');

        } catch (error) {
            console.error('MangaDex++: Error in parseAndHandleEntry:', error);
        }
    }

    //------------------------------------------------//
    //------------------BLOCK USERS-------------------//
    //------------------------------------------------//
    /**
     * Block users and groups from appearing
     * @param {number} format - Page format constant
     */
    function blockUsers(format) {
        try {
            if (format === FORMAT_LIST) {
                const chapters = document.querySelectorAll('.chapter-feed__container');
                const toRemove = [];
                for (const chapter of chapters) {
                    if (chapter.querySelectorAll('.chapter-grid.flex-grow').length === 0) {
                        toRemove.push(chapter);
                    }
                }
                for (const chapter of toRemove) {
                    const allChildren = document.querySelectorAll('.page-container > div');
                    if (allChildren.length > 0) {
                        allChildren[allChildren.length - 1].removeChild(chapter);
                    }
                }
            }

            const chapterRows = document.querySelectorAll('.chapter-grid.flex-grow');
            for (const row of chapterRows) {
                const uploader = row.querySelector('.user-tag > .line-clamp-1');
                const groupTag = row.querySelector('.group-tag');

                if ((uploader && USER_LIST.includes(uploader.innerText)) ||
                    (groupTag && GROUP_LIST.includes(groupTag.innerText))) {
                    const parent = row.parentNode;
                    if (parent && parent.parentNode) {
                        parent.parentNode.removeChild(parent);
                    }
                }
            }
        } catch (error) {
            console.error('MangaDex++: Error in blockUsers:', error);
        }
    }

    // Start queue handler for API requests
    console.log('MangaDex++ Combined v2.2 initialized successfully');
    handle_queue();

})();
