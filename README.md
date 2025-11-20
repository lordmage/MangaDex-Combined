This repo is a personal copy of combined codes it two other repo's soucres are 
https://github.com/Theo1996/mangadex-plus-plus-json-history-export-imporr and https://github.com/MangaDexPP/userscript
The use of these is ment for My own learning and Free to the public until such time as the Original code makers revoke or inform me they do not wish me to publicly use these codes. all rights go to the orginal coders and outside of what tweaks i may do to my own version. 

# MangaDex++ Combined

A comprehensive userscript that enhances your MangaDex experience with quality-of-life improvements, manga tracking, and data management features.

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🔄 LocalStorage Management
- **Export/Import Buttons**: Easily backup and restore your manga tracking data
- **Persistent Settings**: All your preferences and tracked manga are saved locally
- **Data Portability**: Transfer your reading history between devices

### 📚 Manga Tracking System
- **Read/Ignore/Clear Buttons**: Quick categorization for each manga
- **Visual Status Indicators**: Color-coded buttons show current status
- **Bulk Management**: Toggle visibility of read, ignored, or unmarked entries
- **Auto-tagging**: Automatically ignore manga with specified tags

### 🎯 Smart Filtering
- **Hide All Read**: Option to automatically hide fully read manga series
- **User Blocking**: Block specific uploaders from appearing in your feed
- **Group Blocking**: Hide content from specific scanlation groups
- **Tag Filtering**: Automatically ignore manga with blacklisted tags

### 🎨 UI Enhancements
- **Seamless Integration**: Buttons and controls blend with MangaDex design
- **Responsive Layout**: Works across different page formats (list, thumbnail, detail)
- **Non-intrusive**: All features are optional and can be toggled on/off

## 🚀 Installation

### Prerequisites
- A userscript manager browser extension:
  - **Tampermonkey** (Recommended) - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
  - **Violentmonkey** - [Chrome](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)

### Installation Steps
1. Install your preferred userscript manager
2. Click the raw script link: [MangaDex++ Combined.user.js](https://raw.githubusercontent.com/lordmage/MangaDex-Combined/refs/heads/Base/MangaDex%2B%2B%20Combined.js) | [Source](https://github.com/lordmage/MangaDex-Combined/releases )
3. Confirm installation in your userscript manager
4. Navigate to [MangaDex.org](https://mangadex.org) to see the enhancements

## ⚙️ Configuration

### Basic Settings (Editable in Script)
```javascript
// Polling and API settings
const POLLING_TIME = 100;           // How often to check for new content (ms)
const API_REQUEST_INTERVAL = 1000;  // Delay between API requests (ms)

// Visual settings
const READ_BUTTON_COLOR = "#13ab493d";
const IGNORE_BUTTON_COLOR = "#ab13133d";
const UNMARKED_BUTTON_COLOR = "#4242cd3d";

// Feature toggles
const DOES_HIDE_ALL_READ = true;    // Enable/disable "Hide All Read" feature

// Content filtering
const USER_LIST = [];               // Usernames to block
const GROUP_LIST = [];              // Group names to block
const TAG_LIST = ["boys' love"];    // Tags to automatically ignore
