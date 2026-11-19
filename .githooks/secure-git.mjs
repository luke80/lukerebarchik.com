// Security checks for git hooks, installed by the /secure-git skill. No dependencies: it needs only Node and git.
//   node secure-git.mjs pre-commit          refuse commits on a protected branch, secrets and sensitive files
//   node secure-git.mjs commit-msg <file>   refuse secrets in the commit message
//   node secure-git.mjs pre-push            refuse pushes to a protected branch, and rescan what's being pushed
//   node secure-git.mjs scan-history        report anything in the repo's whole history
// It never prints a value. If git fails, the check fails rather than passing unchecked.
//
// When a check is wrong:
//   a line flagged wrongly     end it with a comment holding secret-scan:allow
//   a real need to use main    SECURE_GIT_ALLOW_MAIN=1 git commit ...   (or git push)
// A secret that reached a commit has to be rotated as well as removed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Formats that are secret wherever they appear. Publishable Stripe keys are public, so they aren't listed. */
const RULES = [
  ["Stripe secret key", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/g],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{8,}/g],
  ["Anthropic key", /\bsk-ant-[\w-]{20,}/g],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}/g],
  ["SendGrid key", /\bSG\.[\w-]{16,}\.[\w-]{16,}/g],
  ["Azure storage key", /AccountKey=[A-Za-z0-9+/=]{40,}/g],
  ["Azure SAS signature", /\bsig=[%A-Za-z0-9+/=]{20,}/g],
  ["Entra client secret", /(?<![\w~.-])[\w~.-]{3}[78]Q~[\w~.-]{31,}/g],
  ["Azure DevOps token", /\b(?:[a-z2-7]{52}|[A-Za-z0-9]{76}AZDO[A-Za-z0-9]{4})\b/g],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_\w{30,})/g],
  ["AWS key", /\bAKIA[A-Z0-9]{16}\b/g],
  ["Google API key", /\bAIza[\w-]{30,}/g],
  ["Slack token", /\bxox[abprs]-[\w-]{10,}/g],
  ["Twilio credential", /\b(?:AC|SK)[a-f0-9]{32}\b/g],
  ["npm token", /\bnpm_[A-Za-z0-9]{30,}|_authToken=[^\s$]{8,}/g],
  ["JSON web token", /\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g],
  ["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["Password in a URL", /\b(?:https?|ftp|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s/:@'"]+:[^\s/@'"]{6,}@/g],
];
/** A secret-looking name given a value, like SESSION_SECRET=… . Not checked in tests and example files. */
const NAMED =
  /([\w.-]*(?:secret|password|passwd|pwd|api[_-]?key|apikey|token|credential|accountkey|admin[_-]?key)[\w.-]*)["'`]?\s*[:=]\s*["'`]?([^\s"'`,;)]{20,})/gi;
const NO_NAMED_CHECK = /(^|\/)(test|tests|__tests__|spec|e2e|fixtures)\/|\.(test|spec)\.|\.example|\.sample|\.lock$|-lock\.\w+$/;
const FAKE = /replace|example|placeholder|dummy|fake|sample|change-?me|your[_-]|xxx|topsecret|not[_-]?a[_-]?real/i;
/** A pipeline or template macro, standing in for a value. */
const MACRO = /\$\(|\$\{|\{\{/;
/** Code rather than a value given a secret's name: variables, calls and macros. */
const CODE = /\$\(|\$\{|\{\{|=>|\(\)|^(process|env|config|deps|opts|params?|parameters|args?|req|res|this|await|new|secrets|vars)\b|^[A-Za-z_]+[.[(!]/;
/** Never committed, whatever they hold. */
const BLOCKED_FILE =
  /(^|\/)(\.env(\.(?!example$|sample$|template$)[^/]+)?|local\.settings\.json|id_(rsa|dsa|ecdsa|ed25519)|\.netrc|\.git-credentials|\.npmrc\.local|credentials\.json|[^/]*service-account[^/]*\.json|[^/]*-adminsdk-[^/]*\.json|\.aws\/credentials|[^/]+\.(pem|pfx|p12|ppk|key|keystore|jks|publishsettings|kdbx|tfstate(\.backup)?))$/;
const BLOCKED_FILE_OK = /(^|\/)(test|tests|fixtures|testdata)\/|\.pub$/;

const entropy = (s) => {
  const counts = {};
  for (const c of s) counts[c] = (counts[c] ?? 0) + 1;
  return Object.values(counts).reduce((e, n) => e - (n / s.length) * Math.log2(n / s.length), 0);
};
const randomLooking = (v) => !CODE.test(v) && /\d/.test(v) && /[A-Za-z]/.test(v) && entropy(v) >= 3.8;

export const isBlockedFile = (path) => BLOCKED_FILE.test(path) && !BLOCKED_FILE_OK.test(path);

/** What's wrong with one added line: { rule, length }, never the value. */
export function findInLine(line, path) {
  if (line.includes("secret-scan:allow")) return [];
  const found = [];
  for (const [rule, pattern] of RULES) {
    for (const [value] of line.matchAll(pattern)) {
      if (!FAKE.test(value) && !MACRO.test(value)) found.push({ rule, length: value.length });
    }
  }
  if (!found.length && !NO_NAMED_CHECK.test(path)) {
    for (const [, name, value] of line.matchAll(NAMED)) {
      if (!FAKE.test(value) && randomLooking(value)) found.push({ rule: `A value for ${name}`, length: value.length });
    }
  }
  return found;
}

/** A package-lock.json line that downloads over plain HTTP, or from outside the npm registry. */
export function checkLockLine(line) {
  const url = /"resolved":\s*"([a-z+]+:\/\/[^"]+)"/.exec(line)?.[1];
  if (!url) return null;
  if (url.startsWith("http://")) return { rule: "A package downloaded over plain HTTP", length: 0 };
  if (!url.startsWith("https://registry.npmjs.org/")) {
    return { rule: `A package from outside the npm registry (${new URL(url).host})`, length: 0, warn: true };
  }
  return null;
}

/** Findings in a `git diff -U0` or `git log -p -U0`: { path, line, rule, length, warn? }. */
export function findInDiff(diff) {
  const found = [];
  let path = "";
  let line = 0;
  for (const text of diff.split(/\r?\n/)) {
    if (text.startsWith("+++ ")) {
      path = text.slice(4).replace(/^"?b\//, "").replace(/"$/, "");
      if (isBlockedFile(path)) found.push({ path, line: 0, rule: "A file that should never be committed", length: 0 });
    } else if (text.startsWith("@@ ")) {
      line = Number(/\+(\d+)/.exec(text)?.[1] ?? 0);
    } else if (text.startsWith("+")) {
      const added = text.slice(1);
      for (const f of findInLine(added, path)) found.push({ path, line, ...f });
      if (/(^|\/)package-lock\.json$/.test(path)) {
        const lock = checkLockLine(added);
        if (lock) found.push({ path, line, ...lock });
      }
      line++;
    }
  }
  return found;
}

export const findInMessage = (message) =>
  message
    .split(/\r?\n/)
    .filter((l) => !l.startsWith("#"))
    .flatMap((l) => findInLine(l, "(commit message)").map((f) => ({ path: "(commit message)", line: 0, ...f })));

const git = (...args) =>
  execFileSync("git", ["-c", "core.quotePath=false", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 2 ** 30,
  });
const tryGit = (...args) => {
  try {
    return git(...args).trim();
  } catch {
    return "";
  }
};
const DIFF = ["-U0", "--no-color", "--no-ext-diff", "--no-renames", "--diff-filter=ACMR"];

/** main, master, the remote's default branch, and any set with `git config secure-git.protected <name>`. */
function protectedBranches() {
  const names = new Set(["main", "master"]);
  const head = tryGit("symbolic-ref", "--short", "-q", "refs/remotes/origin/HEAD").replace(/^origin\//, "");
  if (head) names.add(head);
  for (const n of tryGit("config", "--get-all", "secure-git.protected").split(/\s+/)) if (n) names.add(n);
  return names;
}
const allowMain = () => process.env.SECURE_GIT_ALLOW_MAIN === "1";

function report(found, heading = "Possible secrets in this change (values not shown):") {
  const blocking = found.filter((f) => !f.warn);
  for (const { path, line, rule } of found.filter((f) => f.warn)) console.error(`Warning: ${path}${line ? `:${line}` : ""}  ${rule}`);
  if (!blocking.length) return false;
  console.error(heading);
  for (const { path, line, rule, length, commit } of blocking) {
    console.error(`  ${path}${line ? `:${line}` : ""}  ${rule}${length ? `, ${length} characters` : ""}${commit ? `  (${commit})` : ""}`);
  }
  console.error(
    "\nRemove it, and read it from a setting instead. If it was ever committed or shared, rotate it too.\n" +
      "If this is wrong, end that line with a comment holding secret-scan:allow.",
  );
  return true;
}

function refuseOnBranch(what, branch) {
  console.error(
    `Refused: ${what} ${branch}, which only takes changes through pull requests.\n` +
      "Use a branch: git switch -c my-change\n" +
      "If this really has to go straight there, set SECURE_GIT_ALLOW_MAIN=1 for that one command.",
  );
  process.exit(1);
}

function preCommit() {
  const branch = tryGit("symbolic-ref", "--short", "-q", "HEAD");
  // A repo's first commit, or one with no remote, has no pull requests to go through.
  const hasHistory = tryGit("rev-parse", "-q", "--verify", "HEAD") !== "";
  const hasRemote = tryGit("remote") !== "";
  if (hasHistory && hasRemote && !allowMain() && protectedBranches().has(branch)) refuseOnBranch("committing directly to", branch);
  if (report(findInDiff(git("diff", ...DIFF, "--cached")))) process.exit(1);
}

function commitMsg(file) {
  // Everything from git's scissors line down is a diff shown for reference (git commit --verbose).
  const message = readFileSync(file, "utf8").split(/^# -+ >8 -+$/m)[0];
  if (report(findInMessage(message), "Possible secrets in the commit message (values not shown):")) process.exit(1);
}

const ZERO = /^0+$/;

function prePush(remote) {
  const input = readFileSync(0, "utf8");
  const found = [];
  const branches = protectedBranches();
  for (const entry of input.split(/\r?\n/).filter(Boolean)) {
    const [, localSha, remoteRef, remoteSha] = entry.split(" ");
    const branch = remoteRef.replace(/^refs\/heads\//, "");
    if (remoteRef.startsWith("refs/heads/") && branches.has(branch) && !allowMain()) {
      if (ZERO.test(localSha)) refuseOnBranch("deleting", branch);
      // Creating it on an empty remote is how a new repo starts; updating it isn't.
      if (!ZERO.test(remoteSha)) refuseOnBranch("pushing directly to", branch);
    }
    if (ZERO.test(localSha)) continue;
    const range = ZERO.test(remoteSha) ? [localSha, "--not", `--remotes=${remote}`] : [`${remoteSha}..${localSha}`];
    found.push(...findInDiff(git("log", "-m", "-p", ...DIFF, "--format=", ...range)));
    found.push(...findInMessage(git("log", "--format=%B", ...range)));
  }
  if (report(found, "Possible secrets in the commits being pushed (values not shown):")) {
    console.error("\nThese are already in commits, so amend or rewrite them before pushing.");
    process.exit(1);
  }
}

function scanHistory() {
  const found = [
    ...findInDiff(git("log", "--all", "-m", "-p", ...DIFF, "--format=")),
    ...findInMessage(git("log", "--all", "--format=%B")),
  ];
  const unique = [...new Map(found.map((f) => [`${f.path}|${f.rule}`, f])).values()];
  const commits = tryGit("rev-list", "--all", "--count");
  if (report(unique, `Possible secrets in this repo's history (${commits} commits, values not shown):`)) {
    console.error("\nDon't rewrite history without deciding to. Rotate anything real first.");
    process.exit(1);
  }
  console.log(`No secrets found in ${commits} commits.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [mode, arg] = process.argv.slice(2);
  try {
    if (mode === "pre-commit") preCommit();
    else if (mode === "commit-msg") commitMsg(arg);
    else if (mode === "pre-push") prePush(arg || "origin");
    else if (mode === "scan-history") scanHistory();
    else {
      console.error(`Unknown mode: ${mode}`);
      process.exit(2);
    }
  } catch (err) {
    console.error(`secure-git couldn't finish its check, so it's stopping here: ${err.message}`);
    process.exit(1);
  }
}
