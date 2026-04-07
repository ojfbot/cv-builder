import type { Rule } from 'eslint'

/**
 * Rule: no-console-in-production
 *
 * Warns on console.log and console.debug in production source files.
 * Allows console.error (structured logging escape hatch).
 * Skips test files, scripts, and config files.
 *
 * This rule is particularly valuable as an LLM instruction — when injected
 * via the PreToolUse lint hook, it prompts Claude to remove debug logging
 * that it frequently leaves behind after debugging sessions.
 */

const FORBIDDEN_METHODS = ['log', 'debug', 'warn', 'info', 'trace']

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow console.log/debug/warn in production source files',
    },
    messages: {
      noConsole:
        'console.{{method}}() should not appear in production code. Use a structured logger or remove this debug statement.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedMethods: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Console methods to allow (default: ["error"])',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename()
    const options = context.options[0] || {}
    const allowedMethods: string[] = options.allowedMethods || ['error']

    // Skip test files, scripts, configs, and non-source files
    if (
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename) ||
      /__tests__\//.test(filename) ||
      /scripts\//.test(filename) ||
      /\.config\.(ts|js|mjs)$/.test(filename) ||
      /vitest\./.test(filename)
    ) {
      return {}
    }

    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          node.property.type === 'Identifier' &&
          FORBIDDEN_METHODS.includes(node.property.name) &&
          !allowedMethods.includes(node.property.name)
        ) {
          context.report({
            node,
            messageId: 'noConsole',
            data: { method: node.property.name },
          })
        }
      },
    }
  },
}

export default rule
