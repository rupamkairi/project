import globals from 'globals'
import { createBaseConfig } from './base.js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export function createReactConfig(tsconfigRootDir) {
  return [
    ...createBaseConfig({
      tsconfigRootDir,
      environmentGlobals: globals.browser,
    }),
    react.configs.flat.recommended,
    {
      plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
      settings: { react: { version: 'detect' } },
      rules: {
        ...reactHooks.configs.recommended.rules,
        ...reactRefresh.configs.vite.rules,
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
      },
    },
  ]
}
