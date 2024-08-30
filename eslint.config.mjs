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
      'no-unreachable': 'error',
    },
  },
  {
    ignores: ['dist/*'],
  }
)
