/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  // Include the "only-warn" plugin first so that it can override rule severities.
  plugins: [
    "only-warn",
    "@typescript-eslint"
  ],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    // These rules are now explicitly set to "warn".
    "@typescript-eslint/array-type": "warn",
    "@typescript-eslint/consistent-type-definitions": "warn",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports"
      }
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_"
      }
    ],
    "@typescript-eslint/require-await": "warn",
    "@typescript-eslint/no-misused-promises": [
      "warn",
      {
        checksVoidReturn: {
          attributes: false
        }
      }
    ]
  }
};

module.exports = config;
