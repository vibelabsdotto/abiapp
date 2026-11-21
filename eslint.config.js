const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

/**
 * Monochrome design guard: colours come from tokens
 * (src/constants/colors.ts) or the subject palette
 * (src/components/ui/subjectPalette.ts), never from hex literals in screens
 * or components.
 */
const noHexColors = {
  meta: {
    type: "problem",
    messages: {
      hex: "Hex colour '{{value}}' in UI code. Use a token from useThemeStore((s) => s.colors) (src/constants/colors.ts); subject accents come from SubjectPalette. Need a new shade? Add a token to colors.ts and run npm run lint (contrast check).",
    },
    schema: [],
  },
  create(context) {
    const check = (node, text) => {
      const match = typeof text === "string" ? text.match(HEX) : null;
      if (match) {
        context.report({ node, messageId: "hex", data: { value: match[0] } });
      }
    };
    return {
      Literal: (node) => check(node, node.value),
      TemplateElement: (node) => check(node, node.value.raw),
    };
  },
};

const EXPO_SYMBOLS_IMPORT = {
  name: "expo-symbols",
  message:
    "SF Symbols only live in native chrome (menu `image`, Stack.Toolbar, tabs) as names. Draw icons in content with <Icon icon={LucideIcon} /> from @components/ui.",
};

const ANALYTICS_SERVICE_IMPORT = {
  name: "@services/analytics/analyticsService",
  message:
    "Analytics goes through @services/analytics/appEvents (typed events, allowed parameters, route patterns instead of paths).",
};

/**
 * Unsaved-changes guards go through useEditorClose
 * (src/components/common/feedback.ts), a page that steps back inside
 * itself through useInPlaceBack (same file). A hand-rolled usePreventRemove that
 * re-dispatches the blocked action while still active asks again forever.
 */
const PREVENT_REMOVE_IMPORTS = [
  "expo-router",
  "expo-router/react-navigation",
].map((name) => ({
  name,
  importNames: ["usePreventRemove"],
  message:
    "Use useEditorClose(dirty) from @components/common/feedback (cancel, closeAfterSave, allowClose): the one discard guard for every editor. A page that goes back inside itself uses useInPlaceBack from the same file.",
}));

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
    files: ["app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/subjectPalette.ts"],
    plugins: { abiapp: { rules: { "no-hex-colors": noHexColors } } },
    rules: { "abiapp/no-hex-colors": "error" },
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            EXPO_SYMBOLS_IMPORT,
            ANALYTICS_SERVICE_IMPORT,
            ...PREVENT_REMOVE_IMPORTS,
          ],
        },
      ],
    },
  },
  {
    // The analytics module itself and its event layer may use the service.
    files: ["src/services/analytics/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [EXPO_SYMBOLS_IMPORT, ...PREVENT_REMOVE_IMPORTS] },
      ],
    },
  },
  {
    // The one editor close guard (useEditorClose) lives here.
    files: ["src/components/common/feedback.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [EXPO_SYMBOLS_IMPORT, ANALYTICS_SERVICE_IMPORT] },
      ],
    },
  },
]);
