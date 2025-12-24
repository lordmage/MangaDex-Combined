# 🔐 Security Policy

## 📌 Supported Versions

This project is a **client-side userscript** and does not provide server infrastructure.

| Version | Supported |
|--------|-----------|
| Latest release (v2.6.x) | ✅ Yes |
| Previous stable (v2.5.6) | ⚠️ Best-effort |
| Older versions | ❌ No |

Only the **latest release** is actively supported for security fixes.

---

## 🧠 Security Scope

Because this is a browser userscript:
- No backend services are involved
- No network requests are made by the script
- No credentials are collected or transmitted
- All data is stored locally using `localStorage`

Security concerns are therefore limited to:
- DOM manipulation safety
- Data integrity
- Cross-site scripting (XSS) risks
- Accidental data loss
- Browser compatibility issues

---

## 🚨 Reporting a Security Vulnerability

If you discover a potential security issue, **please do not open a public issue**.

Instead:
1. Contact the repository maintainer directly via GitHub
2. Clearly describe:
   - The affected page(s)
   - The behavior observed
   - Steps to reproduce
   - Potential impact

Security reports will be reviewed **as quickly as possible**.

---

## 🔒 What Counts as a Security Issue

✅ Valid reports:
- XSS injection via DOM insertion
- Unintended execution of user-supplied content
- Local data corruption or leakage
- Script execution outside intended pages
- Privilege escalation via userscript APIs

❌ Not considered security issues:
- MangaDex layout changes
- Visual glitches
- Feature requests
- Performance concerns without security impact

---

## 🛡️ Security Design Principles

This project follows these principles:
- **Least privilege**: No special userscript grants
- **Local-only data**: No remote storage or analytics
- **Defensive DOM checks** before mutation
- **Fail-safe behavior** when selectors change
- **No external dependencies**

---

## ⚠️ Third-Party Risk Disclaimer

This script:
- Is **not affiliated with MangaDex**
- Relies on MangaDex’s public DOM structure
- May break if MangaDex changes their site

Users are encouraged to:
- Review the source code before installation
- Keep regular backups via export
- Disable the script if unexpected behavior occurs

---

## 📜 License & Upstream Notice

This project is a **derivative work** based on:
- MangaDexPP by @Theo1996
- MangaDexPP Userscript by the MangaDexPP community

All upstream license terms and author rights are respected.

If an upstream author raises a concern, it will be addressed promptly.

---

## 🙏 Responsible Disclosure

We appreciate responsible disclosure and good-faith reports.

Security issues will be:
- Acknowledged promptly
- Fixed in the next release where applicable
- Documented in the CHANGELOG when resolved

---

Thank you for helping keep **MangaDex++ Enhanced** safe and respectful.

📚 **Happy Manga Reading!**
