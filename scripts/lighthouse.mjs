// Lighthouse check (#18): performance, best practices and SEO for both pages, on mobile and desktop.
// Usage: node scripts/lighthouse.mjs [--base <url>] [--runs <n>] [--out <dir>]
//   npm run lighthouse                         check https://lukerebarchik.com (or $BASE_URL)
//   npm run lighthouse -- --base <preview url>
// Each page and form factor runs <n> times (default 3) and the median score per category is compared
// with THRESHOLDS (agreed in #18 from a baseline of the live site). Google Analytics is blocked
// entirely, so runs never send hits and the scores measure the page itself. Accessibility is not
// scored here; the axe-core suite (npm run test:a11y) owns it.
// Writes <out>/summary.md and one HTML and JSON report per run (default out: lighthouse-results/).
// Exits 0 if every median meets its threshold, 1 if any is below, 2 on a usage error, 3 if Lighthouse
// or this script broke.
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const PAGES = ["/", "/privacy.html"];
const THRESHOLDS = {
  mobile: { performance: 85, "best-practices": 100, seo: 100 },
  desktop: { performance: 95, "best-practices": 100, seo: 100 },
};
const BLOCKED = ["*googletagmanager.com*", "*google-analytics.com*"];

const args = process.argv.slice(2);
let base = process.env.BASE_URL || "https://lukerebarchik.com";
let runs = 3;
let out = "lighthouse-results";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--base" && /^https?:\/\//.test(args[i + 1] ?? "")) base = args[++i];
  else if (args[i] === "--runs" && /^[13579]$/.test(args[i + 1] ?? "")) runs = Number(args[++i]); // odd, so the median is a real run
  else if (args[i] === "--out" && args[i + 1]) out = args[++i];
  else {
    console.error("Usage: node scripts/lighthouse.mjs [--base <url>] [--runs <1|3|5|7|9>] [--out <dir>]");
    process.exit(2);
  }
}
base = base.replace(/\/+$/, "");

const cli = createRequire(import.meta.url).resolve("lighthouse/cli/index.js");
const run = promisify(execFile);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function main() {
  mkdirSync(out, { recursive: true });
  const env = { ...process.env, CHROME_PATH: chromium.executablePath() };
  const rows = []; // { page, form, category, scores, median, threshold, ok }
  for (const page of PAGES) {
    for (const form of Object.keys(THRESHOLDS)) {
      const scores = {};
      for (let n = 1; n <= runs; n++) {
        const name = `${page === "/" ? "home" : page.replace(/^\/|\.html$/g, "")}-${form}-${n}`;
        await run(process.execPath, [
          cli, base + page, "--quiet", "--output=json", "--output=html", `--output-path=${out}/${name}`,
          `--only-categories=${Object.keys(THRESHOLDS[form]).join(",")}`,
          ...(form === "desktop" ? ["--preset=desktop"] : []),
          ...BLOCKED.map((p) => `--blocked-url-patterns=${p}`),
          "--chrome-flags=--headless=new --no-sandbox",
        ], { env, maxBuffer: 1 << 26 });
        const report = JSON.parse(readFileSync(`${out}/${name}.report.json`, "utf8"));
        if (report.runtimeError) throw new Error(`${base}${page} (${form}): ${report.runtimeError.code} ${report.runtimeError.message}`);
        for (const [cat, v] of Object.entries(report.categories)) {
          // A category Lighthouse couldn't score is a broken run, not a low score.
          if (typeof v.score !== "number") throw new Error(`${base}${page} (${form}): no ${cat} score`);
          (scores[cat] ??= []).push(Math.round(v.score * 100));
        }
        console.error(`${page} ${form} run ${n}: ${Object.entries(scores).map(([c, s]) => `${c} ${s.at(-1)}`).join(", ")}`);
      }
      for (const [category, threshold] of Object.entries(THRESHOLDS[form])) {
        const m = median(scores[category]);
        rows.push({ page, form, category, scores: scores[category], median: m, threshold, ok: m >= threshold });
      }
    }
  }

  const failed = rows.filter((r) => !r.ok);
  const summary = `### Lighthouse: ${failed.length ? `${failed.length} below threshold` : "all scores meet their thresholds"}

${base}, median of ${runs} run${runs === 1 ? "" : "s"}, Lighthouse with Google Analytics blocked (#18).

| Page | Form | Category | Median | Runs | Threshold | |
| --- | --- | --- | --- | --- | --- | --- |
${rows.map((r) => `| \`${r.page}\` | ${r.form} | ${r.category} | **${r.median}** | ${r.scores.join(", ")} | ${r.threshold} | ${r.ok ? "pass" : "**FAIL**"} |`).join("\n")}

Reports for every run are in the run's \`lighthouse-results\` artifact. Reproduce locally with \`npm run lighthouse -- --base ${base}\`.
`;
  writeFileSync(`${out}/summary.md`, summary);
  console.log(summary);
  return failed.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`lighthouse.mjs broke (not a score failure): ${err.stderr ?? ""}${err.stack ?? err}`);
    process.exit(3);
  },
);
