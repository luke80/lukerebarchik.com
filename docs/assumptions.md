# Assumptions

What the project takes as true. Each has a reason and a trigger that means it should be revisited. Work items record their own task-level assumptions in their issue (see [planning.md](planning.md)); this file is for the project as a whole.

When an assumption changes, update it here, add an entry to [decisions.md](decisions.md) if it changes direction, and check the open work items it affects.

| # | Assumption | Why | Revisit when |
|---|---|---|---|
| A1 | The site serves consulting buyers and employers/recruiters equally. | Luke is open to both kinds of work. | One audience clearly matters more, or the content needs to split. |
| A2 | Success = LinkedIn conversations **and** credibility on look-up, weighted equally. | Most visitors already know his name; the site has to convince, then route them to LinkedIn. | Analytics or feedback show one goal is being missed. |
| A3 | LinkedIn is the only contact channel today. No email address or phone number is published. | Avoids spam and keeps personal data off the page. | The contact form (A4) is built. |
| A4 | A contact form is **likely later**. | Luke expects to want a direct channel. | When it's scheduled. It brings a backend: API logging to retained storage (Application Insights / Log Analytics), spam protection, alerting on lost submissions, and a privacy policy update. Plan it as its own Epic. |
| A5 | Until A4, the site is static: one self-contained `index.html`, no server, no API. | Cheapest, fastest and smallest attack surface. | Any feature needs server-side code. |
| A6 | Accessibility target is **WCAG 2.2 AA**. | Current W3C standard; the level ADA guidance and procurement reference. A consultant's own site should meet it. | W3C publishes a newer recommendation. |
| A7 | Google Analytics (gtag `G-9QFZLHV9WK`) stays, with a short privacy notice saying what's collected and for how long, and GA retention set to the minimum. | Needed to measure A2 without a backend. | The privacy notice ships, or analytics needs change. |
| A8 | Hosting is Azure Static Web Apps (Free tier) at lukerebarchik.com, plus a GitHub Pages mirror at luke80.github.io/lukerebarchik.com. | Free, and fits a static site; the mirror is kept on purpose. | Traffic, cost or a backend (A4) outgrows the Free tier. |
| A9 | One developer (Luke, working with Claude). No fixed cadence. | It's a personal site. | Someone else contributes. |
| A10 | Everything in the repo is public. | The GitHub repo is public. | Never; treat it as a rule. No secrets, no private notes. |
| A11 | Factual content (dates, titles, employers, figures) is the source of truth for Luke's career and must agree everywhere it appears on the page and in the meta description. | Inconsistent facts cost credibility (A2). | Content moves out of `index.html`. |

---
Drafted with Claude (Anthropic's Claude Code) from an interview with Luke Rebarchik on 2026-11-19.
