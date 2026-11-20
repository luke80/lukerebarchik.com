# Risk register

Each risk has a `risk:*` label. Put the label on any work item that could cause or reduce that risk, and set the item's **Risk rating** on the Project board.

## Rating

| Rating | Meaning |
|---|---|
| High | Could take the site down, expose data or credentials, block visitors with disabilities, or publish wrong facts. Needs a preview check and a deliberate review before merge. |
| Medium | Noticeable harm that's quick to fix, e.g. a broken section or a missing alt text. |
| Low | Cosmetic or internal only. |

## Register

### `risk:security`

- **What could go wrong:** a leaked secret; a vulnerable dependency or third-party script; a misconfigured route serving files that shouldn't be public; a compromised deploy path.
- **Standards:** [OWASP Top 10](https://owasp.org/www-project-top-ten/), [CVE](https://www.cve.org/) for dependencies, [NIST CSF](https://www.nist.gov/cyberframework).
- **Mitigation in place:**
  - Secret scanning in three places: local hooks, GitHub push protection and CI.
  - `main` is protected and `Lint` is required.
  - CI fetches the deploy token per run via OIDC, using a least-privilege identity ([D5](decisions.md#d5-fetch-the-deploy-token-at-runtime-via-oidc-2026-11-19-pr-7)).
  - 404 routes on Azure plus Jekyll excludes on the Pages mirror.
  - The SWA CLI is exact-pinned; the other dev dependencies are locked by `package-lock.json`.
- **Scheduled checks (to build):**
  - `npm audit` on a schedule.
  - Dependabot security updates.
  - A periodic review against the OWASP Top 10, including third-party scripts (Google Analytics) and security headers.
- **If it happens:**
  - Rotate any exposed credential first (`az staticwebapp secrets reset-api-key …`, see `CLAUDE.md`).
  - Then remove it from the code, and decide with Luke before rewriting history.
  - Fix the route or dependency and verify on the preview.

### `risk:accessibility`

- **What could go wrong:** visitors using assistive tech, keyboard only, zoom or high contrast can't read or use the page.
- **Standards:** [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) (A6). Guidance from [W3C WAI](https://www.w3.org/WAI/), [WebAIM](https://webaim.org/) and [ADA.gov](https://www.ada.gov/resources/web-guidance/).
- **Mitigation in place:**
  - ESLint runs `@html-eslint` on the markup.
  - Light and dark themes are built from color tokens.
  - Automated WCAG 2.2 AA scan (axe-core via Playwright, `npm run test:a11y`, #16): the `Accessibility scan` CI job on every PR preview and on production after each deploy, plus `.github/workflows/a11y-weekly.yml` every Monday against https://lukerebarchik.com, which opens or updates a `risk:accessibility` Bug when it fails. Automated rules cover only part of WCAG.
- **Scheduled checks (to build):**
  - A periodic manual check: keyboard, screen reader, contrast, 200% zoom, reduced motion.
- **If it happens:** treat a WCAG A/AA failure as a Bug with a High or Medium rating, and fix it before new features in the same area.

### `risk:privacy`

- **What could go wrong:** visitor data is collected without saying so, kept too long, or (once the contact form exists) submitted personal data is mishandled.
- **Mitigation in place:**
  - No email, phone or form on the page (A3).
  - The repo is treated as public, so no personal data is kept in it (A10).
  - Fonts are self-hosted, so Google Analytics is the only third party the page contacts (#32).
  - Google Analytics doesn't load at all when the browser sends Global Privacy Control (#34), checked by `tests/gpc.spec.mjs`.
- **Planned:**
  - A privacy notice saying what Google Analytics collects and for how long, with GA retention set to the minimum (A7).
  - The contact form (A4) will need its own data-handling and retention plan.
  - Logs must never contain more personal data than the notice allows.
- **If it happens:** stop the collection, update the notice, and delete the data where possible.

### `risk:availability`

- **What could go wrong:** a deploy or routing change takes the homepage down or serves 404s. This has happened before: production 404'd `/` until the `/` route was put first.
- **Mitigation in place:**
  - Every PR gets an Azure preview environment.
  - CLAUDE.md requires curling `/`, `/index.html` and the blocked paths on the preview before merging route changes, and on production after deploy.
  - The Pages mirror is checked after `_config.yml` changes.
- **Scheduled checks (to build):** an uptime and link check against production.
- **If it happens:** revert the merge through a PR, then fix forward on a branch.

### `risk:accuracy`

- **What could go wrong:** dates, titles, employers or figures (e.g. "$9.3M+", "44M+") disagree between sections or with reality.
- **Mitigation in place:**
  - The consistency rule in `CLAUDE.md` and A11.
  - The code-reviewer agent checks content consistency.
- **If it happens:** fix every place the fact appears in one PR, including the meta description.

### `risk:reputation`

- **What could go wrong:** the site looks broken, dated, slow or careless. It's Luke's professional face (A2), so polish failures cost credibility even when nothing is technically wrong.
- **Mitigation in place:**
  - Design-system conventions (`CLAUDE.md`).
  - Preview review before merge.
- **Planned:** image rules in `CLAUDE.md` once the site uses images (web formats, responsive sizes, alt text, originals kept out of the deployed folder).
- **Scheduled checks (to build):** periodic Lighthouse performance and SEO checks, and a review at phone and desktop widths.
- **If it happens:** treat it as a Bug. Fix visible breakage before new work.

---
Drafted with Claude (Anthropic's Claude Code) from an interview with Luke Rebarchik on 2026-11-19.
