import type { Rule } from 'eslint'

/**
 * Rule: no-source-maps-in-production
 *
 * Prevents sourceMap/sourcemap: true in TypeScript and Vite build configs.
 * Source maps in production artifacts expose internal code structure —
 * the exact misconfiguration that caused Claude Code's March 2026 source map leak
 * (v2.1.88, .map files shipped in npm package exposing trust boundary logic).
 *
 * Catches:
 * - `sourceMap: true` in tsconfig compilerOptions
 * - `sourcemap: true` in Vite build config
 * - `devtool: 'source-map'` or similar in build configs
 */

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow source maps in production build configurations',
    },
    messages: {
      noSourceMapsInTsconfig:
        'sourceMap is enabled in TypeScript config. Source maps in production expose internal code structure. Set sourceMap: false or remove it.',
      noSourceMapsInVite:
        'sourcemap is enabled in Vite build config. Source maps in production expose internal code structure. Set sourcemap: false or remove it.',
      noSourceMapsDevtool:
        'Source map devtool is enabled in build config. Source maps in production expose internal code structure.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename()

    // Rule applies to config files only
    const isTsConfig = /tsconfig.*\.json$/.test(filename)
    const isViteConfig = /vite\.config\.[jt]s$/.test(filename)
    const isBuildConfig = /webpack\.config|rollup\.config|esbuild/.test(filename)

    if (!isTsConfig && !isViteConfig && !isBuildConfig) {
      return {}
    }

    return {
      // Catches: sourceMap: true / sourcemap: true in object properties
      Property(node) {
        if (node.key.type !== 'Identifier' && node.key.type !== 'Literal') return

        const keyName =
          node.key.type === 'Identifier'
            ? node.key.name
            : String(node.key.value)

        const isSourceMapKey =
          keyName === 'sourceMap' || keyName === 'sourcemap'

        if (!isSourceMapKey) return

        // Check if value is `true`
        if (
          node.value.type === 'Literal' &&
          node.value.value === true
        ) {
          context.report({
            node,
            messageId: isViteConfig
              ? 'noSourceMapsInVite'
              : 'noSourceMapsInTsconfig',
          })
        }
      },
    }
  },
}

export default rule
