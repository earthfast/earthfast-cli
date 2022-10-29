module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:import/recommended",
    "plugin:node/recommended",
  ],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  settings: {
    node: {
      // Configuration for node/no-missing-import rule
      tryExtensions: [".js", ".json", ".ts", ".d.ts"],
    },
  },
  rules: {
    "import/order": ["error", { alphabetize: { order: "asc", caseInsensitive: true } }],
    // Disabled to avoid duplicate diagnostics with node/no-missing-import rule
    "import/no-unresolved": "off",
    // Disabled because typescript adds support for module import/export to node
    "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules"] }],
    // Disabled because process.exit() is better than throw Error() for CLI tool
    "no-process-exit": "off",
  },
};
