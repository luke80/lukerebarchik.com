# Decisions

Newest first. Each entry says what was decided, why, and what was rejected. Link the PR or issue where it happened.

## D14. Lighthouse thresholds and where it runs (2026-11-20, #18)

- **Decision:** `scripts/lighthouse.mjs` (`npm run lighthouse`, Lighthouse 13.6.0 exact-pinned, run with Playwright's Chromium) checks `/` and `/privacy.html` on mobile and desktop, three runs each, and compares the median score with these thresholds:

  | Form | Performance | Best practices | SEO |
  | --- | --- | --- | --- |
  | Mobile | 85 | 100 | 100 |
  | Desktop | 95 | 100 | 100 |

  It runs as the `Lighthouse` job after every PR preview and production deploy (reported, not a required check, like the Accessibility scan) and on Mondays against production in `a11y-weekly.yml`, which opens or comments on a "Weekly Lighthouse check failed" Bug when a score is below its threshold.
- **PR previews skip one SEO audit:** Azure serves PR preview environments with `X-Robots-Tag: none` (production doesn't), which fails Lighthouse's `is-crawlable` audit and drops SEO to 63. On pull requests the job passes `--preview`, which skips that audit and says so in the score table. Production runs (after each deploy and on Mondays) still check it.
- **Google Analytics is blocked entirely** in every run (`googletagmanager.com` and `google-analytics.com`), so runs never send hits and the scores measure the page itself, not GA's cost. The 6 baseline runs on 2026-11-20 did send page views before this was in place.
- **Why these numbers:** the baseline on 2026-11-20 (with GA loading) was mobile performance 93 to 96, desktop 100, and 100 for best practices and SEO everywhere; with GA blocked, all 100. Performance gets headroom because GitHub's runners are noisier than a desktop PC; best practices and SEO are deterministic checklists, so any drop is a real change. Accessibility isn't scored here because the axe-core suite owns it (#16).
- **Rejected:** Lighthouse CI (`@lhci/cli`): its newest release was 9 days old, and its upload targets aren't needed; the script uses Lighthouse's own CLI with fewer moving parts. Making the job a required check, because runner noise could block a merge. Letting GA load (a fake visit per run) or loading GA but blocking only its hits (Luke preferred to block it entirely).

## D13. Daily uptime and link check (2026-11-20, #17)

- **Decision:** `.github/workflows/uptime.yml` runs `scripts/uptime.mjs` daily and on demand against https://lukerebarchik.com and the GitHub Pages mirror. It checks that `/`, `/index.html` and `/privacy.html` return 200, that a sample of blocked tooling paths return 404, that in-page `#anchors` exist, and that every link and asset on the pages (fonts, the other page, external links) works. A failure marks the run failed and keeps one "Uptime or link check failed" issue current, the same way as the npm audit (D11): comment only when the set of failures changes, close on the next passing run.
- **LinkedIn:** it answers automated requests with status 999, or 429 when it rate-limits GitHub's shared runners (seen on the first runs after merge), so the profile link can't be verified. The check accepts 999 and 429 from linkedin.com and fails if either page's LinkedIn link differs from the expected profile URL (in `scripts/uptime.mjs`). That catches a typo or accidental edit, not a renamed or deleted profile.
- **Why:** the site is a résumé, and the homepage has 404'd in production before (see `risk:availability`). Daily is often enough to notice within a day and costs about a minute of Actions time.
- **Rejected:** a paid uptime service or alerting outside GitHub (out of scope in #17); hourly runs (noisier during an outage for little gain on a résumé site); a third-party link-checker action (Node built-ins are enough, so no new dependency to keep patched).

## D12. Accept the SWA CLI's dependency advisories until upstream fixes them (2026-11-20, #40)

- **Decision:** no code change for the high `npm audit` advisories in `adm-zip` and `tmp`, or the moderate and low ones in the same chain. All of them come from `@azure/static-web-apps-cli` 2.1.0. Keep the CLI exact-pinned and update it when a release clears them. #40 tracks this, and #38 (the weekly audit issue) stays open until then.
- **Why:** the CLI is dev-only. It runs the local preview and the tests, never ships to the site, and isn't used by the deploy ([D3](#d3-local-preview-with-the-pinned-swa-cli-2026-11-19-pr-5)). On 2026-11-20, 2.1.0 is the latest release and requires `adm-zip` `^0.5` (the fix is 0.6.1). The `tmp` fix (0.2.6) is blocked even further upstream, because the newest `devcert` (1.2.3) still requires `tmp` `^0.0.33`. In 2.1.0's shipped code, `adm-zip` is used only to unpack the optional Functions Core Tools and Data API Builder downloads (`dist/core/func-core-tools.js`, `dist/core/dataApiBuilder/dab.js`), which our usage doesn't trigger, and nothing imports `devcert` or `tmp` at all (`--ssl` uses `pem`). That comes from searching `dist/`, not a full trace of the CLI's code.
- **Rejected:** npm `overrides` forcing `adm-zip` 0.6.1 and `tmp` 0.2.6 or later, because the tests don't exercise the code that uses them, so a passing run wouldn't prove the CLI still works (and `tmp` 0.0.x to 0.2.x is a breaking jump). Replacing the SWA CLI with a plain static server, because that loses local `staticwebapp.config.json` emulation (D3).
- **Revisit when:** a new SWA CLI release appears (Dependabot or the weekly audit will show it), an advisory turns out to be reachable from untrusted input, or the CLI becomes part of the deploy.

## D11. Weekly npm audit and Dependabot security updates (2026-11-20, #15)

- **Decision:** Dependabot alerts and security updates are on (repo settings). `.github/workflows/npm-audit.yml` runs `npm audit` against `package-lock.json` every Monday and keeps one tracking issue, "npm audit: high or critical vulnerabilities", up to date: it rewrites the description each run, comments only when the set of advisories changes, and closes the issue when none are left. The run itself succeeds when findings exist; the issue is the signal.
- **Why:** every npm package here is a dev dependency, so findings are real but rarely urgent. On 2026-11-20 the six high advisories (five in adm-zip, one in tmp) all come from `@azure/static-web-apps-cli` 2.1.0, and npm's only suggested fix is a downgrade to 1.1.3, so they will stay open until Microsoft releases a fix. A weekly red run or a weekly comment would be noise for that whole time.
- **Rejected:** Dependabot version updates (`dependabot.yml`), which would add routine bump PRs outside #15's scope; failing on moderate findings; installing packages in the audit job (it only needs the lockfile).

## D10. Privacy: a separate notice page, 2-month cookie, and Global Privacy Control (2026-11-20, #20, #34)

- **Decision:** the privacy notice is its own page (`/privacy.html`), written formally in the third person, linked from both footers. GA's event and user data retention are 2 months, the `_ga` cookies expire 2 months after the latest visit (`cookie_expires`), Google signals is off, and GA doesn't load at all when the browser sends Global Privacy Control.
- **Why:** be open about analytics rather than add a consent banner (A7). Matching the cookie to the retention lets the notice say "two months" without a caveat. GPC lets visitors opt out without visiting a settings page.
- **Rejected:** a section on the home page (adds weight to the résumé), a cookie banner (decided against on 2026-11-19), and disclosing the default 2-year cookie.
- **Facts:** the notice's claims about Google Analytics were checked against Google's help pages on 2026-11-20. Google's current page says raw IP addresses are collected for location, then discarded after use; an older line saying GA4 doesn't log or store IP addresses was not used.

## D9. Self-host the web fonts (2026-11-20, #32)

- **Decision:** serve Archivo, IBM Plex Sans and IBM Plex Mono from lukerebarchik.com (Latin subsets from exact-pinned Fontsource packages) instead of Google Fonts.
- **Why:** Google's font servers receive every visitor's IP address. Removing the request is better than disclosing it, and it leaves Google Analytics as the only third party for the privacy notice (#20) to cover.
- **Rejected:** mentioning Google Fonts in the privacy notice (keeps the third-party request), and Google's download ZIPs (not pinned or repeatable).

## D8. Redesign: option D ("Signal") (2026-11-20, PR #29, part of #21)

- **Decision:** the redesign ships as option D, "Signal": one self-contained `index.html` (inline CSS, Archivo and IBM Plex), white and charcoal with red as the single accent, light and dark themes with a saved toggle, and no photos.
- **Why:** Luke compared the options from the redesign session and chose D.
- **Rejected:** the design-taste-frontend kit version (vendored `assets/` kit, Source Serif 4 and Libre Franklin, light only, portrait photo with a `sharp` image pipeline). It's in PR #29's first commit for reference.
- **Deferred:** a portrait photo and the image pipeline. If D gets a photo later, that's a new issue.

## D7. Plan and track work on GitHub, not Azure DevOps (2026-11-19)

- **Decision:** use GitHub Issues, sub-issues, labels, milestones, issue forms and a GitHub Project for this project's planning, alongside the code.
- **Why:** the code, CI, deploys and the Pages mirror already live on GitHub. One place for code and work items is simpler for a solo personal site.
- **Exception:** Luke's default is Azure DevOps Boards and an ADO Git repo. This project is a deliberate exception.
- **Rejected:** a new ADO project (separate tool to keep in sync), an area in an existing company ADO project (mixes personal and company work), moving the repo to ADO (would mean rebuilding CI and dropping the Pages mirror).

## D6. Keep the GitHub Pages mirror, but exclude non-site files (2026-11-19, PR #8)

- **Decision:** keep luke80.github.io/lukerebarchik.com. `_config.yml` mirrors every Azure 404 route as a Jekyll `exclude`.
- **Why:** Pages served `CLAUDE.md`, `README.md` and tooling files, and would have served `docs/`.
- **Rejected:** turning Pages off; leaving it as is.
- **Consequence:** routes must be added in both `staticwebapp.config.json` and `_config.yml`.

## D5. Fetch the deploy token at runtime via OIDC (2026-11-19, PR #7)

- **Decision:** CI signs in to Azure as managed identity `id-lukerebarchikcom-github-deploy` and fetches the Static Web Apps token per run. No deploy credential is stored in GitHub. The old token was deleted and reset.
- **Why:** credentials the pipeline can fetch itself shouldn't be stored.
- **Least privilege:** a custom role with only `Microsoft.Web/staticSites/listSecrets/action`, on this one app.
- **Rejected:** built-in Contributor on the app (could also change or delete it).

## D4. Block `docs*` from being served (2026-11-19, PR #6)

The whole repo root is deployed, and these docs are internal.

## D3. Local preview with the pinned SWA CLI (2026-11-19, PR #5)

- **Decision:** `npm run dev` runs `@azure/static-web-apps-cli` 2.1.0 on port 4280.
- **Why:** it applies `staticwebapp.config.json`, unlike a plain file server.
- **Caveat:** the emulator isn't a faithful routing test. Check route changes on the PR's Azure preview.

## D2. Docs-only changes skip lint and deploy (2026-11-19, PR #4)

The required `Lint` check still runs a secret scan, so docs PRs stay fast but still pass through the required check.

## D1. Protect `main` and scan for secrets (2026-11-19, PRs #3, #4)

- **What's enforced:** PRs are required, the `Lint` check must pass, and force-pushes and deletion are blocked, including for admins.
- **Secret scanning:** local hooks (`.githooks/`), GitHub secret scanning and push protection, and a history scan in CI.

---
Drafted with Claude (Anthropic's Claude Code) from an interview with Luke Rebarchik on 2026-11-19.
