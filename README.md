This repo is a personal copy of combined codes it two other repo's soucres are 
https://github.com/Theo1996/mangadex-plus-plus-json-history-export-imporr and https://github.com/MangaDexPP/userscript
The use of these is ment for My own learning and Free to the public until such time as the Original code makers revoke or inform me they do not wish me to publicly use these codes. all rights go to the orginal coders and outside of what tweaks i may do to my own version. 

# MangaDex++ Combined

A comprehensive userscript that enhances your MangaDex experience with quality-of-life improvements, manga tracking, and data management features.

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

MangaDex++ Combined V 2.5.7 

A powerful userscript for MangaDex.org that adds Read/Ignore/Clear buttons to every manga card with robust filtering capabilities across all pages.

📋 Features
Core Functionality
Read/Ignore/Clear buttons on every manga card and chapter feed
Four toggle controls:
Toggle Read: Hide/Show marked "Read" manga
Toggle Ignore: Hide/Show marked "Ignore" manga (default: hidden)
Toggle Unmarked: Hide/Show unmarked manga
Hide All Read?: Hide entire feed entries with no unread chapters
Works on all MangaDex pages:
/titles/feed - Latest chapter feed
/titles/follows - Followed manga
/titles - All titles
/titles/recent - Recently updated
/titles/latest - Latest updates
/title/* - Individual manga pages
And more!
Data Management
Export Data: Backup all your Read/Ignore marks to JSON
Import Data: Restore from backup or migrate to another browser
Local Storage: All data stored locally in your browser
Smart Filtering
Status-based filtering: Show/hide based on Read/Ignore/Unmarked status
Feed optimization: "Hide All Read" detects chapters with no unread content
Automatic updates: Works with MangaDex's dynamic content loading
Duplicate control prevention: Only shows one set of controls
🚀 Installation
Requirements
A userscript manager browser extension:
Tampermonkey ( Chrome | Firefox )
Violentmonkey ( Chrome | Firefox )
Greasemonkey ( Firefox )
Installation Methods
Method 1: Direct Install (Recommended)
Click this link: Install MangaDex++ Enhanced
Your userscript manager should open and prompt for installation
Click "Install" or "Confirm"
Method 2: Manual Install
Open your userscript manager
Create a new script
Copy the entire code from this repository
Paste and save
📖 Usage
Basic Usage
Navigate to any MangaDex page with manga listings
Control buttons appear automatically on each manga card
Click "Read" to mark a manga as read (green highlight)
Click "Ignore" to mark a manga to ignore (red highlight)
Click "Clear" to remove any marks
Control Buttons
The script adds control buttons at the top of MangaDex pages:

| Button | Description | Default State | |--------|-------------|---------------| | Toggle Read | Hide/show marked "Read" manga | Visible | | Toggle Ignore | Hide/show marked "Ignore" manga | Hidden | | Toggle Unmarked | Hide/show unmarked manga | Visible | | Hide All Read? | Hide feed entries with no unread chapters | Hidden | | ⚙ | Settings menu | Always visible |

Settings Menu (⚙)
Click the gear icon to access:

Export Data: Download all your marks as a JSON file
Import Data: Upload a JSON file to restore your marks
🔧 Configuration
Color Coding
The script uses semi-transparent colors to indicate status:

| Status | Color | Description | |--------|-------|-------------| | Read | #13ab493d (green) | Manga marked as read | | Ignore | #ab13133d (red) | Manga marked to ignore | | Unmarked | #4242cd3d (blue) | No status set | | Settings | #6b72803d (gray) | Settings button |

Default States
 copy
javascript

let hideRead = false;      // Read manga are visible by default
let hideIgnore = true;     // Ignored manga are hidden by default
let hideUnmarked = false;  // Unmarked manga are visible by default
let hideAllRead = true;    // Feed entries with all chapters read are hidden
💾 Data Management
Exporting Data
Click the ⚙ settings button
Click "Export Data"
A JSON file (mangadexpp-localstorage.json) will download
Store this file safely for backup
Importing Data
Click the ⚙ settings button
Click "Import Data"
Select your backup JSON file
The page will reload with your marks restored
Data Location
All data is stored in your browser's localStorage under keys that match manga IDs:

"1" = Read status
"-1" = Ignore status
🎯 Page Support
The script works on the following MangaDex page types:

| Page Type | URL Pattern | Supported | |-----------|-------------|-----------| | Chapter Feed | /titles/feed | ✅ Full support | | Follows | /titles/follows | ✅ Full support | | All Titles | /titles | ✅ Full support | | Recent Updates | /titles/recent | ✅ Full support | | Latest Updates | /titles/latest | ✅ Full support | | Search Results | /titles?search=... | ✅ Full support | | Manga Detail | /title/{uuid} | ✅ Full support | | Author Page | /author/{uuid} | ✅ Full support | | Group Page | /group/{uuid} | ✅ Full support | | Tag Page | /tag/{tag} | ✅ Full support |

🛠 Technical Details
How It Works
Mutation Observer: Watches for DOM changes and adds buttons to new content
UUID Extraction: Parses manga IDs from URLs using regex
Local Storage: Stores status marks locally in your browser
CSS Injection: Adds styles for buttons and colors dynamically
Filter System: Hides/shows manga based on status and toggle states
Code Structure
 copy
javascript

MangaDex++ Enhanced
├── CONFIG / STATE
│   ├── Color constants
│   └── Toggle state variables
├── UTILITIES
│   └── UUID extraction
├── EXPORT / IMPORT
│   ├── exportLocalStorage()
│   └── importLocalStorage()
├── SETTINGS COG
│   └── createSettingsCog()
├── PER-TITLE CONTROLS
│   └── createControlsRow()
├── INSERTION HELPERS
│   ├── getCandidateContainerForAnchor()
│   ├── insertControlsUnderTitleForAnchor()
│   └── addControlsToAll()
├── FEED UNREAD DETECTION
│   ├── hasUnreadChaptersInFeedContainer()
│   └── hideAllReadFeed()
├── FILTER LOGIC
│   ├── syncColors()
│   ├── isMangaContainer()
│   └── applyFilters()
├── TOP CONTROLS
│   └── addTopControls()
└── RUNNER & OBSERVER
    ├── runOnce()
    ├── scheduleRun()
    └── Mutation Observer
📄 License
This project is licensed under an open-source license. See the repository for details.

🙏 Credits
@Theo1996: Original MangaDexPP concept and implementation
Lordmage: Current maintainer and enhancements
Workik: Patches and fixes
MangaDex Community: Testing and feedback
🔗 Links
GitHub Repository: lordmage/MangaDex-Combined
Direct Install: MangaDex++ Enhanced
MangaDex: https://mangadex.org
⚠️ Disclaimer
This is a third-party userscript and is not affiliated with or endorsed by MangaDex. Use at your own risk. The developers are not responsible for any issues caused by using this script. Always backup your data regularly.

Happy Manga Reading! 📚
