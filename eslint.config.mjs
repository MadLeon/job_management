import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores for performance:
    "node_modules/**",
    "data/**",
    "scripts/**",
    "public/**",
    ".git/**",
    "*.db",
    "*.json",
  ]),
]);

export default eslintConfig;
