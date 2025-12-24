🤝 Contributing to MangaDex++ Enhanced

Thank you for your interest in contributing to MangaDex++ Enhanced!
Contributions are welcome, but please read the guidelines below carefully to ensure the project remains stable, respectful of upstream authors, and aligned with its purpose.

📌 Project Purpose

This repository is a personal, learning-focused combined copy of existing open-source MangaDex userscripts.

Its goals are to:

Experiment with enhancements and bug fixes

Learn from existing open-source code

Share improvements publicly in good faith

This project is not an official fork and is not affiliated with MangaDex.

⚠️ Important Contribution Rules
1️⃣ Respect Upstream Authors

This project is derived from:

https://github.com/Theo1996/mangadex-plus-plus-json-history-export-imporr

https://github.com/MangaDexPP/userscript

Any contributions must not:

Remove existing credits or attribution

Claim original ownership of upstream code

Introduce license conflicts

If upstream authors request changes or removal, those requests will be honored.

2️⃣ Scope of Contributions

✅ Accepted:

Bug fixes

Stability improvements

DOM selector hardening

Performance optimizations

UI consistency improvements

Defensive code and error handling

Documentation improvements

❌ Not Accepted:

Features that abuse MangaDex infrastructure

Scraping, automation, or API abuse

DRM circumvention

Monetization or ad injection

Anything that violates MangaDex Terms of Service

🧪 Development Guidelines
Userscript Constraints

Must work in Tampermonkey and Violentmonkey

No build steps or bundlers

No external dependencies

No API calls unless explicitly approved

Code Style

Vanilla JavaScript (ES6+)

Defensive DOM checks

Graceful failure on unsupported pages

Avoid hardcoded layout assumptions

Prefer MutationObserver over polling

🧠 Feature Philosophy

Before proposing a feature, ask:

Does this improve reading or browsing clarity?

Is it non-destructive?

Will it remain stable if MangaDex changes layout?

Can it fail safely?

If the answer is “no” to any of the above, the feature may be rejected.

🐛 Reporting Bugs

Please include:

A clear description of the issue

Page URL(s) affected

Browser and userscript manager

Console errors (if any)

Screenshots or screen recordings if possible

Open an issue using the Bug Report template if available.

🚀 Submitting Pull Requests

Fork the repository

Create a feature or fix branch
feature/your-feature-name or fix/bug-description

Make small, focused commits

Ensure the script:

Does not duplicate controls

Does not break title pages

Does not hide content incorrectly

Open a Pull Request with:

Clear description

What changed and why

Screenshots (if UI-related)

Large or breaking changes should be discussed before submitting a PR.

🔒 Data Safety

Do not introduce telemetry

Do not collect personal data

All data must remain local (localStorage)

Export/import must remain optional and transparent

📜 License & Ownership

By contributing:

You agree your contributions may be distributed under the same terms as this repository

You acknowledge this project is a derivative work

You do not claim exclusive ownership of shared code

🙏 Credits & Acknowledgment

Contributors may be acknowledged in:

GitHub Releases

README credits section

Meaningful contributions will always be credited.
