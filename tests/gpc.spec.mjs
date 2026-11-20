// Global Privacy Control (#34): with GPC on, Google Analytics must not load at all.
// Without it, gtag loads and sets its cookie as before. Every request to Google except
// loading gtag.js itself is aborted, so tests never send hits to the real property.
import { test, expect } from "@playwright/test";

const GOOGLE = /googletagmanager\.com|google-analytics\.com/;
const GOOGLE_HOST = /(^|\.)(google|googletagmanager|google-analytics|doubleclick)\.[a-z.]+$/;
const GTAG_JS = /googletagmanager\.com\/gtag\/js/;

async function visit(page, gpc, path) {
  if (gpc) {
    await page.addInitScript(() =>
      Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true, configurable: true }),
    );
  }
  await page.route(
    (url) => GOOGLE_HOST.test(url.hostname) && !GTAG_JS.test(url.href),
    (route) => route.abort(),
  );
  const google = [];
  page.on("request", (r) => { if (GOOGLE.test(r.url())) google.push(r.url()); });
  await page.goto(path, { waitUntil: "networkidle" });
  const cookies = (await page.context().cookies()).filter((c) => c.name.startsWith("_ga"));
  return { google, cookies };
}

for (const path of ["/", "/privacy.html"]) {
  test(`${path}: with Global Privacy Control on, Google Analytics never loads`, async ({ page }) => {
    const { google, cookies } = await visit(page, true, path);
    expect(google, "requests to Google with GPC on").toEqual([]);
    expect(cookies.map((c) => c.name), "_ga cookies with GPC on").toEqual([]);
  });

  test(`${path}: without Global Privacy Control, Google Analytics loads`, async ({ page }) => {
    const { google, cookies } = await visit(page, false, path);
    expect(google.some((u) => u.includes("googletagmanager.com/gtag/js")), "gtag.js requested").toBe(true);
    expect(cookies.map((c) => c.name), "_ga cookie set").toContain("_ga");
    // The privacy page promises the cookies expire 2 months after the latest visit (#20).
    for (const c of cookies) {
      const days = (c.expires * 1000 - Date.now()) / 86_400_000;
      expect(days, `${c.name} expiry in days`).toBeGreaterThan(59);
      expect(days, `${c.name} expiry in days`).toBeLessThan(61);
    }
  });
}
