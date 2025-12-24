# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.6.0] - 2025

### Changed
- Rebased the project on **v2.5.6** as a clean baseline
- Refactored control injection logic for improved DOM safety
- Unified control sizing and styling across all supported pages
- Improved container detection to prevent duplicate control rows
- Hardened MutationObserver scheduling to reduce redundant execution
- Ensured title detail pages are never hidden by filter logic

### Added
- Feed-only **Hide All Read** support using chapter read markers
- Settings ⚙ menu integrated into top control bar
  - Export localStorage data to JSON
  - Import localStorage data from JSON
- Improved hover effects for per-title and top-bar controls
- Defensive fallbacks for unexpected layout structures

### Fixed
- Fixed duplicate control rows appearing on some title pages
- Fixed controls appearing inside navigation or header elements
- Fixed filter logic incorrectly hiding title detail pages
- Fixed inconsistent control placement on feed vs. non-feed pages
- Fixed cases where controls failed to inject after SPA navigation

### Removed
- Removed reliance on fragile layout assumptions from pre-2.6.0 logic
- Removed legacy placement paths that caused misalignment

---

## [2.5.6] - Previous Stable

### Notes
- Last stable version prior to 2.6.0 refactor
- Serves as the clean baseline for all subsequent changes
- Includes original Read / Ignore / Clear functionality and basic filtering

---

