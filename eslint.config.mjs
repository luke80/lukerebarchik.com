import js from "@eslint/js";
import htmlEslint from "@html-eslint/eslint-plugin";
import htmlScripts from "eslint-plugin-html";
import globals from "globals";

export default [
  { ignores: ["node_modules/**"] },

  // Markup: structure, accessibility and duplicate checks.
  {
    ...htmlEslint.configs["flat/recommended"],
    files: ["**/*.html"],
    rules: {
      ...htmlEslint.configs["flat/recommended"].rules,
      // The page is hand-formatted compactly; don't enforce whitespace layout.
      "@html-eslint/indent": "off",
      "@html-eslint/element-newline": "off",
      "@html-eslint/attrs-newline": "off",
      "@html-eslint/require-meta-description": "error",
      "@html-eslint/require-meta-viewport": "error",
      "@html-eslint/require-open-graph-protocol": "off",
      // rel="noopener" is sufficient; noreferrer would hide referrals from LinkedIn.
      "@html-eslint/no-target-blank": "off",
      "@html-eslint/require-button-type": "error",
      "@html-eslint/no-inline-styles": "error",
    },
  },

  // Inline <script> blocks.
  {
    files: ["**/*.html"],
    plugins: { html: htmlScripts },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, dataLayer: "writable" },
    },
    rules: js.configs.recommended.rules,
  },

  // Tooling files.
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
    rules: js.configs.recommended.rules,
  },
];
