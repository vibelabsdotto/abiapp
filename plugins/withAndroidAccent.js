// Android theme accent in the brand color. Without it AppCompat falls back
// to its teal default, which shows up in native alert buttons, PopupMenu
// checkboxes, text selection handles and the cursor. Light and dark use the
// app's accent tokens (src/constants/colors.ts: accent).

const {
  AndroidConfig,
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
} = require("expo/config-plugins");

const ACCENT_LIGHT = "#3B3FD8";
const ACCENT_DARK = "#8F94FF";

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
