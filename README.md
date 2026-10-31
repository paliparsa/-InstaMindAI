# InstaMind AI

Firefox-first, local-first Instagram account review WebExtension.

## What it does
- Collects account links visible on your Instagram Following page. Scroll and collect repeatedly because Instagram lazy-loads the list.
- Saves records locally in Firefox; supports search, Keep/Review labels, and CSV/JSON export.
- Analyzes the currently open profile's visible bio, page text, image alt text and post metadata using your own Gemini API key.
- Keeps all account decisions manual. It never performs an unfollow.

## Privacy and boundaries
- Never asks for Instagram credentials, cookies, session tokens, or DMs.
- Reads only content already visible in your logged-in tab.
- AI analysis is opt-in per profile. The visible profile data is sent to Gemini only when you press Analyze.
- Does not infer gender, sex, age, ethnicity, religion, sexual orientation, health, or other sensitive traits from photos, names or indirect clues. Explicitly self-described pronouns may be reported as unverified text.
- No automated unfollowing, scraping of private data, or bypassing platform limits.

## Install in Firefox
1. Download/clone this repository.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json`.
4. Open Instagram, visit your Following list, scroll to load accounts, then use **Collect visible accounts**.
5. Open a profile and choose **Analyze current profile with AI**.

Temporary add-ons are removed when Firefox restarts. Permanent distribution requires Mozilla signing.

## Configure AI
Open Settings from the popup and add your own Google Gemini API key. It is stored in Firefox extension local storage. Never commit the key.

## Development
Dependency-free Firefox Manifest V2 WebExtension; no build step required. Instagram may change its DOM, so visible-page collection can need maintenance. AI output is fallible and must be checked by a human. Not affiliated with Instagram or Meta.

## License
MIT
