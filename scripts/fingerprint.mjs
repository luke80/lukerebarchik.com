// Version fingerprint for lukerebarchik.com (#26). No dependencies: Node only.
//
// index.html carries the same fingerprint in two places, invisible to visitors:
//   <meta name="build" content="lukerebarchik.com <hash> <commit> <date>">   in <head>
//   <!-- build: lukerebarchik.com <hash> <commit> <date> -->                  before </body>
// <hash> is the first 12 hex digits of SHA-256 over index.html with the fingerprint
// lines removed and line endings normalized, so it identifies the page content and
// restamping unchanged content changes nothing. Locally <commit> is "dev" and there is
// no date; CI stamps the real commit and date at deploy.
//
//   npm run fingerprint                                   stamp index.html (local: "dev")
//   npm run fingerprint -- --commit <sha> --date <date>   stamp for a deploy (CI)
//   npm run fingerprint -- --verify <url> [--commit <sha>]
//       fetch <url>; pass only if its fingerprint is this site's and its hash matches
//       this checkout's index.html (and the commit, if given). Retries briefly, since a
//       fresh deploy can take a moment to appear.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SITE = "lukerebarchik.com";
export const INDEX = fileURLToPath(new URL("../index.html", import.meta.url));

const META_RE = /^[ \t]*<meta name="build" content="[^"]*">\r?\n/m;
const COMMENT_RE = /^[ \t]*<!-- build: [^>]*-->\r?\n/m;

/** SHA-256 (12 hex) of the page without its fingerprint, with LF line endings. */
export function contentHash(html) {
  const bare = html.replace(META_RE, "").replace(COMMENT_RE, "").replace(/\r\n/g, "\n");
  return createHash("sha256").update(bare).digest("hex").slice(0, 12);
}

/** Parse the fingerprint from a page. Returns null when either copy is missing or they differ. */
export function readFingerprint(html) {
  const meta = html.match(/<meta name="build" content="([^"]*)">/)?.[1];
  const comment = html.match(/<!-- build: ([^>]*?) -->/)?.[1];
  if (!meta || meta !== comment) return null;
  const [site, hash, commit = "", date = ""] = meta.split(" ");
  return { site, hash, commit, date, text: meta };
}

/** Return html with the fingerprint added or updated. */
export function stamp(html, { commit = "dev", date = "" } = {}) {
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  const text = [SITE, contentHash(html), commit, date].filter(Boolean).join(" ");
  let out = html.replace(META_RE, "").replace(COMMENT_RE, "");
  out = out.replace(/^([ \t]*)<\/head>/m, `<meta name="build" content="${text}">${eol}$1</head>`);
  out = out.replace(/^([ \t]*)<\/body>/m, `<!-- build: ${text} -->${eol}$1</body>`);
  return out;
}

/** Fetch url and compare its fingerprint with this checkout. Returns an error message or "". */
export async function verify(url, { commit, attempts = 1, delayMs = 5000 } = {}) {
  const local = contentHash(readFileSync(INDEX, "utf8"));
  let problem = "";
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) });
      const html = await res.text();
      const fp = readFingerprint(html);
      // Hash what was actually served, not just what its stamp claims.
      const served = contentHash(html);
      if (!res.ok) problem = `${url} returned HTTP ${res.status}.`;
      else if (!fp || fp.site !== SITE) problem = `${url} has no ${SITE} fingerprint: it is another app, or a copy of the site that was never stamped (npm run fingerprint).`;
      else if (served !== local) problem = `${url} serves a different version of ${SITE} (its content hash is ${served}, this checkout's is ${local}; its fingerprint says "${fp.text}").`;
      else if (fp.hash !== served) problem = `${url} has a stale fingerprint ("${fp.text}") for its content (${served}). Run npm run fingerprint.`;
      else if (commit && !commit.startsWith(fp.commit) && !fp.commit.startsWith(commit)) problem = `${url} serves commit ${fp.commit}, expected ${commit}.`;
      else return "";
    } catch (err) {
      problem = `Could not fetch ${url}: ${err.cause?.code || err.message}.`;
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return problem;
}

/** Value after --name; "" if the flag is present without a value; undefined if absent. */
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = process.argv[i + 1];
  return value === undefined || value.startsWith("--") ? "" : value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let url = arg("verify");
  if (url === "") {
    // e.g. an empty deploy output: never fall through to stamping and report success.
    console.error("--verify needs a URL.");
    process.exit(1);
  }
  if (url && !/^https?:\/\//.test(url)) url = `https://${url}`;
  if (url) {
    const problem = await verify(url, { commit: arg("commit"), attempts: Number(arg("attempts") || 1) });
    if (problem) {
      console.error(problem);
      process.exit(1);
    }
    console.log(`${url} matches this checkout (${readFingerprint(readFileSync(INDEX, "utf8"))?.text ?? contentHash(readFileSync(INDEX, "utf8"))}).`);
  } else {
    const before = readFileSync(INDEX, "utf8");
    const after = stamp(before, { commit: arg("commit"), date: arg("date") });
    if (after !== before) writeFileSync(INDEX, after);
    console.log(`${after === before ? "Unchanged" : "Stamped"}: ${readFingerprint(after).text}`);
  }
}
