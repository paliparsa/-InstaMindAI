# InstaMind AI — Design Notes

## Product
A compact browser-extension workspace for reviewing Instagram accounts already visible in the user's Following list. Primary tasks: collect, inspect, analyze, flag for manual review, and export.

## Visual direction
A restrained monochrome utility: pure black canvas, crisp white typography and controls, thin charcoal separators, and almost no ornament. The interface should feel closer to a carefully typeset desktop instrument than a colorful social dashboard. The signature is the hard black/white contrast and compact editorial typography. Avoid gradients, colored accents, decorative cards, and marketing-style hero treatments.

## Colors and runtime mapping
- Background: #000000 (--bg)
- Panel: #050505 (--panel)
- Raised panel: #0d0d0d (--panel-raised)
- Border: #282828 (--line)
- Primary text: #ffffff (--text)
- Secondary text: rgba(255,255,255,.66) (--muted)
- Primary button: #ffffff background with #000000 text
- Secondary button: #000000 background with #ffffff text
- Focus: #ffffff

Runtime tokens are defined in popup.css under :root and consumed by the popup, account manager, review queue, and settings page. Page-specific styles may adjust layout, but not introduce new accent colors.

## Typography
Use a Yekan-inspired system fallback stack for English text: "Yekan Bakh", "IRANYekan", "Vazirmatn", "Segoe UI", Tahoma, sans-serif. No remote font loading. Use compact, clear headings, modest letter spacing, and tabular numerals for counts.

## Layout
- Desktop browser-action popup: fixed 420 × 600 CSS pixels, matching Chrome and Firefox desktop popup constraints.
- Popup content scrolls vertically inside the fixed viewport; never use a mobile-width media query to resize the desktop popup.
- Settings, account manager, and review queue open in full browser tabs and use responsive document layouts.
- Keep the popup focused on collect, review, quick status, and navigation. Longer account and review workflows remain in tabs.

## Shapes and components
Use restrained 7–9px corner radii, 1px charcoal borders, flat black surfaces, and no shadows. Primary actions are white-filled with black text; secondary actions are black with white borders and white text. Use native semantic controls and visible white focus rings.

## Interaction contract
- Open navigates only; Review opens the profile in a background tab and analyzes it.
- Bulk review is sequential, paced, visibly progressing, pausable after the current profile, and resumable from a locally persisted next-account checkpoint.
- AI transmission requires explicit user consent.
- Account actions remain user-controlled: review results provide Open profile and Mark as unfollowed. The latter only records the user's completed manual action locally; the extension never automates likes, follows, messages, or unfollows.
- Following snapshots are refreshed by importing Instagram's official following.json export. Missing entries are labelled as absent from the latest export, not asserted to be confirmed unfollows. No Instagram session cookies or credentials are read.
- Missing “Follows you” evidence is uncertain, not definitive proof of non-reciprocity.
- Content flags must cite explicit visible text evidence; never infer sensitive traits from images or names.
- Keep all data local except profile text the user explicitly consents to send to Gemini.

## Account manager workflow
- The account library opens in a dedicated browser tab, separate from the compact popup.
- JSON imports are parsed locally; support Instagram followers/following exports and InstaMind exports. An explicit snapshot option treats following.json as the current Following list and removes stale Following labels.
- Merge by normalized username and preserve prior status, analysis, and relationship data.
- Search and filters reset pagination; each page shows at most 25 accounts.
- Account rows retain Open, Review, and Keep/Undo actions; bulk review uses the existing sequential review queue.

## Model settings workflow
- Text and image analysis have separate, locally stored ordered model lists and separate API keys.
- Model rows support direct ID editing, add, remove, pointer drag-and-drop, and keyboard/touch move-up/move-down controls.
- The priority order is top-to-bottom. Rate-limited Gemini models enter a 60-second cooldown and the next available model is attempted automatically.
- The settings page displays the actual model selected for each completed profile review and any fallback path.
- Per-model token totals are accumulated from Gemini response usageMetadata for successful requests made by this extension. The UI must not imply this is the full API-key usage or a remaining-quota balance.

## Accessibility
Use native buttons and form controls, visible focus, text labels for status, keyboard operation, and reduced-motion support. Preserve a stable 420 × 600 desktop popup and responsive full-tab layouts.


## Relationship status system (0.8.2)
- Canonical states across Popup, Account Manager, and Review: `following`, `unfollowed`, `pending_verification`.
- Semantic colors: Following = green, Unfollowed = red, Pending verification = amber. Always display the text label as well as color.
- Open extension pages subscribe to `browser.storage.onChanged` and refresh from the shared local `accounts` records.
- Prune an account only after an explicit Instagram unavailable/not-found message. Private accounts, login walls, transient failures, and ambiguous empty pages must never be treated as deleted.
