# CLAUDE.md

Joey's personal site. Static HTML/CSS/JS on GitHub Pages (https://joeysuh.github.io/jaltersuh/).
The goal is restraint, not more features. Read every rule below before touching anything.

## Process rules

- Edit only. Do not restyle anything that wasn't asked for, do not add features, do not change the palette or fonts, do not invent new sections.
- Never push to `main` without Joey's approval. Work on a branch, show a screenshot or preview first, wait for a yes.
- Commits are authored as Joey: `Joeysuh <Joeysuh@users.noreply.github.com>`.
- No em dashes in any copy.

## Discipline

Borrowed from kmurakami.com and shreejal.space as *discipline only*, never their look. Do not copy either site.
One narrow centered column, generous whitespace, one typeface system, one visual (the Horizon band), one quiet interaction. It must look like Joey's site, not theirs.

## Design tokens

Base values. On the home page they are re-tinted from the current painting (see Adaptive theme); the circuit page always uses these exactly.

| Token | Base value |
|---|---|
| `--bg` paper | cream `#f3ecdc` |
| `--fg` ink | navy `#1b2547` |
| `--muted` | `#5d6479` |
| `--rule` hairlines | `#ddd3bf` |
| `--sage`, `--gold` | `#9aa27c`, `#c8a45e` (washes and tints only, never text) |
| Accent (only one) | Tesla red `#e31937`, used ONLY on the chat send arrow. It never re-tints. Nowhere else: not links, not hover, not focus, not the car, not the dots. |

- Type: Geist for body, Geist Mono for small labels, and one contrasting serif accent: Newsreader (variable), for the "Joey" nameplate only (loaded subset to those four letters). No other fonts.
- Layout: one centered column, 560-640px wide (currently 600px), 35-50px gaps between blocks (currently 44px).
- No cards, no boxes, no shadows. Gradients exist only in three places: the band's dissolve mask, its sage/gold wash, and the soft page tint (see Horizon band). Nowhere else.
- Tactile grain: a barely-there SVG noise layer over the home page (multiply at 7%, soft-light at 10% in dark mode) so it reads as printed paper. If it ever looks dirty, remove it rather than strengthening it.
- Dark mode exists on the home page only, as a dusk version of each painting's palette. The circuit page stays cream.

## Structure (home page, top to bottom)

1. The Horizon band (the site's single visual). The old CAN-trace strip is retired; do not bring it back.
2. "Joey" at a normal size, then one line: "Firmware, real-time systems and hardware accelerators."
3. Links row: GitHub, LinkedIn, X (brand icons, ink).
4. The chat, flattened: a plain underlined text field, an arrow send button, a tiny grey note underneath. No glass, no bubbles, no shadow, no suggestion chips. The field is 44px tall with 16/24 type (calibrated against the Notion DESIGN.md from VoltAgent/awesome-design-md; tokens are still this site's own).
5. Work and Experience as plain rows with hairline rules: name + short tag only. 16/24 type on a 4px grid, 8px under each label. Density varies on purpose: Work rows are tighter (8px padding, 41px rows), Experience rows airier (14px padding, 53px rows).
   Index-style previews: each row carries one short detail (reused word for word from the chat's answers, not new copy). On screens 1240px and wider with a mouse, hovering or keyboard-focusing a row shows it beside the column under a short hairline; everywhere else a click or tap opens it under the row, one at a time, and Escape closes it. The rows themselves never change on hover.
6. Palette: six swatches (Paper, Ink, Muted, Rule, Sage, Gold) with mono hex values that show the current painting's colours live.
7. Footer: "© 2026 Joey" on the left, a "Draw a circuit" link to `circuit.html` on the right (mono, muted).

## Horizon band (`horizon.js`)

- A full-width pastoral painting across the top (`clamp(320px, 62vh, 640px)` tall). It rotates to a new painting every 5s with a 1.6s crossfade.
- Order: the first painting on each load is random; the rest run in shuffled order with no repeats until the pool is used up, then reshuffle. Up to 8 paintings per visit.
- Small dots under the band (in a hairline pill) jump to a painting and reseed the queue. Nothing on the page announces the random pull.
- Live pull: one request per load to the Art Institute of Chicago API (`is_public_domain` only), then filtered client-side: paintings tagged as landscapes with rural subjects (fields, rivers, countryside, cattle...), wide (1.25 to 2.4), calm dominant colour (saturation 62 or less, lightness 28 to 88), dated 1700 to 1925, and nothing stormy, nocturnal, wintry, urban, at sea or a portrait.
- Fallbacks, used when the API fails, is slow (over 2.5s) or returns fewer than 4 fits: Constable "The Hay Wain", Constable "Stoke-by-Nayland" (in place of the Abby Matthews piece, which isn't public domain), Corot "River with a Distant Tower", Corot "The Vire at Saint-Lô". All public domain, hosted on Wikimedia Commons (a different host from the live pull). They can be bundled into `img/` later.
- Every painting shows its credit under the picture, near the bottom of the band: title (linked to its museum page), date, artist.
- The painting never ends in a hard line: a mask dissolves it down the viewport, a faint sage/gold wash carries a little further, and a soft tint continues down the page behind Work and Experience before settling into flat paper.
- Rotation pauses while the pointer or focus is on the credit or dots, while the tab is hidden, and entirely under `prefers-reduced-motion` (one random painting, dots still work).

## Adaptive theme

- Each painting is sampled on a small canvas: lightest tone becomes paper, darkest becomes ink, then muted, rule, and sage/gold accents. Ink is pushed to at least 12:1 and muted to at least 5:1 against paper (WCAG AA), in both light and dusk.
- The theme re-tints everything through the CSS variables (paper, text, hairlines, chat, the dots pill, the car, the palette swatches) and crossfades over 1.4s (registered `@property` colours).
- Dark mode (`prefers-color-scheme: dark`) uses the dusk version of the same palette.
- If an image can't be sampled (no CORS), it uses that painting's preset palette.

## The F1 car

- Small single-colour line-art open-wheel F1 silhouette, about 56px wide, inline SVG, drawn in the theme's ink (wheel centres in paper).
- It laps the whole screen every 30s: along the bottom, up the right wall, across the top upside down, down the left wall, turning smoothly through rounded corners, wheels always on the outside edge. Linear speed, no sound, no trail.
- Driven by `site.js` (Web Animations API with `offset-path`). Off under `prefers-reduced-motion`; paused when the tab is hidden. Browsers without `offset-path` get no car.
- Stays flat SVG line art. A 3D test (img2threejs idea, done code-only as a faint offset far-side outline) made it read muddy at 56px and was dropped. No Three.js.

## Circuit page (`circuit.html`)

- Base tokens, fonts and column header as the home page: "← Joey" back link, "Circuit", one line, a mono readout. No re-tinting, no dark mode.
- The whole viewport is the drawing surface. Draw a closed loop; on release it is trimmed where the start and end meet, smoothed, and drawn as a race track (two 1px navy edges, 18px wide, start/finish tick).
- A top-down line-art F1 car laps the track. Speed comes from a small lap sim (grip-limited corner speed, then acceleration and braking passes), so it slows in corners. Readout: track length and lap time.
- "Clear" resets. Drawing again replaces the track. Under reduced motion the car parks on the start line and the readout still shows.
- Still no red on this page.

## Motion rules

The only motion on the site:

1. The Horizon painting crossfade (1.6s, every 5s) and the theme crossfade that goes with it (1.4s).
2. The F1 car lapping the screen edge.
3. The car lapping a drawn track on the circuit page.
4. Kinetic type, pure CSS scroll timelines: the nameplate's weight eases from 560 to 400 over the first 70vh of scroll, and each section label's weight goes from 300 to 500 as it enters. A whisper, never more.
5. Line reveals, pure CSS view timelines: labels, row names and tags, palette items and the footer rise and unclip once as they enter (over roughly the first 12% of their trip up the screen; the footer finishes as soon as it is fully in view).

Everything else is static. No GSAP, no Lenis, no JS-driven scroll effects, no parallax, no magnetic hover, no blinking/live dots, no typing or loading animations, no hover transitions. 4 and 5 only run where `animation-timeline` is supported; all of it is off under `prefers-reduced-motion: reduce`, and nothing is ever left hidden.

## Files

- `index.html`: markup, including the Horizon band, the palette section and the car SVG.
- `styles.css`: all styling for both pages, the registered theme colours, the band's mask/wash/tint, and the crossfades.
- `horizon.js`: the band: live AIC pull, fallbacks, queue, crossfade, credit, dots, palette sampling and theme.
- `site.js`: social icons, scripted chat + optional AI endpoint (`CHAT_ENDPOINT`), the perimeter car lap, row preview tap/click toggling.
- `circuit.html` + `circuit.js`: the draw-a-circuit page and its lap sim.
- `chat-worker/`: Cloudflare Worker backend for the chat (see its README).
