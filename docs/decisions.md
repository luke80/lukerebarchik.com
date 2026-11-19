# Decisions

Newest first. Each entry says what was decided, why, and what was rejected. Link the PR or issue where it happened.

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
