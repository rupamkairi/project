import globals from 'globals'
import { createBaseConfig } from './base.js'

export function createServerConfig(tsconfigRootDir) {
  return [
    ...createBaseConfig({
      tsconfigRootDir,
      environmentGlobals: {
        ...globals.node,
        ...globals.bun,
      },
    }),
    {
      rules: {
        'no-console': 'off', // servers log by design
      },
    },
  ]
}
