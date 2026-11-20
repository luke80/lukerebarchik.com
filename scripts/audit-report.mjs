// Turns `npm audit --json` output into the body of the weekly tracking issue (#15).
// Usage: node scripts/audit-report.mjs <audit.json> <body.md>
// Prints one line: the sorted advisory IDs at high or critical severity ("" when there are none),
// so the workflow can tell whether the findings changed since last week. Exits 2 if the file isn't
// a usable audit report (for example a registry or network error), so that never opens an issue.
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node scripts/audit-report.mjs <audit.json> <body.md>");
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(input, "utf8"));
} catch (err) {
  console.error(`Not a JSON audit report: ${err.message}`);
  process.exit(2);
}
if (report.error || !report.metadata?.vulnerabilities || !report.vulnerabilities) {
  console.error(`npm audit did not return a report: ${JSON.stringify(report.error ?? report).slice(0, 500)}`);
  process.exit(2);
}

const SERIOUS = new Set(["high", "critical"]);
const vulns = report.vulnerabilities;

// The direct dependencies (in package.json) that pull a package in, following `effects` upwards.
function directParents(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const v = vulns[name];
  if (!v) return [];
  const parents = v.isDirect ? [name] : [];
  for (const up of v.effects ?? []) parents.push(...directParents(up, seen));
  return [...new Set(parents)];
}

// One row per advisory (a package can have several), at high or critical only.
const advisories = new Map();
for (const [name, v] of Object.entries(vulns)) {
  for (const via of v.via) {
    if (typeof via !== "object" || !SERIOUS.has(via.severity)) continue;
    advisories.set(`${via.source}`, {
      id: `${via.source}`,
      pkg: name,
      range: via.range,
      severity: via.severity,
      title: via.title,
      url: via.url,
      from: directParents(name).join(", ") || name,
    });
  }
}

const rows = [...advisories.values()].sort(
  (a, b) => (a.severity === b.severity ? a.pkg.localeCompare(b.pkg) : a.severity === "critical" ? -1 : 1),
);
const ids = rows.map((r) => r.id).sort().join(",");
const counts = report.metadata.vulnerabilities;
const today = new Date().toISOString().slice(0, 10);
// Escape what would break a table cell or a link's text; titles come from GitHub's advisory database.
const cell = (s) => String(s ?? "").replace(/\r?\n/g, " ").replace(/[\\|[\]]/g, "\\$&");
const link = (u) => String(u ?? "").replace(/[()\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

const body = `<!-- advisories: ${ids} -->
The weekly \`npm audit\` (#15) found **${rows.length}** high or critical advisor${rows.length === 1 ? "y" : "ies"} in \`package-lock.json\` on ${today}.

All npm packages here are dev dependencies (lint, local preview, tests); none of them ship to the site. Triage each one as a Bug (\`docs/risks.md\`, \`risk:security\`): update the package, wait for an upstream fix, or record why it doesn't apply.

| Severity | Package | Affected | Comes from | Advisory |
| --- | --- | --- | --- | --- |
${rows.map((r) => `| ${r.severity} | \`${cell(r.pkg)}\` | \`${cell(r.range)}\` | \`${cell(r.from)}\` | [${cell(r.title)}](${link(r.url)}) |`).join("\n")}

Vulnerable packages by severity, all levels: ${["critical", "high", "moderate", "low", "info"].map((s) => `${counts[s] ?? 0} ${s}`).join(", ")}.

This issue is rewritten by every run; a comment is added only when the list of high or critical advisories changes. It is closed automatically when none are left. Reproduce locally with \`npm audit\`.
`;

writeFileSync(output, body);
console.log(ids);
