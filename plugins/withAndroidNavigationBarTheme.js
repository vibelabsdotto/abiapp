// Android navigation bar follows the app's theme choice. React Native sets
// the 3-button bar's appearance once at startup from the system theme. When
// the user picks "Hell"/"Dunkel" in the app (Appearance.setColorScheme ->
// AppCompat night mode, handled in place via configChanges=uiMode), the
// bar kept the system appearance: a light scrim under a dark app. Re-apply
// it on every uiMode change.

const { withMainActivity } = require("expo/config-plugins");

const MARKER = "// abiapp: navigation bar follows the app theme";
const METHOD = `
  ${MARKER}
  override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
    super.onConfigurationChanged(newConfig)
    val nightMask = newConfig.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK
    val isDark = nightMask == android.content.res.Configuration.UI_MODE_NIGHT_YES
    androidx.core.view.WindowInsetsControllerCompat(window, window.decorView)
      .isAppearanceLightNavigationBars = !isDark
  }
`;

const withAndroidNavigationBarTheme = (config) =>
  withMainActivity(config, (cfg) => {
    const { modResults } = cfg;
    if (modResults.language !== "kt") {
      throw new Error("withAndroidNavigationBarTheme expects MainActivity.kt");
    }
    if (!modResults.contents.includes(MARKER)) {
      const anchor = "class MainActivity : ReactActivity() {";
      if (!modResults.contents.includes(anchor)) {
        throw new Error(
          "withAndroidNavigationBarTheme: MainActivity anchor missing",
        );
      }
      modResults.contents = modResults.contents.replace(
        anchor,
        `${anchor}${METHOD}`,
      );
    }
    return cfg;
  });

module.exports = withAndroidNavigationBarTheme;
