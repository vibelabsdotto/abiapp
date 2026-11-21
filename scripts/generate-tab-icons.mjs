#!/usr/bin/env node
// Generates the tab bar icons (assets/icons/tabs/*.png, @1x/@2x/@3x) from
// Lucide, rendered as black template images: iOS tints them through the
// NativeTabs `renderingMode: "template"`, Android tints them as well. Needs
// macOS (AppKit renders the SVG). Run after changing TAB_ICONS.
//
//   node scripts/generate-tab-icons.mjs

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { lucideSvg } from "./lib/lucide.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets/icons/tabs");
const rasterizer = path.join(root, "scripts/lib/svg2png.swift");

/** Tab route -> Lucide icon. Keep in sync with app/(tabs)/_layout.tsx. */
const TAB_ICONS = {
  home: "chart-pie",
  subjects: "library-big",
  abitur: "graduation-cap",
  settings: "settings",
};

/** iOS tab bar glyphs are about 26 pt; Lucide's stroke reads like SF regular. */
const POINTS = 26;

const tmp = await mkdtemp(path.join(os.tmpdir(), "abiapp-tabs-"));
await mkdir(outDir, { recursive: true });
for (const [tab, icon] of Object.entries(TAB_ICONS)) {
  const svgFile = path.join(tmp, `${tab}.svg`);
  await writeFile(svgFile, await lucideSvg(icon, 1.75));
  for (const scale of [1, 2, 3]) {
    const suffix = scale === 1 ? "" : `@${scale}x`;
    const out = path.join(outDir, `${tab}${suffix}.png`);
    execFileSync("swift", [rasterizer, svgFile, out, String(POINTS * scale)]);
  }
  console.log(`${tab}: ${icon}`);
}
