import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/no-source-maps-in-production.js'

const tester = new RuleTester()

describe('no-source-maps-in-production', () => {
  it('catches sourceMap: true in config files', () => {
    tester.run('no-source-maps-in-production', rule, {
      valid: [
        // sourceMap: false is fine
        {
          code: `module.exports = { compilerOptions: { sourceMap: false } }`,
          filename: 'tsconfig.build.json',
        },
        // No sourceMap at all is fine
        {
          code: `module.exports = { compilerOptions: { strict: true } }`,
          filename: 'tsconfig.json',
        },
        // sourceMap: true in non-config files is ignored
        {
          code: `const config = { sourceMap: true }`,
          filename: 'src/utils/config.ts',
        },
        // sourcemap: false in vite config
        {
          code: `export default { build: { sourcemap: false } }`,
          filename: 'vite.config.ts',
        },
      ],
      invalid: [
        // sourceMap: true in tsconfig
        {
          code: `module.exports = { compilerOptions: { sourceMap: true } }`,
          filename: 'tsconfig.build.json',
          errors: [{ messageId: 'noSourceMapsInTsconfig' }],
        },
        // sourcemap: true in vite config
        {
          code: `export default { build: { sourcemap: true } }`,
          filename: 'vite.config.ts',
          errors: [{ messageId: 'noSourceMapsInVite' }],
        },
        // Nested tsconfig path
        {
          code: `module.exports = { compilerOptions: { sourceMap: true } }`,
          filename: 'packages/api/tsconfig.build.json',
          errors: [{ messageId: 'noSourceMapsInTsconfig' }],
        },
      ],
    })
  })
})
