import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/require-test-for-new-exports.js'

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

describe('require-test-for-new-exports', () => {
  it('warns on exports without corresponding test files', () => {
    tester.run('require-test-for-new-exports', rule, {
      valid: [
        // Test files themselves should be skipped
        {
          code: `export function testHelper() {}`,
          filename: '/repo/packages/api/src/__tests__/helper.test.ts',
        },
        // .spec files should be skipped
        {
          code: `export function specHelper() {}`,
          filename: '/repo/packages/api/src/auth.spec.ts',
        },
        // Index files (re-exports) should be skipped
        {
          code: `export { Foo } from './foo'`,
          filename: '/repo/packages/api/src/index.ts',
        },
        // Config files should be skipped
        {
          code: `export default { key: 'value' }`,
          filename: '/repo/vite.config.ts',
        },
        // Files without exports are fine
        {
          code: `const internal = 42`,
          filename: '/repo/packages/api/src/internal.ts',
        },
        // Scripts should be skipped
        {
          code: `export function main() {}`,
          filename: '/repo/scripts/build.ts',
        },
        // Files outside src/ should be skipped
        {
          code: `export function helper() {}`,
          filename: '/repo/packages/api/utils/helper.ts',
        },
      ],
      invalid: [
        // Source file with named export and no test file
        {
          code: `export function processData() { return 42 }`,
          filename: '/repo/packages/api/src/services/processor.ts',
          errors: [{ messageId: 'missingTest' }],
        },
        // Source file with default export and no test file
        {
          code: `export default class DataProcessor {}`,
          filename: '/repo/packages/api/src/services/data-processor.ts',
          errors: [{ messageId: 'missingTest' }],
        },
        // Multiple exports
        {
          code: `export function foo() {} export function bar() {}`,
          filename: '/repo/packages/agent-core/src/utils/helpers.ts',
          errors: [{ messageId: 'missingTest' }],
        },
      ],
    })
  })
})
