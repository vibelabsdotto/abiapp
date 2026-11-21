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
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    rules: {
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "BinaryExpression[operator='/'][left.value=17][right.value=3]",
          message:
            "Float grade formula: compute the Abitur grade with gradeFromPoints (integer tenths), see docs/rulesets.md.",
        },
      ],
    },
  },
]);
