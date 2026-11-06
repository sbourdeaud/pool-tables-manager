import js from '@eslint/js'
import babelParser from '@babel/eslint-parser'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'

export default defineConfig(['ts', 'tsx'].map((extension) => ({
  files: [`src/**/*.${extension}`],
  languageOptions: {
    parser: babelParser,
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: extension === 'tsx' ? ['typescript', 'jsx'] : ['typescript'] },
      },
    },
  },
  plugins: { 'react-hooks': reactHooks },
  rules: {
    ...js.configs.recommended.rules,
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
})))
