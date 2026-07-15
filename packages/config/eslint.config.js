import { createBaseConfig } from './eslint/base.js'

export default createBaseConfig({
  tsconfigRootDir: import.meta.dirname,
  files: ['**/*.ts'],
})
