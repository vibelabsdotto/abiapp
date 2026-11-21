import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// Tests cover pure logic only: the domain layer, src/utils and pure
// functions in src/services. A module that imports React Native fails to
// load in Node, so UI code cannot slip in here.
export default defineConfig({
  resolve: {
    alias: {
      "@domain": path.resolve(root, "src/domain"),
      "@services": path.resolve(root, "src/services"),
      "@utils": path.resolve(root, "src/utils"),
    },
  },
  test: {
    include: [
      "src/domain/**/*.test.ts",
      "src/utils/**/*.test.ts",
      "src/services/**/*.test.ts",
    ],
    environment: "node",
  },
});
