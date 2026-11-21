// Icons for native menus. iOS takes the SF Symbol name (outline variants,
// iOS 16.4). Android's PopupMenu (@react-native-menu/menu) resolves `image`
// as a drawable resource, so every SF Symbol used in a menu maps to a Lucide
// VectorDrawable here, the same icon set the app draws in content. The XMLs
// live in assets/android-menu-icons/ (scripts/generate-android-menu-icons.mjs)
// and land in res/drawable through plugins/withAndroidMenuIcons.js.
//
// `MenuSymbol` is the type of every menu action's `image`, so a symbol
// without an Android icon does not compile. Catalog symbols from
// src/domain are runtime strings; scripts/check-menu-icons.mts (part of
// `npm run lint`) checks them against this table.

/** SF Symbol -> drawable `menu_<lucide name>` (`menu_letter_*` hand-drawn). */
export const MENU_ICONS = {
  // Actions
  trash: "menu_trash_2",
  pencil: "menu_pencil",
  "square.and.pencil": "menu_square_pen",
  "plus.circle": "menu_circle_plus",
  "plus.square.on.square": "menu_copy_plus",
  "minus.circle": "menu_circle_minus",
  "wand.and.stars": "menu_wand_sparkles",
  pin: "menu_pin",
  "pin.slash": "menu_pin_off",
  target: "menu_target",
  "checkmark.seal": "menu_badge_check",
  "checkmark.circle": "menu_circle_check",
  "mappin.and.ellipse": "menu_map_pin",
  "doc.richtext": "menu_file_text",
  "list.number": "menu_list_ordered",
  // Appearance and language
  "circle.lefthalf.filled": "menu_contrast",
  "sun.max": "menu_sun",
  moon: "menu_moon",
  globe: "menu_globe",
  "d.circle": "menu_letter_d",
  "e.circle": "menu_letter_e",
  // Subject fields (custom subject)
  "character.book.closed": "menu_book_a",
  "person.3": "menu_users",
  atom: "menu_atom",
  "book.closed": "menu_book",
  "figure.run": "menu_person_standing",
  "square.grid.2x2": "menu_layout_grid",
  // Subjects (src/components/ui/subjects.ts and ruleset catalog symbols)
  "text.book.closed": "menu_book_open_text",
  "x.squareroot": "menu_square_radical",
  function: "menu_square_function",
  "character.bubble": "menu_languages",
  scroll: "menu_scroll",
  leaf: "menu_leaf",
  "testtube.2": "menu_flask_conical",
  "chevron.left.forwardslash.chevron.right": "menu_code_xml",
  hourglass: "menu_hourglass",
  "globe.europe.africa": "menu_earth",
  "building.columns": "menu_landmark",
  "chart.line.uptrend.xyaxis": "menu_trending_up",
  sparkles: "menu_sparkles",
  "brain.head.profile": "menu_brain",
  paintpalette: "menu_palette",
  "music.note": "menu_music",
  theatermasks: "menu_drama",
  "doc.text.magnifyingglass": "menu_file_search",
  map: "menu_map",
  "text.quote": "menu_quote",
  scalemass: "menu_scale",
  "person.2": "menu_users_round",
  "wrench.and.screwdriver": "menu_wrench",
  gearshape: "menu_settings",
  "moon.stars": "menu_moon_star",
  "fork.knife": "menu_utensils",
  puzzlepiece: "menu_puzzle",
  lightbulb: "menu_lightbulb",
  "heart.text.square": "menu_heart_pulse",
  desktopcomputer: "menu_monitor",
  graduationcap: "menu_graduation_cap",
} as const;

/** An SF Symbol that has an Android menu icon. */
export type MenuSymbol = keyof typeof MENU_ICONS;

export const isMenuSymbol = (value: unknown): value is MenuSymbol =>
  typeof value === "string" && Object.hasOwn(MENU_ICONS, value);

/** Android drawable name for an SF Symbol of a menu action. */
export function androidMenuIcon(sf: string | undefined): string | undefined {
  return isMenuSymbol(sf) ? MENU_ICONS[sf] : undefined;
}
