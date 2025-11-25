
Tampermonkey® by Jan Biniok
v5.4.0
	
MangaDex++ Combined
by @ Theo1996 And MangaDexPP With AI tweaks and merger done by lordmage
1
// ==UserScript==
2
// @name         MangaDex++ Combined
3
// @copyright Lordmage 2025
4
// @namespace   https://github.com/lordmage/MangaDex-Combined
5
// @version      2.3
6
// @description  Combined MangaDex++ QOL and LocalStorage Export/Import buttons - Clean Error Handling
7
// @author @ Theo1996 And MangaDexPP With AI tweaks and merger done by lordmage
8
// @homepageURL https://github.com/lordmage/MangaDex-Combined
9
// @updateURL https://github.com/lordmage/MangaDex-Combined/blob/Base/MangaDex%2B%2B%20Combined.js
10
// @downloadURL https://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js
11
// @match        https://mangadex.org/*
12
// @match        http://mangadex.org/*
13
// @icon         https://icons.duckduckgo.com/ip2/www.mangadex.org.ico
14
// @grant        none
15
// ==/UserScript==
16
​
17
/* global localStorage, URL, Blob, FileReader, XMLHttpRequest */
18
/* eslint-disable no-unused-vars */
19
​
20
//------------------------------------------------//
21
//------------------CONFIGURABLE------------------//
22
//------------------------------------------------//
23
​
24
//-------------------UNIVERSAL--------------------//
25
const POLLING_TIME = 100;
26
const API_REQUEST_INTERVAL = 1000;
27
​
28
//--------------------TRACKER---------------------//
29
const READ_BUTTON_COLOR = '#13ab493d';
30
const IGNORE_BUTTON_COLOR = '#ab13133d';
31
const UNMARKED_BUTTON_COLOR = '#4242cd3d';
32
const HIDE_ALL_READ_BUTTON_COLOR = '#ff80003d';
33
​
34
//-----------------HIDE ALL READ------------------//
35
const DOES_HIDE_ALL_READ = true;
36
​
37
//------------------BLOCK USERS-------------------//
38
const USER_LIST = [];
39
const GROUP_LIST = [];
40
const TAG_LIST = ['boys\' love']; // IMPORTANT: Use all lowercase
41
​
42
//------------------------------------------------//
43
//------------------DO NOT TOUCH------------------//
44
//--------------MANGA TRACKER CONSTS--------------//
45
//------------------------------------------------//
46
let hideRead = false;
47
let hideIgnore = true;
48
let hideUnmarked = false;
49
let hideAllRead = true;
50
let forceRecheckNewEntry = false;
51
const queue = [];
52
​
53
const CATEGORY_FEED = '/titles/feed';
54
const CATEGORY_FOLLOWS = '/titles/follows';
55
const CATEGORY_HISTORY = '/my/history';
56
const CATEGORY_ALL = '/titles';
57
const CATEGORY_RECENT = '/titles/recent';
58
const CATEGORY_LATEST = '/titles/latest';
59
const CATEGORY_AUTHOR = '/author/';
60
const CATEGORY_GROUP = '/group/';
61
const CATEGORY_TITLE = '/title/';
62
const CATEGORY_TAGS = '/tag/';
63
​
64
const FORMAT_NOT_FOUND = 0;
65
const FORMAT_LIST = 1;
66
const FORMAT_THUMBNAIL = 2;
67
const FORMAT_DETAIL = 3;
68
​
69
/**
70
 * Get page format based on pathname
