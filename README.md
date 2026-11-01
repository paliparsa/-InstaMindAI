# InstaMind AI

Firefox WebExtension for reviewing Instagram accounts you follow. The same codebase now includes a mobile-friendly interface and a packaging path for **Firefox on Android**.

## Features
- Collects account links visible on your Instagram Following page. Scroll and collect repeatedly because Instagram lazy-loads the list.
- Stores records locally in Firefox; supports search, Keep/Review labels, and CSV/JSON export.
- Analyzes the currently open profile's visible bio, page text, image alt text and post metadata using your own Gemini API key.
- Keeps all account decisions manual. It never performs an unfollow.

## Firefox on Android
The Android release uses the same WebExtension source and manifest; it is not a separate native APK. The popup layout is responsive and exports have a download-link fallback for Firefox builds where the downloads API is unavailable.

**Important:** Firefox Android requires an AMO-signed `.xpi` for normal installation. A source ZIP or the unsigned package artifact is not directly installable.

1. Open **Actions → Build Firefox Android package → latest successful run → Artifacts** and download `instamind-firefox-android`. Use the `.xpi` inside that artifact when signing is configured. Do **not** upload GitHub's green **Code → Download ZIP** source archive to AMO; it contains the repository folder and is not a ready-to-install extension package. The generated extension package has `manifest.json` directly at its archive root.
2. If installing a self-distributed signed XPI: download it to your Android device.
3. In Firefox Android, open **Settings → About Firefox** and tap the Firefox logo five times to reveal the install-from-file option (the exact menu wording can vary by Firefox version).
4. Return to Settings and choose **Install Extension from File**, select the signed `.xpi`, then confirm.
5. Open Instagram in Firefox, sign in normally, and use the InstaMind AI extension from the browser's Extensions menu.

For self-distribution signing, add these repository Actions secrets:
- `AMO_JWT_ISSUER`: API key from addons.mozilla.org
- `AMO_JWT_SECRET`: API secret from addons.mozilla.org

Then run **Actions → Build Firefox Android package → Run workflow**. With both secrets configured, the workflow asks Mozilla to sign the package as an unlisted add-on and uploads the signed XPI as an artifact. Without them, it only uploads an unsigned ZIP for testing; that ZIP cannot be installed as an Android add-on.

## Install in Firefox Desktop (temporary)
1. Download/clone this repository.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json`.
4. Open Instagram, visit your Following list, scroll to load accounts, then use **Collect visible accounts**.

Temporary add-ons are removed when Firefox restarts. Permanent distribution requires Mozilla signing.

## Configure AI
Open Settings from the popup and add your own Google Gemini API key. It is stored in Firefox extension local storage. Never commit the key.

## Privacy and boundaries
- Never asks for Instagram credentials, cookies, session tokens, or DMs.
- Reads only content already visible in your logged-in tab.
- AI analysis is opt-in per profile. Before the first analysis, Firefox asks permission to transmit website content (or an explicit confirmation is shown on older Firefox versions). Visible profile data is sent to Gemini only after consent and when you press Analyze.
- Does not infer gender, sex, age, ethnicity, religion, sexual orientation, health, or other sensitive traits from photos, names or indirect clues.
- No automated unfollowing, scraping of private data, or bypassing platform limits.

## Development and validation
- Dependency-free Firefox Manifest V2 WebExtension; no app build step is required.
- Run the GitHub Actions packaging workflow to lint and package the extension.
- Android behavior still needs a real-device smoke test across the supported Firefox Android versions. Instagram may change its DOM, so visible-page collection can need maintenance.
- AI output is fallible and must be checked by a human. Not affiliated with Instagram or Meta.

## License
MIT
