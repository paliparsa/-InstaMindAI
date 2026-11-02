# InstaMind AI — Design Notes

## Product
A compact browser-extension workspace for reviewing Instagram accounts already visible in the user's Following list. Primary tasks: collect, inspect, analyze, flag for manual review, and export.

## Visual direction
Keep the existing restrained dark interface and royal-blue action color. Avoid gradients, decorative dashboard cards, oversized hero treatments, and marketing copy. The extension should feel like a precise utility, not a social network.

## Tokens
- Background: #0b0c10
- Surface: #141720
- Border: #292e3a
- Primary text: #f3f5f8
- Muted text: #929bad
- Action blue: #6688ff
- Warning evidence: muted amber (#e9c58b)
- Positive state: soft green (#82d9b2)

## Interaction contract
- Open navigates only; Review opens the profile in a background tab and analyzes it.
- Bulk review is sequential, paced, visibly progressing, and stoppable after the current profile.
- AI transmission requires explicit user consent.
- The extension is read-only: it does not like, follow, message, or unfollow.
- Missing “Follows you” evidence is uncertain, not definitive proof of non-reciprocity.
- Content flags must cite explicit visible text evidence; never infer sensitive traits from images or names.
- Keep all data local except profile text the user explicitly consents to send to Gemini.

## Account manager workflow\n- The account library opens in a dedicated browser tab, separate from the compact popup.\n- JSON imports are parsed locally; support Instagram followers/following exports and InstaMind exports.\n- Merge by normalized username and preserve prior status, analysis, and relationship data.\n- Search and filters reset pagination; each page shows at most 25 accounts.\n- Account rows retain Open, Review, and Keep/Undo actions; bulk review uses the existing sequential review queue.\n\n## Accessibility
Use native buttons and form controls, visible focus, text labels for status, keyboard operation, and reduced-motion support. Preserve usable layout at narrow extension widths.
