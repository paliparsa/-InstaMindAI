# Changelog

## Chrome package — Manifest V3
- Added a dedicated Chrome manifest at `chrome/manifest.json` with MV3 service worker and action configuration.
- Added a separate GitHub Actions workflow that builds and validates `instamind-ai-chrome.zip`.
- Added a small browser API namespace bridge so shared scripts run in Chrome and Firefox.
- Firefox's existing Manifest V2 configuration and Android packaging workflow remain separate and unchanged.

# Changelog

## 0.2.2 — Popup scrolling and layout
- Removed the restrictive popup height cap so the full extension view can scroll naturally.
- Removed the small nested scroll area from the accounts list; the page now owns vertical scrolling.
- Kept search and filter controls accessible while reviewing long account lists.
- Added visible, theme-matched scrollbars and keyboard focus styling.
- Improved small-screen sizing for Firefox Android.
- No changes to account collection, storage, or AI analysis behavior.

## 0.2.1 — Firefox permission metadata
- Added the required Firefox website-content data collection permission metadata for Mozilla Add-ons review.

## 0.1.0 — Initial Firefox build
- Firefox-compatible Manifest V2 WebExtension foundation.
- Visible Following-list collection and local review dashboard.
- Optional Gemini analysis of the currently open profile.
- Local search, Keep/Review labels, CSV and JSON export.
- Manual-only account decisions and privacy boundaries.

