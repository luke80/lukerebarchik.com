// Uptime and link check (#17) for the live site and the GitHub Pages mirror.
// Usage: node scripts/uptime.mjs [--body <file>] [--expect-ok <path>]...
//   npm run uptime            check both sites and print the results
//   --body <file>             also write a Markdown report for the tracking issue
//   --expect-ok <path>        add a path that must return 200 (used to test that failures alert)
// For each site: the pages return 200 with HTML that links to the expected LinkedIn profile, a
// sample of the blocked tooling paths return 404, and every link and asset on the pages works
// (#anchors exist on the page they point to, including links between pages; the site's own URLs
// return 200; other sites answer below 400). LinkedIn answers automated requests with 999, so its
// link is checked against the expected profile URL instead.
// Exits 0 if everything passed, 1 if any check failed, 2 on a usage error, 3 if the script itself
// broke (so a bug here is never reported as a site outage). On 0 and 1 the only line on stdout is
// the sorted list of failure keys, so the workflow can tell whether the failures changed.
import { writeFileSync } from "node:fs";

const SITES = ["https://lukerebarchik.com", "https://luke80.github.io/lukerebarchik.com"];
const PAGES = ["/", "/index.html", "/privacy.html"];
// A sample of the paths staticwebapp.config.json (Azure) and _config.yml (Pages) must keep private.
// Each one exists in the repo, so a 404 proves the route or exclude works.
const BLOCKED = [
  "/package.json", "/package-lock.json", "/CLAUDE.md", "/README.md", "/docs", "/docs/README.md", "/_config.yml",
  "/staticwebapp.config.json", "/eslint.config.mjs", "/scripts/fingerprint.mjs", "/tests/a11y.spec.mjs", "/.gitignore",
];
const LINKEDIN = "https://www.linkedin.com/in/lrebarchik/";
const UA = "Mozilla/5.0 (compatible; uptime-link-check)";

const args = process.argv.slice(2);
let bodyFile;
const expectOk = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--body" && args[i + 1]) bodyFile = args[++i];
  else if (args[i] === "--expect-ok" && /^\/[\w\-./~%]*$/.test(args[i + 1] ?? "")) expectOk.push(args[++i]);
  else {
    console.error("Usage: node scripts/uptime.mjs [--body <file>] [--expect-ok </path>]...  (paths: letters, digits, - . _ ~ % /)");
    process.exit(2);
  }
}

const results = []; // { key, ok, what, detail }
const record = (key, ok, what, detail) => results.push({ key, ok, what, detail });

// GET with redirects followed, one retry after 5 s for network errors and 5xx (a blip isn't an outage).
async function get(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA }, signal: AbortSignal.timeout(20_000) });
      const text = res.headers.get("content-type")?.includes("text/html") ? await res.text() : (await res.arrayBuffer(), "");
      if (res.status >= 500 && attempt < 2) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, text };
    } catch (err) {
      if (attempt >= 2) return { status: 0, text: "", error: err.cause?.code ?? err.message };
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
}
const show = (r) => (r.status ? `${r.status}` : `error ${r.error}`);
const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

async function main() {
  const idsByPage = new Map(); // page URL without hash -> ids on it
  const links = new Map(); // URL without hash -> pages that link to it
  const fragments = []; // { target, id, from } for same-site links with #fragment

  for (const site of SITES) {
    const host = new URL(site).host;
    for (const path of [...PAGES, ...expectOk]) {
      const pageUrl = site + path;
      const r = await get(pageUrl);
      record(`ok ${host}${path}`, r.status === 200, `${pageUrl} returns 200`, show(r));
      if (r.status !== 200 || !PAGES.includes(path)) continue;
      if (!r.text) {
        record(`html ${host}${path}`, false, `${pageUrl} is an HTML page`, "200 but not text/html, or empty");
        continue;
      }
      idsByPage.set(new URL(pageUrl).href, new Set([...r.text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
      const refs = [...new Set([...r.text.matchAll(/\s(?:href|src)="([^"]+)"|url\((?:'|")?([^'")]+)/g)].map((m) => m[1] ?? m[2]))];
      // A wrong page that still answers 200 (an Azure placeholder, a stale copy) fails here too.
      const hasLinkedIn = refs.includes(LINKEDIN);
      record(`linkedin ${host}${path}`, hasLinkedIn, `${pageUrl} links to ${LINKEDIN}`, hasLinkedIn ? "found" : "missing or changed");
      for (const ref of refs) {
        if (/^(mailto|tel|data|javascript):/.test(ref)) continue;
        let url;
        try {
          url = new URL(ref, pageUrl);
        } catch {
          record(`link ${host}${path} ${ref}`, false, `${pageUrl} has a valid link`, `can't parse "${ref}"`);
          continue;
        }
        const id = decode(url.hash.slice(1));
        url.hash = "";
        if (id && url.host === host) fragments.push({ target: url.href, id, from: pageUrl });
        if (url.href !== new URL(pageUrl).href) links.set(url.href, [...(links.get(url.href) ?? []), pageUrl]);
      }
    }
    for (const path of BLOCKED) {
      const r = await get(site + path);
      record(`blocked ${host}${path}`, r.status === 404, `${site}${path} returns 404`, show(r));
    }
  }

  // #fragments must exist on the page they point to: on the same page, or e.g. privacy.html's ./#work.
  for (const { target, id, from } of fragments) {
    const ids = idsByPage.get(target);
    const ok = ids?.has(id) ?? false;
    record(`anchor ${target}#${id}`, ok, `${target} has an element with id "${id}"`, `${ids ? (ok ? "found" : "missing") : "page not checked"}; linked from ${from}`);
  }

  for (const [url, from] of links) {
    const where = [...new Set(from)].join(", ");
    const isLinkedIn = new URL(url).host.endsWith("linkedin.com");
    if (isLinkedIn && url !== LINKEDIN) {
      record(`link ${url}`, false, `LinkedIn link is the expected profile (${LINKEDIN})`, `found ${url} on ${where}`);
      continue;
    }
    if (idsByPage.has(url)) continue; // one of the pages, already checked above
    const r = await get(url);
    const ok = isLinkedIn ? r.status === 200 || r.status === 999 : r.status > 0 && r.status < 400;
    record(`link ${url}`, ok, `${url} works${isLinkedIn ? " (LinkedIn: 999 accepted)" : ""}`, `${show(r)}; linked from ${where}`);
  }

  // Deduplicate (an anchor linked from several pages is one check).
  const seen = new Set();
  const unique = results.filter((r) => (seen.has(r.key) && r.ok ? false : (seen.add(r.key), true)));
  const failed = unique.filter((r) => !r.ok);
  const keys = [...new Set(failed.map((r) => r.key))].sort().join(",");
  console.log(keys);
  for (const r of unique) console.error(`${r.ok ? "ok  " : "FAIL"} ${r.what} (${r.detail})`);
  console.error(`\n${unique.length - failed.length} passed, ${failed.length} failed`);

  if (bodyFile) {
    const cell = (s) => String(s).replace(/\r?\n/g, " ").replace(/[\\|[\]]/g, "\\$&");
    writeFileSync(bodyFile, `<!-- failures: ${keys} -->
The daily uptime and link check (#17) found **${failed.length}** problem${failed.length === 1 ? "" : "s"} on ${new Date().toISOString().slice(0, 10)}.

| Check | Result |
| --- | --- |
${failed.map((r) => `| ${cell(r.what)} | ${cell(r.detail)} |`).join("\n")}

${unique.length - failed.length} other checks passed. If a page or a 404 route is wrong after a deploy, see \`docs/risks.md\` (\`risk:availability\`): revert the merge through a PR, then fix forward. Reproduce locally with \`npm run uptime\`.

This issue is rewritten by every failing run; a comment is added only when the set of failures changes. It is closed automatically when a run passes.
`);
  }
  return failed.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`uptime.mjs broke (not a site failure): ${err.stack ?? err}`);
    process.exit(3);
  },
);
