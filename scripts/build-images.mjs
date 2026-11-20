// Converts the site's photographs to web formats at the sizes the page shows.
// Run: npm run images   (sharp is exact-pinned in devDependencies)
// Originals live in source-images/ (blocked from the site by staticwebapp.config.json); outputs go to img/web/. Re-run after changing an original.
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const jobs = [
  // hero portrait (2026): shown 628x716 at 1440 (1122 is the original's width, used for 2x screens), 342 wide on a phone (700 covers 2x)
  { src: "source-images/Luke-2026-Portrait.png", out: "img/web/luke-2026-portrait", widths: [1122, 700, 400] },
];

await mkdir("img/web", { recursive: true });
for (const job of jobs) {
  for (const w of job.widths) {
    for (const [ext, opts] of [["webp", { quality: 72 }], ["avif", { quality: 50 }]]) {
      const file = `${job.out}-${w}.${ext}`;
      await sharp(job.src).resize({ width: w, withoutEnlargement: true })[ext](opts).toFile(file);
      console.log(file, (await stat(file)).size, "bytes");
    }
  }
}
