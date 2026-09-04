import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Erzeugte und fremde Dateien: der Prisma-Client sowie die Arbeitsordner
    // der Marken-Skripte. Ohne diese Zeilen prüft ESLint mitgelieferte
    // Chrome-Erweiterungen und meldet Fehler, die uns nicht gehören.
    "lib/generated/**",
    ".video-work/**",
    ".chrome-capture/**",
  ]),
]);

export default eslintConfig;
