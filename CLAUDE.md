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
One narrow centered column, generous whitespace, one typeface system, one small visual, one quiet interaction. It must look like Joey's site, not theirs.

## Locked design tokens (do not change)

| Token | Value |
|---|---|
| Background | cream `#f3ecdc` |
| Text | navy `#1b2547` |
| Muted text | `#5d6479` |
| Hairline rules | `#ddd3bf` |
| Accent (only one) | Tesla red `#e31937`, used ONLY on the chat send arrow. Nowhere else: not links, not hover, not focus, not the car. |

- Type: Geist for body, Geist Mono for small labels. No other fonts.
- Layout: one centered column, 560-640px wide (currently 600px), 35-50px gaps between blocks (currently 44px).
- No cards, no boxes, no gradients, no shadows. No dark mode (the background is always cream).

## Structure (single page, top to bottom)

1. A small CAN differential-pair waveform strip (thin navy lines on cream, like a scope trace). Not a full-screen image. It is a real CAN 2.0A frame: ID 0x7E0, DLC 4, data "JOEY", CRC-15, bit-stuffed, ACKed.
   Directly under it, in the same block (14px gap, so the 44px column gaps are unchanged), one static halftone divider: an inline SVG dot pattern, navy at 30% opacity, 4px staggered screen, dot size peaking in the middle rows, 16px tall. Print texture only, never a second hero visual, never animated.
2. "Joey" at a normal size, then one line: "Firmware, real-time systems and hardware accelerators."
3. Links row: GitHub, LinkedIn, X (brand icons, navy).
4. The chat, flattened: a plain underlined text field, an arrow send button, a tiny grey note underneath. No glass, no bubbles, no shadow, no suggestion chips.
5. Work and Experience as plain rows with hairline rules: name + short tag only. 8px rhythm: 16px label line + 8px, 40px rows, tags never wrap (Interfaces cheat sheet: groups get at least 2x the space between items).
   The first Work row (Bare-metal RTOS) holds one static CSS 3D-tilt frame (240px, 16:10, hairline border, no shadow, no motion) for a single screenshot. It currently shows `img/rtos-shot-placeholder.svg`; the replace steps are in an HTML comment above it. Add class `flat` if the image is already a 3D device render.
6. Footer: "© 2026 Joey" on the left, a "Draw a circuit" link to `circuit.html` on the right (mono, muted).

## The F1 car (the one unique twist)

- Small single-color line-art open-wheel F1 silhouette, navy `#1b2547`, about 56px wide, inline SVG.
- Drives on a thin 1px track line fixed at the very bottom edge of the viewport.
- A pass starts every ~10s (first pass 4s after load). A lane pass crosses left to right in ~2.5s, ease-in-out, then the car disappears until the next pass.
- Every third pass (the 2nd, 5th, 8th...) is a loop-the-loop: the car runs the lane, does one vertical loop centered on the screen (wheels on the inside of the loop, so it is upside down at the top), drops back to the lane and exits right. Uses CSS `offset-path`; browsers without it only get lane passes.
- Lane passes never overlap content (the lane is opaque cream, and the page has bottom padding so the footer clears it). The loop crosses content on purpose, at Joey's request. That is the only exception.
- No sound, no trail.
- Driven by `site.js` (Web Animations API), not CSS keyframes. Fully disabled under `prefers-reduced-motion` (lane and car hidden). Paused when the tab is hidden, including mid-pass.

## Circuit page (`circuit.html`)

- Same tokens, fonts and column header as the home page: "← Joey" back link, "Circuit", one line, a mono readout.
- The whole viewport is the drawing surface. Draw a closed loop; on release it is trimmed where the start and end meet, smoothed, and drawn as a race track (two 1px navy edges, 18px wide, start/finish tick).
- A top-down line-art F1 car laps the track. Speed comes from a small lap sim (grip-limited corner speed, then acceleration and braking passes), so it slows in corners. Readout: track length and lap time.
- "Clear" resets. Drawing again replaces the track. Under reduced motion the car parks on the start line and the readout still shows.
- Still no red on this page.

## Motion rules

The only motion on the site:

1. The CAN waveform draws once on load, then stays still.
2. The F1 car passes above (lane passes plus the occasional loop).
3. The car lapping a drawn track on the circuit page.

Everything else is static. No GSAP, no Lenis, no scroll reveals, no parallax, no magnetic hover, no blinking/live dots, no typing or loading animations, no hover transitions. All of it is off under `prefers-reduced-motion: reduce`.

## Files

- `index.html`: markup, including the inline CAN trace and car SVGs.
- `styles.css`: all styling for both pages, and the trace sweep.
- `site.js`: social icons, scripted chat + optional AI endpoint (`CHAT_ENDPOINT`), the car pass scheduler (lane, loop, tab pause).
- `circuit.html` + `circuit.js`: the draw-a-circuit page and its lap sim.
- `img/rtos-shot-placeholder.svg`: placeholder for the Bare-metal RTOS screenshot.
- `chat-worker/`: Cloudflare Worker backend for the chat (see its README).
