const js = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const globals = require('globals');

module.exports = defineConfig([
  {
    ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**', '**/generated/**', 'public/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: globals.jest
    }
  }
]);
