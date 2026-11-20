import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests cover the pure TypeScript domain layer only (no React Native).
export default defineConfig({
  resolve: {
    alias: {
      "@domain": path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "src/domain",
      ),
    },
  },
  test: {
    include: ["src/domain/**/*.test.ts"],
    environment: "node",
  },
});
