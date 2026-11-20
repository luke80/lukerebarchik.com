// WCAG 2.2 AA scan with axe-core (assumption A6, docs/risks.md#riskaccessibility).
// Automated rules catch only part of WCAG; the manual review (#19) covers the rest.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PAGES = ["/", "/privacy.html"];

for (const path of PAGES) {
  test(`no WCAG 2.2 AA violations on ${path}`, async ({ page }, testInfo) => {
    const response = await page.goto(path, { waitUntil: "load" });
    expect(response?.status(), `${path} should load`).toBe(200);

    const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    await testInfo.attach("axe-results.json", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });

    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.helpUrl}\n  ` +
        v.nodes.slice(0, 5).map((n) => n.target.join(" ")).join("\n  ") +
        (v.nodes.length > 5 ? `\n  …and ${v.nodes.length - 5} more` : ""),
    );
    expect(results.violations, `WCAG 2.2 AA violations on ${path}:\n${summary.join("\n")}`).toEqual([]);
  });
}
