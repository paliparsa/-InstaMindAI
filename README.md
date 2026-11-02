# InstaMind AI

Firefox WebExtension for reviewing Instagram accounts you follow. The same codebase now includes a mobile-friendly interface and a packaging path for **Firefox on Android**.

## Features
- Collects account links visible on your Instagram Following page. Scroll and collect repeatedly because Instagram lazy-loads the list.
- Stores records locally; supports search, Keep/Review labels, per-account review, sequential bulk review, and CSV/JSON export.
- **Review** beside an account opens its profile in a background tab and analyzes it; **Open** remains a separate navigation-only action.
- **Review all collected accounts** processes saved accounts one by one with a delay, progress display, and stop control.
- Gemini reviews visible bio/page text and metadata for content themes and explicit text-based content signals. It never judges a person's gender or appearance.
- Keeps account decisions manual. It never likes, follows, messages, or unfollows anyone.

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
- AI analysis is opt-in. Before a review run, you must explicitly agree to send visible profile text and metadata to Gemini; Firefox may also show its website-content permission prompt. The review queue reads profiles sequentially and waits between accounts.
- Does not infer gender, sex, age, ethnicity, religion, sexual orientation, health, or other sensitive traits from photos, names or indirect clues. Pronouns are shown only when explicitly self-described in profile text.
- Follow-back status uses Instagram's visible “Follows you” label when present. If the label is absent, the extension reports “not detected”; this is not conclusive proof that the account does not follow you.
- Potentially sexualized-content flags require explicit evidence in visible profile text/captions. Image appearance, clothing, poses, swimwear, fashion, fitness, and beauty content are not used as evidence.
- No automated unfollowing, scraping of private data, or bypassing platform limits.

## Development and validation
- Dependency-free Firefox Manifest V2 WebExtension; no app build step is required.
- Run the GitHub Actions packaging workflow to lint and package the extension.
- Android behavior still needs a real-device smoke test across the supported Firefox Android versions. Instagram may change its DOM, so visible-page collection can need maintenance.
- AI output is fallible and must be checked by a human. Bulk review only processes accounts already collected from the visible Following list; scroll and collect repeatedly to include more accounts. Instagram may rate-limit or change its page layout. Not affiliated with Instagram or Meta.

## License
MIT

## Google Chrome (Manifest V3)

A separate Chrome package is built from the shared extension interface and scripts, using the dedicated `chrome/manifest.json` Manifest V3 configuration. The Firefox Manifest V2 manifest remains unchanged.

1. Open **Actions → Build Chrome package → latest successful run → Artifacts**.
2. Download the `instamind-ai-chrome` artifact and extract the downloaded GitHub artifact ZIP.
3. Inside it, use `instamind-ai-chrome.zip` in Chrome's **chrome://extensions** page with **Developer mode → Load unpacked** (extract the extension ZIP first, then select the extracted folder). For Chrome Web Store submission, upload `instamind-ai-chrome.zip` directly in the Developer Dashboard.
4. To load locally, select the extracted folder that contains `manifest.json` directly at its root.

The Chrome workflow validates that the package is Manifest V3 and that `manifest.json` is at the ZIP root. It is separate from the Firefox/Android package workflow.
