// Android theme accent in ink. Without it AppCompat falls back to its teal
// default (and Material 3 to lavender), which shows up in native alert
// buttons, PopupMenu checkboxes, text selection handles and the cursor.
// Light and dark use the app's accent tokens (src/constants/colors.ts:
// accent), so every native widget stays black and white.

const {
  AndroidConfig,
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
} = require("expo/config-plugins");

const ACCENT_LIGHT = "#0A0A0A";
const ACCENT_DARK = "#F5F5F5";

const setColors = (modResults, accent) => {
  let colors = AndroidConfig.Colors.assignColorValue(modResults, {
    name: "colorAccent",
    value: accent,
  });
  colors = AndroidConfig.Colors.assignColorValue(colors, {
    name: "colorPrimary",
    value: accent,
  });
  return colors;
};

const withAndroidAccent = (config) => {
  config = withAndroidColors(config, (cfg) => {
    cfg.modResults = setColors(cfg.modResults, ACCENT_LIGHT);
    return cfg;
  });
  config = withAndroidColorsNight(config, (cfg) => {
    cfg.modResults = setColors(cfg.modResults, ACCENT_DARK);
    return cfg;
  });
  config = withAndroidStyles(config, (cfg) => {
    cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: "colorAccent",
      value: "@color/colorAccent",
    });
    return cfg;
  });
  return config;
};

module.exports = withAndroidAccent;
