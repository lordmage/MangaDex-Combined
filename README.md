This repo is a personal copy of combined codes it two other repo's soucres are 
https://github.com/Theo1996/mangadex-plus-plus-json-history-export-imporr and https://github.com/MangaDexPP/userscript
The use of these is ment for My own learning and Free to the public until such time as the Original code makers revoke or inform me they do not wish me to publicly use these codes. all rights go to the orginal coders and outside of what tweaks i may do to my own version. 

# MangaDex++ Combined

A comprehensive userscript that enhances your MangaDex experience with quality-of-life improvements, manga tracking, and data management features.

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

MangaDex++ Combined V 2.5.6 

A powerful, stable, and feature-rich userscript that upgrades MangaDex with quality-of-life improvements, filtering tools, metadata analysis, tag-based auto-ignoring, and robust UI enhancements.

This script is a heavily improved and expanded evolution of the original MangaDex++ userscript.
Completely refactored for reliability, performance, and full site compatibility with:

Latest
Recent
Follows
Feed
Title detail pages
Search results
Dynamic lists

⭐ Features
✔ Per-title Read / Ignore / Clear Controls
Adds three buttons under every manga card:
Read → marks the manga as read
Ignore → permanently hides it
Clear → removes flags
Flags are stored in localStorage and persist across page loads.
✔ Top-bar Filtering Controls
A custom control bar is added to the MangaDex header (no duplicates):

Button	Function
Toggle Read	Hide all items marked as read
Toggle Ignore	Hide all ignored manga
Toggle Unmarked	Hide all manga not marked read/ignored
Hide All Read?	Feed-specific “read chapter marker” detection
⚙ Settings	Opens the full MangaDex++ settings menu
✔ Tag Blacklist (with UI)
Automatically hide ("Ignore") any manga whose tags match your blacklist.
Fully editable list
Add/remove tags
Clear all
Case-insensitive
Survives reloads
API-driven metadata fetch

This is perfect for removing entire genres from your feed — permanently.

✔ Robust Feed “Hide All Read”
On feed pages (/titles/feed), the script detects chapter markers:
“opacity-40” → read
Normal marker → unread
All manga with no unread chapters vanish when the toggle is active.

✔ Export / Import System
Export or import:
Read flags
Ignore flags
Tag blacklist
Internal settings
Great for backups or syncing to another device.

✔ Dynamic MutationObserver Support
MangaDex is fully reactive — the script stays in sync with:
Infinite scrolling
Dynamic lists
Live component updates
Search filtering
Everything is reattached automatically.

✔ Safe Click Handling
Clicking a MangaDex++ button never opens the title page.
All interactions use stopPropagation() and preventDefault()
to avoid accidental navigation.

✔ High Performance Design
Includes:
API request batching
Rate limiting
Deferred DOM insertion
Automatic detection of container types
No redundant fetch loops
Zero console errors

🛠 Installation
Requires a userscript manager:
Tampermonkey (recommended)
Violentmonkey
Greasemonkey

Install via Raw Link
https://raw.githubusercontent.com/MangaDex-Combined/raw/refs/heads/Base/MangaDex++%20Combined.js

⚙ Settings Menu (Full Description)
The settings menu is accessible from the ⚙ button in the top navigation bar.
Data Tools
Export Data → save settings/localStorage to JSON
Import Data → load previously saved data
Tag Blacklist

A complete tag management UI:
Add tags by name
Remove individual tags
Clear all tags
List auto-scrolls
Tags apply instantly
Triggers metadata fetch for new cards
🧠 How Tag Auto-Ignore Works
Each visible manga ID is queued for metadata lookup:
IDs are batched (max 100 per API request)
Requests are rate-limited
MangaDex API returns the tag list
Any matching blacklist tag ⇒ marked ignored (value -1)
You never see manga you don't want to see.

📦 Changelog Summary
Fixed tag blacklist menu collapsing on input click
Improved event isolation in menu UI
Hardened filter logic
Corrected Hide-All-Read behavior in feed
Added safe unmarked filtering
Improved insertion logic for all card types
Zero console error release
Fixes for /titles/latest and control bar duplication
Resolved container detection issues
Removed “Show only unread” per user request
Retained full tag blacklist system
Introduced tag blacklist UI
Added settings menu
API metadata batching system
(And all additional fixes spanning from the original script to present.)

🧩 Compatibility

Tested on:
Chromium / Chrome / Edge
Firefox
Brave
Opera GX
Works across all MangaDex deployments and UI themes (light/dark).

📬 Contributions Only the main source codes attributed above with alot of testing and tweaking thur Several Ai Tools Learned quite a bit during the process.

Pull requests are welcome!
Please follow the repo structure and include:

Clear descriptions
No inline minification
📄 License
MIT License — Free for modification and distribution.
Credit appreciated but not required.
