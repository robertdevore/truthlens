import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.model-build/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.webextensions, ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  }
);
