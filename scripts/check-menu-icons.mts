#!/usr/bin/env node
// Every SF Symbol that can reach a native menu needs an Android drawable.
// Menu `image` values are typed (MenuSymbol) and checked by the compiler;
// ruleset catalog symbols are runtime strings in src/domain, so this script
// checks them against src/constants/menuIcons.ts, and checks that every
// drawable of that table exists in assets/android-menu-icons/.
// Part of `npm run lint`.
//
//   node scripts/check-menu-icons.mts

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MENU_ICONS } from "../src/constants/menuIcons.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const domain = path.join(root, "src/domain");

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "__tests__" ? [] : files(full);
    return full.endsWith(".ts") && !full.endsWith(".test.ts") ? [full] : [];
  });

const used = new Map<string, string>();
for (const file of files(domain)) {
  const source = readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  for (const m of source.matchAll(/sfSymbol:\s*"([^"]+)"/g)) {
    used.set(m[1]!, rel);
  }
  // Catalog entries: e(key, name, short, field, [tags], "sf.symbol", ...)
  for (const m of source.matchAll(
    /\be\(\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*\[[^\]]*\],\s*"([^"]+)"/g,
  )) {
    used.set(m[1]!, rel);
  }
}
// Fallback symbol of catalog entries without one (rulesets/helpers.ts).
used.set("book.closed", "src/domain/rulesets/helpers.ts");

const problems: string[] = [];
for (const [symbol, file] of used) {
  if (!Object.hasOwn(MENU_ICONS, symbol)) {
    problems.push(`"${symbol}" (${file}) has no Android icon in MENU_ICONS`);
  }
}
for (const drawable of new Set(Object.values(MENU_ICONS))) {
  const file = path.join(root, "assets/android-menu-icons", `${drawable}.xml`);
  if (!existsSync(file)) {
    problems.push(
      `${drawable}.xml missing (run node scripts/generate-android-menu-icons.mjs)`,
    );
  }
}

if (problems.length > 0) {
  console.error(
    `Menu icon check failed (src/constants/menuIcons.ts):\n  ${problems.join("\n  ")}\nAdd the symbol with a Lucide drawable name, then run node scripts/generate-android-menu-icons.mjs.`,
  );
  process.exit(1);
}
console.log(
  `Menu icon check passed (${used.size} catalog symbols, ${Object.keys(MENU_ICONS).length} menu symbols).`,
);
