# Planning on GitHub

Work for lukerebarchik.com is tracked in this repo's GitHub Issues ([D7](decisions.md#d7-plan-and-track-work-on-github-not-azure-devops-2026-11-19)). This page is the reference for how. Work items link here rather than repeating it.

> **Status (2026-11-19):** the labels exist (#11). The issue forms (#12) and Project board (#13) are being set up in the "Planning foundation" milestone; until they ship, those sections describe the target.

## Hierarchy

| Type | Label | Is | Ships in |
|---|---|---|---|
| Epic | `type:epic` | A goal that needs several Features, e.g. "Contact form". | Several releases. |
| Feature | `type:feature` | One user-visible or operational change. | **One release (one PR to `main`).** |
| Bug | `type:bug` | Something that doesn't work as documented. | One release. |
| Task | `type:task` | A step inside a Feature or Bug that's worth tracking on its own. | With its parent. |

- Nest them with GitHub **sub-issues**: Epic → Feature/Bug → Task.
- **One Feature or Bug per item.** If an item serves several needs, it's still one item; if it turns out to be two deliverables, split it.
- **When work grows,** don't bloat the item. Open a new one, link it, and pause the parent until the new one is scoped.

## Labels

Every item gets exactly one `type:*` and one `area:*` label, plus any `risk:*` labels that apply.

| Area | Covers |
|---|---|
| `area:site` | What visitors see: content, design and layout, accessibility, SEO, analytics and privacy notice. |
| `area:platform` | Hosting (Azure Static Web Apps, GitHub Pages mirror), CI/CD, routing, security settings, dependencies, scans. |
| `area:docs` | `docs/`, `CLAUDE.md`, README, planning setup. |

Risk labels (`risk:security`, `risk:accessibility`, `risk:privacy`, `risk:availability`, `risk:accuracy`, `risk:reputation`) are defined in [risks.md](risks.md), along with what to do when an item carries one.

GitHub's default labels are replaced by these, except `duplicate`, `invalid` and `wontfix`, which are kept for closing items.

## Milestones (releases)

Milestones are named for what ships, not for dates. For example: "Planning foundation", "Audits & scans", "Privacy notice".

- A milestone holds the Features and Bugs that make up one release theme.
- Every item in it is deployable on its own, since each is one PR to `main`.
- Close the milestone when everything in it is live.

## Project board

The GitHub Project for lukerebarchik.com adds fields that labels can't hold:

- **Status:** Todo, In progress, In review, Done.
- **Area:** mirrors the `area:*` label, for grouping.
- **Risk rating:** High, Medium or Low. How bad the item's worst `risk:*` outcome would be, using the scale in [risks.md](risks.md#rating).
- **Release:** the milestone.

## What every item must say

Issue forms (`.github/ISSUE_TEMPLATE/`) ask for these fields. Keep each one short, and link docs rather than copying them.

- **Delivers:** one sentence on what this ships and why.
- **Is / isn't:** the scope, and what's deliberately left out.
- **Assumptions:** task-level ones. Link project assumptions in [assumptions.md](assumptions.md) by number (A1…).
- **Decisions and motives:** choices already made and the reason for them.
- **Acceptance criteria:** see below.
- **Risks:** which `risk:*` labels apply and why, plus the rating.

When an item gets complicated or needs more information, re-read its assumptions and the project's. Ask "why?" until each one is explained.

## Acceptance criteria

Acceptance criteria name, at minimum, the **integration tests that must pass**. For this site, that means checks against a real deployment, usually the PR's Azure preview environment:

- **Browser checks:** the page renders and works at desktop and phone widths. Automated where the tooling exists.
- **Routing checks:** `curl` status codes for `/`, `/index.html` and any blocked paths, on the preview and after deploy. On the GitHub Pages mirror too, if `_config.yml` changed.
- **Accessibility:** no WCAG 2.2 AA violations from the automated scan, plus any manual checks the change needs (keyboard, screen reader, contrast).
- **Content:** facts stay consistent across hero, recent work, the statement, services, the roles list and meta description (A11).

Write criteria so someone else could run them and get a clear pass or fail.

## Branches, commits and PRs

- Branch from `main`: `feat/…`, `fix/…`, `docs/…`, `ci/…`, `chore/…`. `main` only changes through PRs.
- A PR delivers one item. Put `Closes #N` in the PR description so merging closes it.
- Before pushing, run `npm run lint` and the code-reviewer agent (see `CLAUDE.md`).

---
Drafted with Claude (Anthropic's Claude Code) from an interview with Luke Rebarchik on 2026-11-19.
