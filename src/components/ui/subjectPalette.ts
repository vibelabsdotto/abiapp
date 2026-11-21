// Subject colours. Every new subject gets one (utils/subjectColor.ts); a
// subject without a colour (stored `null`) is neutral graphite.
//
// Curated in OKLCH: every tone shares lightness and chroma (light L 0.53,
// dark L 0.77, C 0.105; slate and brown are the muted pair at half chroma),
// so no subject shouts louder than another. Hues stay clear of the signal
// red (pink sits at 355°, orange at 52°). The stored keys are a contract
// with user databases and backups: never rename them, only retune values.
// Pure TypeScript (also read by scripts/check-contrast.mts).

export const SubjectPalette = {
  ink: { light: "#5268A9", dark: "#97B2F8" },
  blue: { light: "#2473A2", dark: "#72BDF0" },
  teal: { light: "#007C79", dark: "#54C9C5" },
  green: { light: "#357D4D", dark: "#7FC893" },
  olive: { light: "#627528", dark: "#A9BF72" },
  amber: { light: "#8A650D", dark: "#D6AE62" },
  orange: { light: "#9B582C", dark: "#EAA175" },
  pink: { light: "#9A506F", dark: "#EA98B8" },
  plum: { light: "#8A558D", dark: "#D69DD9" },
  violet: { light: "#735DA0", dark: "#BCA6EF" },
  slate: { light: "#4D7186", dark: "#94BAD1" },
  brown: { light: "#886347", dark: "#D4AB8D" },
} as const;

export type SubjectColorKey = keyof typeof SubjectPalette;

export const SUBJECT_COLOR_KEYS = Object.keys(
  SubjectPalette,
) as SubjectColorKey[];

export const isSubjectColorKey = (
  value: string | null | undefined,
): value is SubjectColorKey => !!value && value in SubjectPalette;

/** Share of the accent in the tinted avatar tile. */
const TILE_MIX = { light: 0.14, dark: 0.2 } as const;

const parse = (hex: string) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));

/** Accent mixed into the surface: the tile behind a subject icon. */
export const subjectTile = (
  accent: string,
  surface: string,
  mode: "light" | "dark",
): string => {
  const mix = TILE_MIX[mode];
  const a = parse(accent);
  const s = parse(surface);
  return `#${a
    .map((channel, index) =>
      Math.round(channel * mix + (s[index] ?? 0) * (1 - mix))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
};
