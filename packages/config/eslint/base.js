import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const ignored = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/generated/**',
  '**/*.gen.*',
  '**/routeTree.gen.ts',
]

function scopeToTypeScript(config, files) {
  return { ...config, files }
}

export function createBaseConfig({
  tsconfigRootDir,
  files = ['**/*.{ts,tsx}'],
  environmentGlobals = {},
} = {}) {
  return tseslint.config(
    { ignores: ignored },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked.map((config) => scopeToTypeScript(config, files)),
    {
      files,
      languageOptions: {
        globals: {
          ...globals.es2021,
          ...environmentGlobals,
        },
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        'prefer-const': 'error',
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      },
    },
  )
}
