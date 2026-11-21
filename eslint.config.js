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
    files: ["app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/subjectPalette.ts"],
    plugins: { abiapp: { rules: { "no-hex-colors": noHexColors } } },
    rules: { "abiapp/no-hex-colors": "error" },
  },
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "expo-symbols",
              message:
                "SF Symbols only live in native chrome (menu `image`, Stack.Toolbar, tabs) as names. Draw icons in content with <Icon icon={LucideIcon} /> from @components/ui.",
            },
          ],
        },
      ],
    },
  },
]);
