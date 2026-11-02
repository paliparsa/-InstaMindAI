# Changelog

## 0.8.4 — Permanent Keep from Following exclusion
- Add a Review action, “Keep from Following”, that stores a case-insensitive permanent local exclusion and removes the account from the shared account library.
- Excluded usernames are filtered out from future Account Manager JSON imports and live Following collection in Popup, and are skipped by current-profile analysis.
- Existing Review pages refresh through shared storage changes; excluded entries are removed from active review pages and will not be re-queued from the local library.
- Add an import exclusion regression test and bump Firefox and Chrome to 0.8.4.


## 0.8.3 — Manual unfollow from Account Manager and compact Review
- Account Manager adds a manual “Mark unfollowed” action for Following records. After the user unfollows directly on Instagram, marking removes that account from the local manager list.
- Review’s “Mark as unfollowed” action removes the record from the shared local account library, so it disappears from Account Manager and open Review pages.
- Active bulk review skips records removed from the local library instead of analyzing them later from its stale queue.
- Review results use collapsed, expandable detail sections to keep bulk-review pages shorter while preserving access to summaries, evidence, model metadata, and actions.
- Bumped Firefox and Chrome extension versions to 0.8.3.


## 0.8.2 — Global relationship states and missing-profile pruning
- Popup, Account Manager, and Review share the same local relationship states: Following, Unfollowed, and Pending verification.
- Live storage listeners refresh open extension pages after a status change; counts, filters, and status chips stay synchronized.
- Added green Following, red Unfollowed, and amber Pending verification labels.
- Review checks for explicit Instagram unavailable/not-found page messages before calling Gemini. Confirmed missing profiles are removed from the local list and skipped without text or image analysis tokens.
- Missing-profile removal updates the saved review checkpoint so resume continues at the next account. Ambiguous, private, or inaccessible profiles are not deleted.
- Bumped Firefox and Chrome extension versions to 0.8.2.


## 0.8.1 — Manual unfollow status and Following snapshot sync
- Replaced the duplicate “Unfollow manually” profile-opening shortcut with a local “Mark as unfollowed” action on every review result, alongside “Open profile”.
- Manual marking removes the Following relation from the local account record and records a timestamp; it does not interact with Instagram.
- Added an optional current-snapshot mode for importing Instagram's official `following.json`; missing accounts are labelled “Not in latest export” rather than being treated as confirmed unfollows.
- Kept relationship data local and did not add Instagram session, cookie, password, or scraping access.
- Bumped Firefox and Chrome extension versions to 0.8.1.

## 0.8.0 — Resumable review, clearer results and Gemini token tracking
- Added pause-after-current-profile and resume-from-checkpoint for bulk and single-profile review; progress survives closing the review tab.
- Reworked review results into readable profile summaries, evidence, categories, image findings, confidence and model details.
- Added a profile shortcut that opens Instagram for a user-confirmed manual unfollow; the extension does not automate follow controls.
- Added per-model input/output/total token tracking from Gemini usage metadata for successful requests made by InstaMind.
- Clarified that remaining quota is not available through the API used by the extension.
- Bumped Firefox and Chrome extension versions to 0.8.0.

## 0.7.3 — Recover content-script messaging and large local storage
- Automatically inject the Instagram reader when an already-open tab has no receiving content-script listener, then retry the requested action.
- Prevent duplicate content-script message listeners when the reader is injected more than once.
- Improve recovery/error messages for Instagram tab connection failures.
- Add `unlimitedStorage` permission so large imported account libraries are not constrained by the default extension storage quota.
- Apply the same reader-injection recovery to one-by-one profile review.

## 0.7.2 — Instagram JSON import compatibility and large-file handling
- Recognize Instagram's official `/ _u / username` export links (for example, `https://www.instagram.com/_u/username`) as account URLs.
- Keep support for `relationships_following`, `relationships_followers`, nested exports, and InstaMind exports.
- Replace repeated linear duplicate scans with a case-insensitive Map so large relationship lists import efficiently.
- Raise the per-file size limit from 20 MB to 50 MB; files are still parsed locally and never uploaded.
- Bumped Chrome and Firefox extension versions to 0.7.2.

## 0.7.1 — Desktop popup sizing and monochrome redesign
- Fixed the popup's desktop geometry at 420 × 600 CSS pixels and removed the narrow-screen media rule that incorrectly treated desktop browser popups as mobile layouts.
- Reworked the popup, settings, account manager, and review queue with a pure black/white minimal visual system.
- Added Yekan-style system font fallbacks for English UI text; no remote font requests or extra font downloads.
- Updated both Chrome and Firefox extension versions to 0.7.1.


## 0.7.0 — Ordered model pools and rate-limit fallback
- Added editable text and image model priority lists with add, edit, delete, drag-to-reorder, and accessible move-up/move-down controls.
- Model lists are tried from top to bottom and stored locally; existing single-model settings migrate automatically.
- On Gemini HTTP 429 / RESOURCE_EXHAUSTED / quota-rate-limit responses, the affected model is cooled down for 60 seconds and the next available model is tried automatically.
- The selected model and fallback path are recorded with review results.
- Kept text and image API keys separate and model lists independent.
- Bumped Chrome and Firefox extension versions to 0.7.0.


## 0.6.0 — Review, account management and popup fixes
- Added conservative image-based child-suitability warnings for revealing swimwear, underwear, visible chest/cleavage, exposed upper thighs, partial exposure, nudity and adult content.
- Added individual account deletion and a confirmed delete-all action.
- Improved profile loading with longer readiness checks and a content-script injection fallback.
- Fixed Chrome popup sizing and internal scrolling.
- Added the Chrome scripting permission for reliable profile reading.


## 0.5.0 — JSON import and paginated account manager
- Added a dedicated account manager page opened in a new browser tab.
- Import one or more Instagram followers/following JSON exports or InstaMind JSON exports.
- Merge duplicate usernames while preserving existing Keep status, profile analysis, and imported relationship metadata.
- Added follower/following filters, search, status filters, and pagination fixed at 25 accounts per page.
- Added Open, Review, Keep/Undo, Review all, and JSON/CSV export actions to the account manager.
- Files are parsed locally and are not uploaded.
- Bumped Chrome and Firefox extension versions to 0.5.0.

## 0.4.0 — Optional Gemini Vision review for Firefox and Chrome
- Added separate Gemini Vision API key and model settings, independent from the text-analysis key.
- Profile reviews randomly sample up to two currently visible post thumbnails and submit them only when the separate image key is configured and the user has consented.
- Image review reports only clearly explicit nudity, explicit sexual activity, or overt adult-content promotion; ordinary fashion, swimwear, fitness, beauty, and non-explicit poses are not flags.
- Added image findings and sampled-image status to review results; vision flags require confidence of at least 0.65 for the combined review marker.
- Re-asks for consent because image thumbnails are a new data category.
- No gender, age, identity, or other sensitive-trait inference from faces, images, names, or usernames.

## 0.3.0 — Automated review queue for Firefox and Chrome
- Added a dedicated Review action beside each account, separate from Open.
- Added a review dashboard that opens collected profiles one at a time in background tabs, analyzes them with Gemini, records progress, and supports stopping after the current profile.
- Added evidence-based flags for profiles with no visible follow-back badge plus explicit text-based content signals; missing badge is explicitly marked as uncertain.
- Added explicit consent before sending visible profile text to Gemini and added profile-loading retries.
- Profile URLs are now rebuilt from validated usernames to avoid malformed saved URLs.
- No gender or sensitive-trait inference; no likes, follows, messages, or unfollows.

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
