import type { Rule } from 'eslint'

/**
 * Rule: no-api-keys-in-client
 *
 * Prevents API keys, tokens, and dangerouslyAllowBrowser from appearing
 * in browser-facing code. Catches the security issue that CV Builder
 * already fixed manually — the dangerouslyAllowBrowser migration.
 *
 * Catches:
 * - `dangerouslyAllowBrowser: true`
 * - String literals matching API key patterns (sk-ant-*, sk-*, ANTHROPIC_API_KEY)
 * - process.env references to sensitive keys in browser code
 */

const API_KEY_PATTERNS = [
  /^sk-ant-/,           // Anthropic API keys
  /^sk-[a-zA-Z0-9]{20,}/, // Generic secret keys
  /^key-[a-zA-Z0-9]{20,}/, // API keys
]

const SENSITIVE_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'API_KEY',
  'SECRET_KEY',
  'API_SECRET',
]

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow API keys and dangerouslyAllowBrowser in browser-facing code',
    },
    messages: {
      noDangerouslyAllowBrowser:
        'dangerouslyAllowBrowser: true exposes API keys to the browser. Move API calls server-side.',
      noApiKeyLiteral:
        'Possible API key detected in source code. Never embed API keys — use server-side environment variables.',
      noSensitiveEnvInBrowser:
        'Accessing sensitive environment variable "{{name}}" in browser code. API keys must stay server-side.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          browserPathPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Glob patterns for browser-facing code paths',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename()
    const options = context.options[0] || {}
    const browserPatterns = options.browserPathPatterns || [
      'browser-app',
      'browser',
      'client',
      'frontend',
      'web',
    ]

    const isBrowserCode = browserPatterns.some((pattern: string) =>
      filename.includes(pattern)
    )

    return {
      // Catch dangerouslyAllowBrowser: true (in any file, not just browser)
      Property(node) {
        if (node.key.type !== 'Identifier' && node.key.type !== 'Literal') return

        const keyName =
          node.key.type === 'Identifier'
            ? node.key.name
            : String(node.key.value)

        if (
          keyName === 'dangerouslyAllowBrowser' &&
          node.value.type === 'Literal' &&
          node.value.value === true
        ) {
          context.report({
            node,
            messageId: 'noDangerouslyAllowBrowser',
          })
        }
      },

      // Catch API key string literals
      Literal(node) {
        if (typeof node.value !== 'string') return
        const val = node.value

        for (const pattern of API_KEY_PATTERNS) {
          if (pattern.test(val)) {
            context.report({
              node,
              messageId: 'noApiKeyLiteral',
            })
            return
          }
        }
      },

      // Catch process.env.ANTHROPIC_API_KEY etc. in browser code
      MemberExpression(node) {
        if (!isBrowserCode) return

        // Match process.env.SENSITIVE_VAR
        if (
          node.object.type === 'MemberExpression' &&
          node.object.object.type === 'Identifier' &&
          node.object.object.name === 'process' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'env' &&
          node.property.type === 'Identifier' &&
          SENSITIVE_ENV_VARS.includes(node.property.name)
        ) {
          context.report({
            node,
            messageId: 'noSensitiveEnvInBrowser',
            data: { name: node.property.name },
          })
        }
      },
    }
  },
}

export default rule
