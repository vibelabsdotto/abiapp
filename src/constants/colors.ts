// AbiApp color system. Provisional neutral palette with a single accent;
// final branding replaces these values without changing the token names.

export const Colors = {
  light: {
    // Surfaces
    background: "#F2F2F7",
    card: "#FFFFFF",
    muted: "#E5E5EA",

    // Text
    text: "#0A0A0A",
    textSecondary: "#6B7280",

    // Accent
    accent: "#2563EB",
    accentLight: "#2563EB1F",
    accentForeground: "#FFFFFF",

    // Status
    success: "#16A34A",
    warning: "#D97706",
    error: "#DC2626",
    destructive: "#DC2626",

    // Lines
    border: "#E5E5EA",
    separator: "#D1D1D6",

    // Navigation
    tabBar: "#FFFFFF",
    tabBarInactive: "#6B7280",
    tabIndicator: "#2563EB26",
    ripple: "#2563EB33",
  },
  dark: {
    background: "#000000",
    card: "#1C1C1E",
    muted: "#2C2C2E",

    text: "#F5F5F5",
    textSecondary: "#9CA3AF",

    accent: "#60A5FA",
    accentLight: "#60A5FA26",
    accentForeground: "#0A0A0A",

    success: "#22C55E",
    warning: "#F59E0B",
    error: "#F87171",
    destructive: "#F87171",

    border: "#2C2C2E",
    separator: "#38383A",

    tabBar: "#1C1C1E",
    tabBarInactive: "#9CA3AF",
    tabIndicator: "#60A5FA33",
    ripple: "#60A5FA40",
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
