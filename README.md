📘 MangaDex++ Enhanced

A third-party userscript that adds persistent Read / Ignore / Clear controls, filtering, and feed-aware visibility options to MangaDex — without using the MangaDex API.

⚠️ This project is not affiliated with or endorsed by MangaDex.

📦 Overview

MangaDex++ Enhanced improves manga browsing on MangaDex by allowing users to mark titles as Read, Ignored, or Unmarked, then filter visibility accordingly across feeds and listings.

This repository is a personal combined and modified copy of existing open-source MangaDex userscripts, maintained for learning purposes and shared publicly in good faith.

✨ Features
📌 Per-Title Controls

Adds Read / Ignore / Clear buttons to manga entries

Works on:

Feed pages

Latest pages

Card and list layouts

Prevents duplicate control injection

Buttons do not trigger navigation

🎛️ Global Filter Controls

Toggle visibility for:

Read titles

Ignored titles

Unmarked titles

Optional Hide All Read (Feed-Only) toggle

Uses chapter read markers

Never affects title detail pages

🧠 Smart Page Awareness

Feed & Latest pages:

Controls appear under cover art

Other browsing pages:

Controls appear under the title or before tags

Title detail pages:

Always visible

Controls are color-synced only (never hidden)

⚙️ Settings Menu

Integrated ⚙ settings cog in the top control bar

One-click:

Export stored data to JSON

Import stored data from JSON

💾 Persistent Storage

Uses browser localStorage

No API usage

Status persists across sessions and page reloads

🛡️ Stability & Safety

MutationObserver-based injection (SPA-safe)

Defensive DOM checks to prevent layout breakage

Silent failure on unsupported layouts

No external dependencies

🔧 Installation
Requirements

Tampermonkey or Violentmonkey

Install

Install a userscript manager

Open the direct install link below

Confirm installation

Visit MangaDex — controls load automatically

🔗 Links

GitHub Repository:
https://github.com/lordmage/MangaDex-Combined

Direct Install:
MangaDex++ Enhanced

MangaDex:
https://mangadex.org

⚠️ Disclaimer

This is a third-party userscript and is not affiliated with or endorsed by MangaDex.

Use at your own risk.
Always back up your data regularly.
The developers are not responsible for any issues caused by using this script.

📚 Source & Attribution Disclaimer

This repository is a personal copy of combined code derived from the following projects:

https://github.com/Theo1996/mangadex-plus-plus-json-history-export-imporr

https://github.com/MangaDexPP/userscript

The use of these sources is intended for personal learning purposes and is shared freely to the public unless and until the original authors request removal or restriction.

All rights remain with the original code authors, except for minor tweaks and enhancements made to this personal version.

🙏 Credits

@Theo1996 — Original MangaDexPP concept and implementation

Lordmage — Current maintainer and enhancements

Workik — Patches and fixes

MangaDex Community — Testing and feedback

Happy Manga Reading! 📚✨
