import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/enforce-singleton-versions.js'

const tester = new RuleTester()

describe('enforce-singleton-versions', () => {
  it('catches hardcoded versions in MF shared config', () => {
    tester.run('enforce-singleton-versions', rule, {
      valid: [
        // Dynamic version via function call
        {
          code: `export default { plugins: [federation({ shared: { react: { singleton: true, requiredVersion: dep(appPkg, 'react') } } })] }`,
          filename: 'vite.config.ts',
        },
        // Variable reference
        {
          code: `export default { plugins: [federation({ shared: { react: { singleton: true, requiredVersion: reactVersion } } })] }`,
          filename: 'vite.config.ts',
        },
        // Not a config file — ignored
        {
          code: `const config = { shared: { react: { requiredVersion: '^18.3.1' } } }`,
          filename: 'src/utils.ts',
        },
      ],
      invalid: [
        // Hardcoded version string
        {
          code: `export default { plugins: [federation({ shared: { react: { singleton: true, requiredVersion: '^18.3.1' } } })] }`,
          filename: 'vite.config.ts',
          errors: [{ messageId: 'noHardcodedVersion' }],
        },
        // Multiple hardcoded versions
        {
          code: `export default { plugins: [federation({ shared: { react: { requiredVersion: '^18.3.1' }, 'react-dom': { requiredVersion: '^18.3.1' } } })] }`,
          filename: 'vite.config.ts',
          errors: [
            { messageId: 'noHardcodedVersion' },
            { messageId: 'noHardcodedVersion' },
          ],
        },
      ],
    })
  })
})
