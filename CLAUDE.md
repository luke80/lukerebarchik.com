# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Luke Rebarchik's personal/professional site, live at https://lukerebarchik.com (custom domain on an Azure Static Web App): a single static page. There is no build step for the deployed site; npm is used for ESLint, the local dev server, the accessibility scan and the image script.

- **Lint:** `npm ci` once, then `npm run lint` (`npm run lint:fix` for autofixes). `eslint.config.mjs` lints the HTML markup with `@html-eslint` and the inline `<script>` blocks with `eslint-plugin-html` + `@eslint/js` recommended. Whitespace/layout rules are deliberately off to allow the compact hand formatting.
- **Preview locally:** `npm ci` once, then `npm run dev` and open http://localhost:4280. It runs the Azure Static Web Apps CLI (`swa start . --port 4280`, pinned to an exact version in `devDependencies`), which applies `staticwebapp.config.json`, so blocked paths return 404 locally too (but see the routing caveat below). Stop it with Ctrl+C.
- **Version fingerprint:** `index.html` carries `<meta name="build" content="lukerebarchik.com <hash> <commit> <date>">` in `<head>` and the same text as `<!-- build: … -->` before `</body>`. `<hash>` is 12 hex digits of SHA-256 over the page without those two lines (LF line endings), so it identifies the content. `npm run fingerprint` adds or updates it (commit `dev`, no date; run it after editing `index.html`, and it is idempotent). The deploy job runs the same script with `-- --commit <sha> --date <date>` before upload, then `-- --verify <url> --commit <sha>` against the deployed page (and https://lukerebarchik.com on `main`), so a deploy that did not go live fails. On PRs the commit is the merge commit GitHub builds, so it won't match the PR head SHA shown in the UI. The GitHub Pages mirror serves the committed `dev` stamp. Check any copy with `npm run fingerprint -- --verify <url>`, or `curl -s <url> | grep -o "<meta name=\"build\"[^>]*>"`. Code: `scripts/fingerprint.mjs`.
- **Accessibility scan:** `npm run test:a11y` runs `tests/a11y.spec.mjs` (`@playwright/test` 1.64.1 and `@axe-core/playwright` 4.14.0, exact-pinned) against WCAG 2.2 AA at desktop and phone widths in light and dark mode. It runs `npm run fingerprint` first (so commit the stamped `index.html`). Without `BASE_URL` it reuses whatever already answers on port 4280, or starts `npm run dev`; either way `tests/global-setup.mjs` runs the fingerprint check (`verify()` in `scripts/fingerprint.mjs`) against the target and stops with an explanation if it isn't serving this checkout (for example another checkout's `npm run dev`). CI uses the same `npm run test:a11y`, so the preview, production and weekly scans also fail if the target doesn't match the commit being tested; set `BASE_URL=https://lukerebarchik.com` (or a preview URL) to scan a deployed copy. First run needs `npx playwright install chromium`. In CI, the `Accessibility scan` job scans every PR preview and production (its azurestaticapps.net hostname) after each deploy (not a required check; if a newer push redeploys before an older run's scan starts, the older run fails with "serves a different version", which only means it was superseded), and `.github/workflows/a11y-weekly.yml` scans production every Monday and opens or comments on a "Weekly accessibility scan failed" issue when the scan step fails (not for install or network failures). GitHub disables scheduled workflows after 60 days without repo activity; re-enable it in the Actions tab if that happens. Automated rules catch only part of WCAG; the manual review (#19) covers the rest.
- **Deploy:** pushing to `main` deploys automatically via Azure Static Web Apps (`.github/workflows/azure-static-web-apps-ashy-water-0c11e7310.yml`, `app_location: "/"`). A `lint` job must pass before the deploy job runs. It always runs a secret scan of the history (`node .githooks/secure-git.mjs scan-history`). If every changed file is under `docs/` or ends in `.md` (docs-only), it skips `npm ci` and lint and the deploy job is skipped, so no preview environment is created. The `Lint` check still reports, and it is the required check on `main`. `skip_app_build: true` must stay set, or Azure's Oryx builder will detect `package.json` and try to npm-build the site. PRs against `main` get preview environments that are torn down on close. An earlier Azure workflow (`wonderful-dune`) failed and was removed; the `ashy-water` one is the live one.
- **Deploy token (not stored in GitHub):** the deploy and close jobs sign in to Azure with OIDC as the user-assigned managed identity `id-lukerebarchikcom-github-deploy` (resource group `lukerebarchikcom-github`), then fetch the token per run with `az staticwebapp secrets list` and mask it. The identity holds only the custom role `Static Web App Deploy Token Reader` (`Microsoft.Web/staticSites/listSecrets/action`), assigned on this one Static Web App. Its federated credentials trust `repo:luke80/lukerebarchik.com:ref:refs/heads/main` and `repo:luke80/lukerebarchik.com:pull_request` (PRs from forks get no OIDC token and can't deploy). The IDs are repository variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`), not secrets. To rotate the token, run `az staticwebapp secrets reset-api-key -n lukerebarchikcom-github -g lukerebarchikcom-github --subscription sub-lukerebarchik.com`; nothing in GitHub needs updating. In Git Bash, set `MSYS_NO_PATHCONV=1` before `az` commands that take a `/subscriptions/...` scope, or the path gets rewritten.
- **The whole repo root is uploaded to Azure,** so `staticwebapp.config.json` returns 404 for tooling files (`package*.json`, `eslint.config.mjs`, `playwright.config.mjs`, `swa-cli.config.json`, `_config.yml`, the config itself), the `scripts/`, `source-images/` and `shots/` folders, test files and output (`tests/`, `test-results/`, `playwright-report/`, `blob-report/`), all Markdown (`/*.md`, including `README.md` and `CLAUDE.md`), the project docs folder (`/docs*`, which also covers a bare `/docs`), every dot-path (`/.*`, which covers `.claude/`, `.github/`, `.env*`), and the `.gitignore` patterns. When adding a tooling file or a `.gitignore` entry, add a matching route. SWA wildcards only work at the end of a route or as an extension set (`/*.{log,pid}`); a wildcard after a dot inside a filename (`/npm-debug.log*`) silently fails to match. The first route (`/` → `/index.html`) must stay first: without it, production Azure 404s the homepage (one of the 404 patterns matches `/` there), even though the local emulator serves it fine. **The emulator is not a faithful test of routing.** Use `npm run dev` for a quick check, but before merging any route change, curl `/`, `/index.html` and the blocked paths on the PR's Azure preview environment (URL is printed as "Visit your site at:" in the Build and Deploy Job log, `gh run view <run> --job <job> --log`). The app is `lukerebarchikcom-github` in Azure subscription `sub-lukerebarchik.com`; production hostname is `ashy-water-0c11e7310.3.azurestaticapps.net`. After deploy, confirm with `curl -s -o /dev/null -w '%{http_code}' https://lukerebarchik.com/<path>`. The deploy action itself already drops `.git/` and `.github/`, but other dotfiles (e.g. `.gitignore`) do get uploaded.
- **GitHub Pages mirror:** Pages also publishes `main` (legacy Jekyll build) at https://luke80.github.io/lukerebarchik.com/ and ignores `staticwebapp.config.json`. `_config.yml` has a Jekyll `exclude` list that mirrors the Azure 404 routes. **Any route added to `staticwebapp.config.json` must also go in `_config.yml`**, and vice versa (`_config.yml` itself is 404'd on Azure). Pages only builds from `main`, so there is no preview: after merging, curl the excluded paths on the Pages URL.

## Before pushing or opening a PR

`main` is protected on GitHub: a PR is required, the `Lint` check must pass, and force-pushes and deletion are blocked. GitHub secret scanning and push protection are on. Locally, `.githooks/` (from `/secure-git`) refuses commits or pushes to `main` and anything that looks like a secret. Each new clone needs `/secure-git` once (or `git config core.hooksPath .githooks`) to wire it up. Work on a branch.

Run `npm run lint`, then invoke the `code-reviewer` subagent (`.claude/agents/code-reviewer.md`) on the pending changes. Resolve its blocking findings before `git push` or `gh pr create`.

## Structure

`index.html` holds the markup, the page's own CSS (two `<style>` blocks in `<head>`: the palette and type tokens, then a short "page CSS" block) and the Google Analytics (gtag `G-9QFZLHV9WK`) snippet. The design system is the `design-taste-frontend` skill's kit, copied as plain files into `assets/` (`system.css/js`, `ui/`, `motion/`, `layout/`, `icons/`, `diagrams/`, `moments/`). It's vendored: don't edit it, and ESLint ignores it. Fonts (Source Serif 4, Libre Franklin) load from Google Fonts. There's still no build step. The redesign's decisions and its before and after measurements are in `docs/redesign-2026-11.md`.

Images: originals go in `source-images/` (404 on the site). `npm run images` (`scripts/build-images.mjs`, sharp exact-pinned) writes AVIF and WebP versions to `img/web/`. `share.jpg` is the og:image (a still of the hero). The other files in `img/` (skylines, clouds, old logo, old photos) are leftovers from an earlier version of the site and are **not referenced**.

## Design system conventions

- **Colour tokens:** `--p-*` on `:root`, generated by the skill's `start.mjs brand` from Luke's palette:
  - `--p-bg` `#f7f8f3` (near-white)
  - `--p-ink` `#26292d` (charcoal)
  - `--p-surface` `#7fc0fa` (blue: cards and panels)
  - `--p-action` `#a8120b` (buttons and links)
  - `--p-muted` `#414953`

  The kit derives `--bg`, `--ink`, `--muted`, `--line` and `--action` from them. There's no dark mode: the skill keeps dark pages for tech products. Use tokens, never hard-coded colours. Body text needs 7:1 contrast and labels 4.5:1 (the skill's checker enforces both).
- **Type:** `--font-display` (Source Serif 4, weight 400) for headings, `--font-text` (Libre Franklin) for everything else. Sizes come from the kit's tokens (`--t-h1`, `--t-h2`, `--t-card`, `--t-stat`, `--t-label`...). Sentence case; no tracked capitals.
- **Layout:**
  - Every `main > section` is exactly one or two screens tall (`.g2` for two). The `--h` (tablet) and `--hm` (phone) overrides are set per section id in the page CSS.
  - Content sits on `.wrap` and the 12-column `.grid` (`span-*`, `start-*`). Splits are text left, visual right.
  - Inline `style` attributes are banned by ESLint, so section overrides go in the page CSS.
  - The footer (`footer.closing#contact`) holds the close and the links.
- **Motion:** the kit's `motion.js` handles hovers and the hero entrance. `moments/word-highlight` runs the "Since 1997" statement. The toolkit is a still `diagrams/` hub. Add no scripts of your own for these.
- **Checking a change:** `npm run lint`, then the skill's `<skill>/scripts/consistency.mjs` and `<skill>/assets/layout/check.mjs` (`<skill>` is the design-taste-frontend skill folder, not this repo) (commands in `docs/redesign-2026-11.md`).

## Content

The page is effectively a résumé:

- hero
- three recent programs (`#work`)
- a statement (`#record`)
- services with the toolkit diagram (`#services`, `#skills`)
- roles and earlier career (`#experience`)
- ways to hire, with recommendations (`#engage`, `#recommend`)
- the LinkedIn close (`#contact`): LinkedIn only, no email or form

Factual content (dates, titles, employers, figures like "$9.3M+" or "44M+") must stay consistent across the hero, the recent-work cards, the statement, the services, the roles list and the `<meta name="description">`. When editing one, check the others.

## Planning

Work is planned and tracked in this repo's GitHub Issues, not Azure DevOps. `docs/` holds the purpose, assumptions, decisions, planning conventions (hierarchy, labels, milestones, required fields, acceptance criteria) and the risk register; start at `docs/README.md`. Update the relevant doc in the same PR as the change that makes it out of date.
