// Runs once before the scans: make sure the server under test is this checkout (#26).
// `npm run test:a11y` has already run `npm run fingerprint`, so index.html is stamped.
// Locally, Playwright reuses whatever answers on port 4280, which could be another
// checkout's `npm run dev` or an unrelated app. Scanning that would test the wrong page,
// so compare its fingerprint with this checkout and stop if they differ.
import { verify } from "../scripts/fingerprint.mjs";

export default async function globalSetup(config) {
  const baseURL = config.projects[0].use.baseURL;
  const deployed = Boolean(process.env.BASE_URL);
  // A fresh deploy can take a moment to reach every edge, so retry briefly in CI.
  const problem = await verify(baseURL, { attempts: process.env.CI ? 3 : 1 });
  if (!problem) return;
  const fix = deployed
    ? `BASE_URL points at a copy that doesn't match this checkout. Check out the commit that is deployed there, or point BASE_URL at the right copy.`
    : `Something other than this checkout is serving ${baseURL}. Stop it (Ctrl+C in the terminal running its npm run dev), then rerun npm run test:a11y. To scan a deployed copy instead, set BASE_URL.`;
  const err = new Error(`Not scanning: ${problem}\n${fix}`);
  err.stack = err.message; // the message says it all; skip the code frame
  throw err;
}
