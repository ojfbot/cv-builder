import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/no-api-keys-in-client.js'

const tester = new RuleTester()

describe('no-api-keys-in-client', () => {
  it('catches dangerouslyAllowBrowser and API key patterns', () => {
    tester.run('no-api-keys-in-client', rule, {
      valid: [
        // dangerouslyAllowBrowser: false is fine
        {
          code: `new Anthropic({ dangerouslyAllowBrowser: false })`,
          filename: 'src/api/client.ts',
        },
        // No API keys present
        {
          code: `const name = "hello world"`,
          filename: 'packages/browser-app/src/utils.ts',
        },
        // process.env access for non-sensitive vars in browser code
        {
          code: `const mode = process.env.NODE_ENV`,
          filename: 'packages/browser-app/src/config.ts',
        },
        // Sensitive env in server code is fine
        {
          code: `const key = process.env.ANTHROPIC_API_KEY`,
          filename: 'packages/api/src/config.ts',
        },
      ],
      invalid: [
        // dangerouslyAllowBrowser: true (any file)
        {
          code: `new Anthropic({ dangerouslyAllowBrowser: true })`,
          filename: 'src/api/client.ts',
          errors: [{ messageId: 'noDangerouslyAllowBrowser' }],
        },
        // Anthropic API key literal
        {
          code: `const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz"`,
          filename: 'src/config.ts',
          errors: [{ messageId: 'noApiKeyLiteral' }],
        },
        // process.env.ANTHROPIC_API_KEY in browser code
        {
          code: `const key = process.env.ANTHROPIC_API_KEY`,
          filename: 'packages/browser-app/src/config.ts',
          errors: [{ messageId: 'noSensitiveEnvInBrowser' }],
        },
        // process.env.OPENAI_API_KEY in browser code
        {
          code: `const key = process.env.OPENAI_API_KEY`,
          filename: 'packages/browser-app/src/config.ts',
          errors: [{ messageId: 'noSensitiveEnvInBrowser' }],
        },
      ],
    })
  })
})
