import type { Rule } from 'eslint'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Rule: require-test-for-new-exports
 *
 * Warns when a source file exports functions or classes but has no
 * corresponding test file. Checks for:
 *   - __tests__/<name>.test.ts
 *   - <name>.test.ts (co-located)
 *   - <name>.spec.ts
 *
 * When injected via PreToolUse hook, this prompts Claude to generate
 * tests alongside implementation instead of skipping them.
 */

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when exported functions/classes have no corresponding test file',
    },
    messages: {
      missingTest:
        'This file exports {{count}} function(s)/class(es) but has no test file. Expected: {{expectedPath}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          testPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Glob patterns for test file locations',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename()

    // Skip test files themselves, configs, scripts, type declaration files
    if (
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename) ||
      /__tests__\//.test(filename) ||
      /\.config\.(ts|js|mjs)$/.test(filename) ||
      /scripts\//.test(filename) ||
      /\.d\.ts$/.test(filename) ||
      /index\.(ts|js)$/.test(filename) // index files are re-exports
    ) {
      return {}
    }

    // Only check source files in src/ directories
    if (!/\/src\//.test(filename)) {
      return {}
    }

    let exportCount = 0
    let firstExportNode: Rule.Node | null = null

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          exportCount++
          if (!firstExportNode) firstExportNode = node
        }
      },

      ExportDefaultDeclaration(node) {
        exportCount++
        if (!firstExportNode) firstExportNode = node
      },

      'Program:exit'() {
        if (exportCount === 0 || !firstExportNode) return

        const parsed = path.parse(filename)
        const baseName = parsed.name
        const dir = parsed.dir

        // Check for test file existence
        const candidates = [
          path.join(dir, '__tests__', `${baseName}.test.ts`),
          path.join(dir, '__tests__', `${baseName}.test.tsx`),
          path.join(dir, `${baseName}.test.ts`),
          path.join(dir, `${baseName}.test.tsx`),
          path.join(dir, `${baseName}.spec.ts`),
          path.join(dir, `${baseName}.spec.tsx`),
        ]

        const hasTest = candidates.some((c) => {
          try {
            return fs.existsSync(c)
          } catch {
            return false
          }
        })

        if (!hasTest) {
          const expectedPath = path
            .relative(
              path.dirname(filename),
              path.join(dir, '__tests__', `${baseName}.test.ts`)
            )

          context.report({
            node: firstExportNode,
            messageId: 'missingTest',
            data: {
              count: String(exportCount),
              expectedPath,
            },
          })
        }
      },
    }
  },
}

export default rule
