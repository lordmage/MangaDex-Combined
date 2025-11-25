// ==UserScript==
// @name         MangaDex++ Combined
// @namespace    https://github.com/MangaDexPP/userscript
// @version      2.1
// @description  Combined MangaDex++ QOL and LocalStorage Export/Import buttons - Clean Error Handling
// @match        https://mangadex.org/*
// @match        http://mangadex.org/*
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
// @author       Theo1996 @ MagaDexPP @Github With Ai tweaks and merge from @lordmage
// @source       https://github.com/lordmage/MangaDex-Combined
// @updateURL    https://github.com/lordmage/MangaDex-Combined/blob/Base/MangaDex%2B%2B%20Combined.js
// @downloadURL   https://github.com/lordmage/MangaDex-Combined/blob/Base/MangaDex%2B%2B%20Combined.js
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

    console.log('MangaDex++ Combined v2.1 initializing...');

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
        if (stack.includes('MangaDex%252B%252B') || stack.includes('74360c41-7b13-45f1-8a6b-d94d4021a9a9')) {
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
        iconElement.innerHTML = icon;
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
                                localStorage.setItem(key, data
