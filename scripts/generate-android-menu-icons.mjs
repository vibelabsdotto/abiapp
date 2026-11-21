#!/usr/bin/env node
// Generates the Android icons for native chrome from Lucide (ISC), the same
// icon set the app draws in content:
// - menu icons: assets/android-menu-icons/menu_<lucide>.xml, the drawable
//   names in src/constants/menuIcons.ts (copied to res/drawable at prebuild
//   by plugins/withAndroidMenuIcons.js);
// - toolbar icons: assets/icons/toolbar/<lucide>.xml, required by
//   src/constants/toolbarIcons.ts.
// `menu_letter_*` drawables are drawn by hand and skipped. Rewrites every
// file (deterministic output). A new SF Symbol in a menu: add it to
// menuIcons.ts, run this script, prebuild, native Android build.
//
//   node scripts/generate-android-menu-icons.mjs

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { lucideVectorDrawable } from "./lib/lucide.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const menuDir = path.join(root, "assets/android-menu-icons");
const toolbarDir = path.join(root, "assets/icons/toolbar");

const drawablesIn = async (file, pattern) => [
  ...new Set(
    [...(await readFile(path.join(root, file), "utf8")).matchAll(pattern)].map(
      (m) => m[1],
    ),
  ),
];

const menu = await drawablesIn(
  "src/constants/menuIcons.ts",
  /"(menu_[a-z0-9_]+)"/g,
);
const toolbar = await drawablesIn(
  "src/constants/toolbarIcons.ts",
  /@assets\/icons\/toolbar\/([a-z0-9-]+)\.xml/g,
);

const failed = [];
const write = async (dir, file, lucideName, size) => {
  try {
    await writeFile(
      path.join(dir, file),
      await lucideVectorDrawable(lucideName, { size, strokeWidth: 2 }),
    );
  } catch (error) {
    failed.push(`${file} (${error.message})`);
  }
};

await mkdir(menuDir, { recursive: true });
await mkdir(toolbarDir, { recursive: true });

// Remove drawables no table references any more (old Material files).
for (const [dir, keep] of [
  [menuDir, new Set(menu.map((name) => `${name}.xml`))],
  [toolbarDir, new Set(toolbar.map((name) => `${name}.xml`))],
]) {
  for (const file of await readdir(dir)) {
    if (!keep.has(file) && !file.startsWith("menu_letter_")) {
      await rm(path.join(dir, file));
    }
  }
}

for (const drawable of menu) {
  if (drawable.startsWith("menu_letter_")) {
    if (!existsSync(path.join(menuDir, `${drawable}.xml`))) {
      failed.push(`${drawable} (hand-drawn, missing)`);
    }
    continue;
  }
  const lucide = drawable.slice("menu_".length).replaceAll("_", "-");
  await write(menuDir, `${drawable}.xml`, lucide, 24);
}
for (const name of toolbar) {
  await write(toolbarDir, `${name}.xml`, name, 24);
}

console.log(`${menu.length} menu drawables, ${toolbar.length} toolbar icons`);
if (failed.length > 0) {
  console.error(`failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}
