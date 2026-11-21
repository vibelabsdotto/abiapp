#!/usr/bin/env node
// Contrast check for the colour tokens (WCAG 2.x relative luminance).
// Runs as part of `npm run lint`. Fails when a text token drops below
// 4.5:1 on a surface it is used on, or a `*OnSolid` below 4.5:1 on its
// `*Solid`, in light or dark. Subject accents need 3:1 (icons) on their
// tinted tile and on the card. A picked accent (src/constants/accents.ts) is
// text and button colour, so it needs 4.5:1 on every surface and under its
// foreground.
//
//   node scripts/check-contrast.mts

import { AccentForeground, AccentPalette } from "../src/constants/accents.ts";
import { Colors } from "../src/constants/colors.ts";
import {
  SubjectPalette,
  subjectTile,
} from "../src/components/ui/subjectPalette.ts";

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** #RRGGBB or #RRGGBBAA (alpha composited over `under`). */
const rgb = (hex: string, under = "#FFFFFF"): [number, number, number] => {
  const parse = (h: string) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ];
  const base = parse(hex);
  if (hex.length !== 9) return base;
  const alpha = parseInt(hex.slice(7, 9), 16) / 255;
  const back = parse(under);
  return base.map((c, i) => c * alpha + back[i]! * (1 - alpha)) as [
    number,
    number,
    number,
  ];
};

const luminance = (hex: string, under?: string) => {
  const [r, g, b] = rgb(hex, under).map(channel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a: string, b: string) => {
  const x = luminance(a, b);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const failures: string[] = [];
const expect = (label: string, fg: string, bg: string, min: number) => {
  const value = ratio(fg, bg);
  if (value < min) {
    failures.push(`${label}: ${fg} on ${bg} = ${value.toFixed(2)} < ${min}`);
  }
};

for (const mode of ["light", "dark"] as const) {
  const c = Colors[mode];
  const surfaces = {
    background: c.background,
    card: c.card,
    fill: c.fill,
  };
  const textTokens = [
    "text",
    "textSecondary",
    "error",
    "destructive",
    "pointsLowText",
    "pointsNoneText",
  ] as const;
  for (const token of textTokens) {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(`${mode}.${token} on ${name}`, c[token], surface, 4.5);
    }
  }
  expect(`${mode}.error on errorFill`, c.error, c.errorFill, 4.5);
  expect(`${mode}.text on errorFill`, c.text, c.errorFill, 4.5);
  expect(
    `${mode}.accentForeground on accent`,
    c.accentForeground,
    c.accent,
    4.5,
  );
  expect(`${mode}.accent on accentLight`, c.accent, c.accentLight, 4.5);
  for (const tier of ["Low", "Mid", "Good", "Top"] as const) {
    expect(
      `${mode}.points${tier}OnSolid on points${tier}Solid`,
      c[`points${tier}OnSolid`],
      c[`points${tier}Solid`],
      4.5,
    );
  }
  // Non-text: the ink tiers must stay apart from the card (3:1 for top).
  expect(`${mode}.pointsTopSolid on card`, c.pointsTopSolid, c.card, 3);
  // Prompt sheets: text, link (accent) and signature sit on `sheet`.
  for (const token of [
    "text",
    "textSecondary",
    "accent",
    "signatureInk",
  ] as const) {
    expect(`${mode}.${token} on sheet`, c[token], c.sheet, 4.5);
  }
  expect(`${mode}.tabBarInactive on tabBar`, c.tabBarInactive, c.tabBar, 4.5);

  for (const [key, value] of Object.entries(AccentPalette)) {
    const accent = value[mode];
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(`${mode}.accent.${key} on ${name}`, accent, surface, 4.5);
    }
    expect(`${mode}.accent.${key} on accentLight`, accent, c.accentLight, 4.5);
    expect(`${mode}.accent.${key} on sheet`, accent, c.sheet, 4.5);
    expect(
      `${mode}.accentForeground on accent.${key}`,
      AccentForeground[mode],
      accent,
      4.5,
    );
    // The arch and the active tab sit on the page; the track must stay apart.
    expect(`${mode}.accent.${key} on gaugeTrack`, accent, c.gaugeTrack, 3);
  }

  for (const [key, value] of Object.entries(SubjectPalette)) {
    const accent = value[mode];
    const tile = subjectTile(accent, c.card, mode);
    expect(`${mode}.subject.${key} on its tile`, accent, tile, 3);
    expect(`${mode}.subject.${key} on card`, accent, c.card, 3);
  }
}

if (failures.length > 0) {
  console.error(
    `Contrast check failed (src/constants/colors.ts, src/constants/accents.ts, src/components/ui/subjectPalette.ts):\n  ${failures.join("\n  ")}`,
  );
  process.exit(1);
}
console.log("Contrast check passed (light and dark).");
