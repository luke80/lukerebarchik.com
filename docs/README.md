# lukerebarchik.com project docs

Planning and reference docs for https://lukerebarchik.com. They are not published: `docs*` returns 404 on Azure Static Web Apps (`staticwebapp.config.json`) and is excluded from the GitHub Pages mirror (`_config.yml`). The repo itself is public, so nothing secret belongs here.

How to build, run and deploy the site is in [`../CLAUDE.md`](../CLAUDE.md). These docs cover why the site exists, the rules work is planned by, and what could go wrong.

| Doc | What it holds |
|---|---|
| [assumptions.md](assumptions.md) | What the project takes as true, with the reason for each. Revisit when work gets complicated. |
| [decisions.md](decisions.md) | Decisions made, with the reason and what was rejected. |
| [planning.md](planning.md) | How work is tracked on GitHub: hierarchy, labels, milestones, required fields, acceptance criteria. |
| [risks.md](risks.md) | The risk register: each `risk:*` label, its standard, mitigation, response plan and scheduled checks. |

## Purpose

The site is Luke Rebarchik's professional presence. It serves two audiences equally:

- **Consulting and contract buyers** deciding whether to start a conversation.
- **Employers and recruiters** checking his background.

It succeeds when it does both of these:

1. **Brings in conversations.** Measured by clicks on the LinkedIn links (Google Analytics) and contacts that mention the site.
2. **Earns credibility when someone looks him up.** Accuracy, polish, accessibility and speed are release requirements, not extras.

## Keeping these docs current

- Change a doc in the same PR as the work that makes it out of date.
- Work items link to these docs instead of repeating them (see [planning.md](planning.md)).
- A docs-only PR (only `docs/` and `*.md` files) runs just the secret scan in CI. It skips lint and deploy.

---
Drafted with Claude (Anthropic's Claude Code) from an interview with Luke Rebarchik on 2026-11-19.
