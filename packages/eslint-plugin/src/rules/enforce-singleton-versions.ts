import type { Rule } from 'eslint'

/**
 * Rule: enforce-singleton-versions
 *
 * Warns when Module Federation shared singleton configs use hardcoded version
 * strings instead of dynamically reading from package.json. Hardcoded versions
 * drift silently between shell and remotes, causing runtime failures.
 *
 * CV Builder already uses the dep() helper pattern (vite.config.ts:10-17)
 * to read versions from package.json. This rule enforces that pattern.
 *
 * Catches:
 * - `requiredVersion: '^18.3.1'` (hardcoded literal)
 * Allows:
 * - `requiredVersion: dep(appPkg, 'react')` (dynamic)
 * - `requiredVersion: someVariable` (variable reference)
 */

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce dynamic version resolution in Module Federation shared singleton configs',
    },
    messages: {
      noHardcodedVersion:
        'Hardcoded version "{{version}}" in Module Federation shared config. Use a helper like dep() to read from package.json — hardcoded versions drift silently between shell and remotes.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename()

    // Only applies to vite/webpack config files
    if (!/(?:vite|webpack)\.config\.[jt]s$/.test(filename)) {
      return {}
    }

    let inSharedConfig = false

    return {
      // Track when we enter a `shared` property in federation config
      'Property'(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'shared'
        ) {
          inSharedConfig = true
        }

        // Inside shared config, check requiredVersion for hardcoded strings
        if (
          inSharedConfig &&
          node.key.type === 'Identifier' &&
          node.key.name === 'requiredVersion' &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          context.report({
            node: node.value,
            messageId: 'noHardcodedVersion',
            data: { version: node.value.value },
          })
        }
      },

      'Property:exit'(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'shared'
        ) {
          inSharedConfig = false
        }
      },
    }
  },
}

export default rule
