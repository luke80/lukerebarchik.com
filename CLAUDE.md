# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Luke Rebarchik's personal/professional site, live at https://lukerebarchik.com (custom domain on an Azure Static Web App): a single static page. There is no build step or test suite; npm is used only for ESLint.

- **Lint:** `npm ci` once, then `npm run lint` (`npm run lint:fix` for autofixes). `eslint.config.mjs` lints the HTML markup with `@html-eslint` and the inline `<script>` blocks with `eslint-plugin-html` + `@eslint/js` recommended. Whitespace/layout rules are deliberately off to allow the compact hand formatting.
- **Preview locally:** open `index.html` in a browser, or serve the folder (e.g. `python -m http.server`) so relative asset paths resolve the same way as in production.
- **Deploy:** pushing to `main` deploys automatically via Azure Static Web Apps (`.github/workflows/azure-static-web-apps-ashy-water-0c11e7310.yml`, `app_location: "/"`). A `lint` job must pass before the deploy job runs. `skip_app_build: true` must stay set, or Azure's Oryx builder will detect `package.json` and try to npm-build the site. PRs against `main` get preview environments that are torn down on close. An earlier Azure workflow (`wonderful-dune`) failed and was removed; the `ashy-water` one is the live one.
- **The whole repo root is uploaded to Azure,** so `staticwebapp.config.json` returns 404 for tooling files (`package*.json`, `eslint.config.mjs`, the config itself), all Markdown (`/*.md`, including `README.md` and `CLAUDE.md`), every dot-path (`/.*`, which covers `.claude/`, `.github/`, `.env*`), and the `.gitignore` patterns. When adding a tooling file or a `.gitignore` entry, add a matching route. SWA wildcards only work at the end of a route or as an extension set (`/*.{log,pid}`); a wildcard after a dot inside a filename (`/npm-debug.log*`) silently fails to match. The first route (`/` → `/index.html`) must stay first: without it, production Azure 404s the homepage (one of the 404 patterns matches `/` there), even though the local emulator serves it fine. **The emulator is not a faithful test of routing.** Use `npx @azure/static-web-apps-cli start .` for a quick check, but before merging any route change, curl `/`, `/index.html` and the blocked paths on the PR's Azure preview environment (URL is printed as "Visit your site at:" in the Build and Deploy Job log, `gh run view <run> --job <job> --log`). The app is `lukerebarchikcom-github` in Azure subscription `sub-lukerebarchik.com`; production hostname is `ashy-water-0c11e7310.3.azurestaticapps.net`. After deploy, confirm with `curl -s -o /dev/null -w '%{http_code}' https://lukerebarchik.com/<path>`. The deploy action itself already drops `.git/` and `.github/`, but other dotfiles (e.g. `.gitignore`) do get uploaded.

## Before pushing or opening a PR

Run `npm run lint`, then invoke the `code-reviewer` subagent (`.claude/agents/code-reviewer.md`) on the pending changes. Resolve its blocking findings before `git push` or `gh pr create`.

## Structure

Everything lives in `index.html`: all CSS is inline in a `<style>` block in `<head>`, and the only JavaScript is the Google Analytics (gtag `G-9QFZLHV9WK`) snippet. Fonts (Archivo, IBM Plex Sans, IBM Plex Mono) load from Google Fonts. Keep it as one self-contained file unless asked otherwise.

The files in `img/` (skylines, clouds, logo, profile photo, etc.) are leftovers from a previous version of the site and are **not referenced** by the current `index.html`.

## Design system conventions

The page is styled as a "systems drawing sheet" (see the comment at the top of the `<style>` block):

- **Color tokens** are CSS custom properties on `:root` (`--paper`, `--panel`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-ink`, `--signal`). Dark mode redefines the same tokens twice: under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and under `:root[data-theme="dark"]`. When changing or adding a color, update all three places. Use tokens (and `color-mix()` of tokens) rather than hard-coded colors.
- **Type tokens:** `--display` (Archivo, with `font-variation-settings:"wdth" …` to set width), `--body`, `--mono`. The `.mono` class is the small uppercase label style.
- **Layout:** content is constrained by `.wrap`. Standard content sections use `<section class="block" id="…">` with a two-column grid: a sticky left `.rail` of `.mono` labels and the main content column. Each section's `id` is the anchor used by the header nav.
- **Responsive:** each component's media query sits directly after its rules (breakpoints around 860/760/640/600px), collapsing grids to one column. CSS is written in a compact one-rule-per-line style; match it.

## Content

The page is effectively a résumé: hero, three recent-project panels, services, experience timeline, engagement modes, recommendations, toolkit, and contact (LinkedIn only, no email or form). Factual content (dates, titles, employers, figures like "$9.3M+" or "44M+") must stay consistent across the hero, recent-work panels, services prooflines, the experience timeline, and the `<meta name="description">`. When editing one, check the others.
