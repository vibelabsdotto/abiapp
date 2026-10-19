const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores([
    ".agents/**",
    ".claude/**",
    ".expo/**",
    ".hermes/**",
    "android/**",
    "dist/**",
    "ios/**",
    "node_modules/**",
    "web-build/**",
  ]),
  expoConfig,
]);
