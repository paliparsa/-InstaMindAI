# InstaMind AI

## Global relationship status and missing profiles (0.8.2)
- Popup, Account Manager, and Review use a shared local status for each account: **Following**, **Unfollowed**, or **Pending verification**. Changes update other open extension pages automatically.
- Status chips are color-coded consistently: green, red, and amber respectively.
- During Review, an account is removed from the local library only when Instagram displays a clear unavailable/not-found message. It is skipped before Gemini is called, so it consumes no AI tokens. Private profiles, login walls, and ambiguous loading failures are not treated as missing.


Firefox WebExtension for reviewing Instagram accounts you follow. The same codebase includes a mobile-friendly interface and packaging for **Firefox on Android**, plus a separate **Chrome Manifest V3** build.

## Features
- **Scan Following:** one click reads the complete Following and Followers lists from Instagram's signed-in web API, paginates through them, and compares IDs/usernames to identify which accounts follow you back. Scan results are marked green (follows you), red (doesn't follow you), or amber (unverified) and can be filtered in the popup.
- The full scan runs in the active signed-in Instagram tab context and saves the relationship snapshot locally. Instagram may rate-limit or change these internal endpoints; retry later if a scan is interrupted.
- Also collects account links visible on your Instagram Following page for a manual/partial collection workflow.
- Stores records locally; supports search, Keep/Review labels, per-account review, sequential bulk review, and CSV/JSON export.
- **Review** beside an account opens its profile in a background tab and analyzes it; **Open** remains navigation-only.
- Bulk review processes saved accounts one by one with progress and a stop control.
- Text analysis uses the configured Gemini text API key.
- Optional image analysis uses a **separate Gemini Vision API key and model ID**. It randomly samples up to two post thumbnails visible on each profile at review time.
- The image model flags only clearly explicit nudity, explicit sexual activity, or overt adult-content promotion. Ordinary fashion, swimwear, fitness, beauty, and non-explicit poses are not treated as inappropriate.
- Review results show sampled image findings and distinguish skipped image review from completed analysis.
- No automated likes, follows, messages, or unfollows.

## Model priority lists and rate-limit fallback
In Settings, manage separate ordered lists for text and image models. Add, edit, remove, or drag models to reorder them; move-up/move-down controls are also available. Models are attempted from top to bottom. When Gemini returns a rate-limit/quota response (HTTP 429 or RESOURCE_EXHAUSTED), that model is temporarily cooled down for 60 seconds and the next available model is tried. Existing single-model settings migrate to a one-item list automatically. The API keys remain separate for text and image analysis.

## Child-suitability image screening
The optional Gemini Vision review now checks up to two randomly sampled visible post thumbnails for revealing swimwear, underwear, visible cleavage or exposed chest, exposed upper thighs, partial exposure, nudity, explicit sexual activity, and adult promotion. These are conservative manual-review warnings, not conclusions about a person. The model must not infer gender, identity, age, or other personal traits. Only sampled thumbnails are checked, so results are not exhaustive and should be verified manually.

## Account manager and JSON import
Open **Account manager** from the extension popup to view the full account library in a separate tab. Import one or more JSON files from your Instagram data download (such as `followers_1.json` and `following.json`) or an InstaMind JSON export. The importer reads files locally, recognizes Instagram relationship entries, merges duplicate usernames, and preserves existing Keep labels and AI review results. Search and relationship/status filters are available; the list is paginated at exactly 25 accounts per page. Each row keeps the Open, Review, and Keep actions, and bulk review works with the imported accounts too.

## Configure AI
Open Settings. Add the text-analysis Gemini API key and model ID. For image analysis, separately add the Vision API key and image model ID (default: `gemini-2.5-flash`). The image integration is optional; if left blank, text review continues normally.

## Consent and privacy
- No Instagram password, cookies, session tokens, DMs, or private data are collected.
- Reads only content visible on the profile page in the signed-in browser.
- Before a review, explicitly consent to sending visible profile text and up to two randomly sampled visible post thumbnails to Google Gemini. Thumbnails are sent only if the separate Vision key is configured. This update requests consent again because images are a new data category.
- API keys are stored in browser extension local storage and are not included in exports.
- Does not infer gender, sex, age, identity, ethnicity, religion, sexual orientation, health, or other sensitive traits from photos, faces, names, usernames, or indirect clues. Pronouns are shown only when explicitly self-described in profile text.
- Full Scan Following compares the complete retrieved Followers list against Following account IDs/usernames. Visible-profile AI review separately reports a badge as evidence only; badge absence is not used to conclude non-followback.
- Image analysis is a fallible visual screening aid. Verify all flags manually; uncertain images should not be treated as confirmed violations.
- The extension never likes, follows, messages, or unfollows anyone.

## Firefox on Android
The Android release uses the same WebExtension source and manifest; it is not a native APK. Firefox Android requires an AMO-signed `.xpi` for normal installation.

1. Open **Actions → Build Firefox Android package → latest successful run → Artifacts** and download `instamind-firefox-android`.
2. Use the signed XPI inside the artifact when AMO signing secrets are configured. Without them, only an unsigned ZIP is produced and cannot be installed as a normal Android add-on.
3. Install the signed XPI through Firefox Android's **Install Extension from File** option (menu wording varies by version).

For self-distribution signing, configure Actions secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`.

## Firefox Desktop (temporary)
1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on…** and select the root `manifest.json`.
3. Open Instagram in a signed-in tab, then choose **Scan Following** to run the complete relationship scan. **Collect visible accounts** remains available for visible-only collection.

## Google Chrome (Manifest V3)
1. Open **Actions → Build Chrome package → latest successful run → Artifacts**.
2. Download and extract the `instamind-ai-chrome` artifact.
3. Extract the inner `instamind-ai-chrome.zip` and select its folder in `chrome://extensions` with Developer mode enabled, or upload the ZIP to Chrome Web Store.

## Development
GitHub Actions builds and validates the Firefox/Android and Chrome packages. Instagram may change its DOM, so visible-page collection and thumbnail extraction may need maintenance. AI output is fallible and requires human verification. Not affiliated with Instagram or Meta.

## License
MIT


## Review queue and relationship tracking (0.8.1)
- Added per-result Open profile and Mark as unfollowed actions. Marking is manual and updates only the local account library; it never clicks Instagram controls.
- Added optional current Following snapshot sync when importing the official `following.json` export. Accounts missing from the latest snapshot lose the Following relation and are labelled as absent from the export, not assumed to have unfollowed you.
- The full Following scan is user-triggered and uses Instagram's internal web endpoints with the browser's signed-in session. The extension does not extract or store session cookies, passwords, or credential values.

## Previous review queue improvements (0.8.0)
- Pause after the current profile and resume later from the next account. The queue checkpoint is stored locally and survives closing the review tab.
- Results separate the profile summary, account categories, text evidence, image findings, confidence and model/fallback information.
- The **Unfollow manually** action opens the Instagram profile; you must review and confirm the unfollow on Instagram yourself. InstaMind does not automate account actions.
- Settings show per-model input, output and total tokens recorded from successful Gemini API responses made by InstaMind. This is not total API-key usage across other apps, and remaining quota is not available through this API.
