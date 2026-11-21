#!/usr/bin/env node
// Every Android VectorDrawable in assets/ must parse with Android's
// PathParser: each command needs a non-zero multiple of its argument count
// (A: 7). Compact SVG arc flags ("0 0022 17") break that and crash the app
// when the drawable inflates (a native menu with that icon). Generated
// drawables are normalized by scripts/lib/svgPath.mjs; this check keeps
// hand-drawn and future files honest. Toolbar icons
// (assets/icons/toolbar/) load through @expo/ui, whose parser fills paths
// and ignores strokes and groups: there every path must be an opaque fill,
// without stroke attributes and outside groups (scripts/lib/lucide.mjs
// writes them outlined). Part of `npm run lint`.
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
  const rel = path.relative(root, file);
  if (rel.startsWith(`assets${path.sep}icons${path.sep}toolbar${path.sep}`)) {
    if (/<group\b/.test(source)) {
      problems.push(`${rel}: <group> is ignored by @expo/ui (toolbar icon)`);
    }
    for (const element of source.matchAll(/<path\b[^>]*>/g)) {
      const tag = element[0];
      if (/android:stroke/.test(tag)) {
        problems.push(
          `${rel}: stroke attributes are ignored by @expo/ui, the icon renders as solid shapes (toolbar icons must be outlined fills)`,
        );
      }
      const fill = tag.match(
        /android:fillColor="#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})"/,
      )?.[1];
      if (
        !fill ||
        (fill.length === 8 && fill.slice(0, 2).toUpperCase() !== "FF")
      ) {
        problems.push(
          `${rel}: path without an opaque fillColor (toolbar icon)`,
        );
      }
    }
  }
  for (const match of source.matchAll(/android:pathData="([^"]*)"/g)) {
    paths += 1;
    for (const problem of pathDataProblems(match[1]!)) {
      problems.push(`${rel}: ${problem}`);
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Vector check failed (Android would crash or draw the icon wrong):\n  ${problems.join("\n  ")}\nRegenerate with node scripts/generate-android-menu-icons.mjs (normalizes arc flags, outlines toolbar strokes).`,
  );
  process.exit(1);
}
console.log(`Vector check passed (${files.length} files, ${paths} paths).`);
