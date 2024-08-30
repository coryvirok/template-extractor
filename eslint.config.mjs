import eslint from '@eslint/js'
import prettierEslint from 'eslint-config-prettier'
import tsEslint from 'typescript-eslint'

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  prettierEslint,
  {
    files: ['**/*.{ts,js,cjs,mjs}'],
    rules: {
      'object-shorthand': ['warn', 'always'],
    },
  }
)

/** @type { import("eslint").Linter.Config } */
// export default [
//   {
//     languageOptions: {
//       parser: ts
//     },
//   extends: [
//     'eslint:recommended',
//     'plugin:@typescript-eslint/recommended',
//     'prettier',
//   ],
//   parser: '@typescript-eslint/parser',
//   plugins: ['@typescript-eslint'],
//   parserOptions: {
//     sourceType: 'module',
//     ecmaVersion: 2020
//   },
//   env: {
//     browser: true,
//     es2017: true,
//     node: true,
//   },
//   overrides: [
//     {
//       files: ['**/*.{ts,js,cjs,mjs}'],
//       rules: {
//         'object-shorthand': ['warn', 'always'],
//       },
//     },
//   ],
//   }
// ]
