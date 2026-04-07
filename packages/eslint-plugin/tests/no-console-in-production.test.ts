import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/no-console-in-production.js'

const tester = new RuleTester()

describe('no-console-in-production', () => {
  it('catches console.log/debug/warn in production code', () => {
    tester.run('no-console-in-production', rule, {
      valid: [
        // console.error is allowed by default
        {
          code: `console.error('critical failure')`,
          filename: '/repo/packages/api/src/server.ts',
        },
        // console.log in test files is fine
        {
          code: `console.log('test output')`,
          filename: '/repo/packages/api/src/__tests__/server.test.ts',
        },
        // console.log in .test.ts files
        {
          code: `console.log('debug')`,
          filename: '/repo/packages/api/src/utils.test.ts',
        },
        // console.log in scripts is fine
        {
          code: `console.log('script output')`,
          filename: '/repo/scripts/build.ts',
        },
        // console.log in config files is fine
        {
          code: `console.log('config')`,
          filename: '/repo/eslint.config.js',
        },
      ],
      invalid: [
        // console.log in production source
        {
          code: `console.log('debug')`,
          filename: '/repo/packages/api/src/routes/auth.ts',
          errors: [{ messageId: 'noConsole', data: { method: 'log' } }],
        },
        // console.debug in production source
        {
          code: `console.debug('trace')`,
          filename: '/repo/packages/agent-core/src/agents/base.ts',
          errors: [{ messageId: 'noConsole', data: { method: 'debug' } }],
        },
        // console.warn in production source
        {
          code: `console.warn('deprecated')`,
          filename: '/repo/packages/browser-app/src/components/App.tsx',
          errors: [{ messageId: 'noConsole', data: { method: 'warn' } }],
        },
        // console.info in production source
        {
          code: `console.info('info')`,
          filename: '/repo/packages/api/src/middleware/auth.ts',
          errors: [{ messageId: 'noConsole', data: { method: 'info' } }],
        },
      ],
    })
  })
})
