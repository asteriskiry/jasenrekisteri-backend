import js from '@eslint/js'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['node_modules/**', '.pm2/**', 'coverage/**', 'eslint.config.mjs'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-constant-binary-expression': 'off',
      strict: 'off',
    },
  },
  prettier,
]
