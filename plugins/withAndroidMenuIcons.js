// Native menu icons on Android. @react-native-menu/menu resolves an action's
// `image` as a drawable resource, so the Material Symbols vectors from
// assets/android-menu-icons/ (see src/constants/menuIcons.ts) are copied into
// res/drawable at prebuild. Stale `menu_*.xml` files that no longer exist in
// the assets folder are removed.

const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const SOURCE_DIR = "assets/android-menu-icons";
const PREFIX = "menu_";

const withAndroidMenuIcons = (config) =>
  withDangerousMod(config, [
    "android",
    async (cfg) => {
      const source = path.join(cfg.modRequest.projectRoot, SOURCE_DIR);
      const target = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/res/drawable",
      );
      const icons = (await fs.promises.readdir(source)).filter(
        (file) => file.startsWith(PREFIX) && file.endsWith(".xml"),
      );
      await fs.promises.mkdir(target, { recursive: true });
      for (const file of await fs.promises.readdir(target)) {
        if (
          file.startsWith(PREFIX) &&
          file.endsWith(".xml") &&
          !icons.includes(file)
        ) {
          await fs.promises.rm(path.join(target, file));
        }
      }
      for (const file of icons) {
        await fs.promises.copyFile(
          path.join(source, file),
          path.join(target, file),
        );
      }
      return cfg;
    },
  ]);

module.exports = withAndroidMenuIcons;
