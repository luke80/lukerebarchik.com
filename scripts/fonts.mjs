// Copies the self-hosted web fonts from the exact-pinned Fontsource devDependencies into
// fonts/ (#32). Run after changing a font package version:  npm run fonts
// File names carry the package version, so fonts/ can be cached as immutable: a new
// version gets new URLs. Update the @font-face src URLs in index.html to match the output.
//
// Only the Latin subset of what index.html uses:
//   Archivo (variable: weight 100-900, width 62-125%; the page narrows headings with "wdth")
//   IBM Plex Sans 400, 500, 600 and IBM Plex Mono 500
// All three are SIL Open Font License 1.1; each licence is copied next to the fonts.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "fonts");
const pkgDir = (name) => join(root, "node_modules", name);
const version = (name) => JSON.parse(readFileSync(join(pkgDir(name), "package.json"), "utf8")).version;

const FONTS = [
  { pkg: "@fontsource-variable/archivo", slug: "archivo", files: { "archivo-latin-wdth-normal.woff2": "archivo-latin-wdth" } },
  {
    pkg: "@fontsource/ibm-plex-sans", slug: "ibm-plex-sans",
    files: {
      "ibm-plex-sans-latin-400-normal.woff2": "ibm-plex-sans-latin-400",
      "ibm-plex-sans-latin-500-normal.woff2": "ibm-plex-sans-latin-500",
      "ibm-plex-sans-latin-600-normal.woff2": "ibm-plex-sans-latin-600",
    },
  },
  { pkg: "@fontsource/ibm-plex-mono", slug: "ibm-plex-mono", files: { "ibm-plex-mono-latin-500-normal.woff2": "ibm-plex-mono-latin-500" } },
];

// Fail loudly rather than write file names index.html doesn't use.
const pins = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).devDependencies;
const html = readFileSync(join(root, "index.html"), "utf8");
for (const { pkg, files } of FONTS) {
  if (version(pkg) !== pins[pkg]) throw new Error(`${pkg}: node_modules has ${version(pkg)}, package.json pins ${pins[pkg]}. Run npm ci first.`);
  for (const base of Object.values(files)) {
    const name = `fonts/${base}-${version(pkg)}.woff2`;
    if (!html.includes(name)) console.warn(`warning: index.html doesn't reference ${name}; update its @font-face URLs (and the preload).`);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const { pkg, slug, files } of FONTS) {
  const v = version(pkg);
  for (const [src, base] of Object.entries(files)) {
    const dest = `${base}-${v}.woff2`;
    copyFileSync(join(pkgDir(pkg), "files", src), join(out, dest));
    console.log(`fonts/${dest}`);
  }
  copyFileSync(join(pkgDir(pkg), "LICENSE"), join(out, `OFL-${slug}.txt`));
}
console.log(`${readdirSync(out).length} files in fonts/`);
