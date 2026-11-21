#!/usr/bin/env node
// Every Android VectorDrawable in assets/ must parse with Android's
// PathParser: each command needs a non-zero multiple of its argument count
// (A: 7). Compact SVG arc flags ("0 0022 17") break that and crash the app
// when the drawable inflates (a native menu with that icon). Generated
// drawables are normalized by scripts/lib/svgPath.mjs; this check keeps
// hand-drawn and future files honest. Part of `npm run lint`.
//
//   node scripts/check-vectors.mts

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pathDataProblems } from "./lib/svgPath.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const xmlFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return xmlFiles(full);
    return entry.name.endsWith(".xml") ? [full] : [];
  });

const problems: string[] = [];
let paths = 0;
const files = xmlFiles(path.join(root, "assets"));
for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("<vector")) continue;
  for (const match of source.matchAll(/android:pathData="([^"]*)"/g)) {
    paths += 1;
    for (const problem of pathDataProblems(match[1]!)) {
      problems.push(`${path.relative(root, file)}: ${problem}`);
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Vector check failed (Android PathParser would crash):\n  ${problems.join("\n  ")}\nRegenerate with node scripts/generate-android-menu-icons.mjs (normalizes arc flags).`,
  );
  process.exit(1);
}
console.log(`Vector check passed (${files.length} files, ${paths} paths).`);
