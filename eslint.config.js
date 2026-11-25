import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

// typescript-eslint "recommended" (syntax-only, fast) plus security-relevant core rules.
// `no-explicit-any` is a warning: the codebase still has many untyped API payloads, and they are
// being typed gradually rather than hidden behind blanket disables.
export default [
  {
    ignores: ["dist/**", "node_modules/**", ".data/**", "coverage/**"]
  },
  ...tsPlugin.configs["flat/recommended"].map((cfg) => ({
    ...cfg,
    files: ["server/**/*.ts", "src/**/*.{ts,tsx}", "server.ts", "tests/**/*.{ts,tsx}"]
  })),
  {
    files: ["server/**/*.ts", "src/**/*.{ts,tsx}", "server.ts", "tests/**/*.{ts,tsx}"],
    rules: {
      // Security
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      // Correctness
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "warn",
      eqeqeq: ["warn", "smart"],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-expect-error": "allow-with-description" }],
      "@typescript-eslint/no-require-imports": "error"
    }
  },
  {
    // Classic hook rules: rules-of-hooks catches real bugs (error); exhaustive-deps flags stale closures.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  },
  {
    // Tests feed hostile inputs (javascript: URLs etc.) on purpose to prove they are rejected.
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "no-script-url": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
