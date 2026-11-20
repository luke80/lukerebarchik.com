# Redesign, November 2026

Requested by Luke Rebarchik. Built by Claude (Claude Code) with the `design-taste-frontend` skill (tasteskill 2.5.1), on branch `feat/taste-redesign`.

## What this change is

A new look and section structure for the one-page site (`index.html`). The brief: the old page "looks AI generated, lacks personality and feels like a lawyer's site, not a technology expert with taste."

What it is not: no new pages, no new routes, no form (the site still has none), no change to the stack. It is still a static site on Azure Static Web Apps with no build step, plain HTML and hand-written CSS, and the same Google Analytics tag.

## Decisions

| Area | Decision | Why |
|---|---|---|
| Kind | Service (a person who is hired) | The skill's plan for firms, studios and consultants |
| Hero | Split: words left, portrait right, one float card with location, work mode and 25+ years | Dealt `film` first, but there is no film, so it was dealt again |
| Type | Source Serif 4 (headings) and Libre Franklin (text) | The first dealt pairing (Rethink Sans) failed the skill's hero stress test (4 lines at 1440) |
| Colour | Luke's palette: near-white `#F7F8F3` ground, charcoal `#26292D` text, blue `#7FC0FA` cards and panel, dark red `#A8120B` buttons and links | Luke supplied it. `#607080` is darkened to `#414953` for contrast. `#F0FA73`, `#FA2E23` and `#787A5B` are not used: the system allows one accent |
| Moment | `word-highlight` statement ("Since 1997"): the sentence turns from grey to ink as it scrolls past, "cannot switch off" in red | Dealt by `moments.mjs` |
| Toolkit | One still hub diagram: AWS, Azure, Docker, Git, CMS, CRM, Salesforce, Tableau, with the real logos | Luke asked to replace Drupal and WordPress with "CMS" and to add "CRM" |
| Photo | `source-images/Luke-2026-Portrait.png`, converted by `npm run images` to AVIF and WebP at 400, 700 and 1149 px | Luke asked for the current photo |
| Dark mode | Removed | The skill keeps dark pages for software and hardware sites. The old page had a dark theme |
| Nav, close, footer | Centred nav; close is one big LinkedIn button; footer has link columns. On a phone the nav becomes a menu sheet, and a LinkedIn bar is fixed at the bottom | Dealt (`nav-centre`, `close-type`). `footer-visit` was dealt but needs a street address, so it was dealt again |

The kit's CSS and JS are copied into `assets/` as plain files: only the parts the page uses, about 0.5 MB. ESLint ignores `assets/`.

## Routes and links (unchanged)

Every anchor the old page had still works: `#top`, `#services`, `#experience`, `#engage`, `#contact`, `#recommend`, `#skills`. New ones: `#work`, `#record`. LinkedIn links still point to `https://www.linkedin.com/in/lrebarchik/` with `target="_blank" rel="noopener"`.

Click-through on 2026-11-19 in the app's browser at 1440x900 and 375x812:

- All 20 links: every in-page link reaches its section, and the four LinkedIn links have the same URL and attributes as before.
- The phone menu opens, `aria-expanded` changes, a link inside it goes to its section and closes the menu, and Escape closes it.
- The phone action bar links to LinkedIn.
- No errors in the console.

## Before and after

Measured with the skill's own scripts and ESLint. Before: `.taste-skill/before/`. After: `.taste-skill/after/` (text reports are committed; screenshots and crops are gitignored).

| Measure | Before | After |
|---|---|---|
| ESLint (`npm run lint`) | 0 problems | 0 problems (two `use-baseline` hints suppressed inline with reasons) |
| copy-lint | 822 words, 0 FAIL, 1 WARN | 742 words, 0 FAIL, 1 WARN |
| consistency.mjs (1440, 1024, 820, 768, 390) | 190 FAIL, 72 WARN | 24 FAIL, 53 WARN (6 of these are waived, below) |
| layout check.mjs (5 sizes) | 269 findings (158 edge-left, 28 screen-short, 28 neighbour, 13 screen-height, 10 hero-fold) | 0 findings |
| perf.mjs | 0 FAIL, 4 WARN | 0 FAIL, 2 WARN |
| FCP / LCP at 1440 (relative, CPU) | 160 ms | 132 ms |
| Layout shift | 0.000 (0.028 at 390) | 0.000 (0.010 at 390) |
| Font families / bytes | 3 / 147 KiB | 2 / 148 KiB |
| CSS | 1.1 KiB | 64.8 KiB (the kit) |
| JS, gzipped | 179 KiB (Google Analytics) | 257 KiB (Analytics plus the kit) |
| Largest image | none | 13 KiB (AVIF portrait) |
| DOM nodes | 262 | 565 |

### Open items

- **No photographs of the work** (`no-visual` on `#work` and `#experience`, 11 of the 24 FAILs across widths). The checker wants a picture in every section. The fix is real photographs: Luke at work, a workshop, a screen he can show. Nothing is invented in their place.
- **Waivers** (`.taste-skill/waivers.json`):
  - `cta`: $9.3M+ is a program size, not a price.
  - `button-styles` and `same-action`: the larger close button is the kit's own `close-type` recipe.
  - `section-height` on `#experience` at 390: a measuring quirk. The rows end well inside the screen.
- **The gate:** three rounds were used. It ended `GATE: OPEN` with the `no-visual` FAILs plus one card-text contrast FAIL. That contrast FAIL was fixed afterwards and the full consistency check passes it. A later gate run printed `GATE: OFF` because its build had closed.
- **Smaller tablet and phone notes:**
  - Phones hide the role descriptions in Experience so it fits two screens.
  - Tablets show the roles in two columns.
  - `section-gaps` and `section-air` warnings remain at 1024, 820, 768 and 390.
- **Still to supply:** any photographs of the work, and a privacy page if Analytics needs one. The footer has no Privacy link because the site has no such page.

## Commands

```bash
npm ci
npm run images      # rebuild img/web/ from source-images/ (sharp 0.34.4, exact-pinned)
npm run lint
npm run dev         # http://localhost:4280
# skill checks (from the repo root; <skill> is the design-taste-frontend folder)
node <skill>/scripts/copy-lint.mjs index.html --kind service
node <skill>/scripts/consistency.mjs index.html --widths 1440,1024,820,768,390 --rhythm-widths 1440,820,768,390 --profile .taste-skill/chrome-check --page service --category "solutions architecture consulting" --primary "Message me on LinkedIn"
node <skill>/assets/layout/check.mjs --url index.html --profile .taste-skill/chrome-check --sizes 1440x900,1024x768,820x1180,768x1024,390x844
node <skill>/scripts/perf.mjs index.html --profile .taste-skill/chrome-check
```
