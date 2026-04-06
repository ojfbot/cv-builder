import type { Rule } from 'eslint'
import * as path from 'path'

/**
 * Rule: no-cross-package-relative-imports
 *
 * Errors on relative imports that traverse into another workspace package's
 * source directory. These imports bypass the package contract (exports map,
 * build step) and create fragile coupling.
 *
 * Example violation (from packages/api/tsconfig.json):
 *   import { Foo } from '../../packages/agent-core/src/bar'
 *   import { Foo } from '../agent-core/src/agents/document-parser'
 *
 * Fix: use workspace package import instead:
 *   import { Foo } from '@cv-builder/agent-core'
 */

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow relative imports that cross workspace package boundaries',
    },
    messages: {
      noCrossPackageImport:
        'Relative import "{{importPath}}" crosses into another workspace package. Use the package name (e.g., @cv-builder/{{targetPkg}}) instead.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          packagesDir: {
            type: 'string',
            description: 'Name of the packages directory (default: "packages")',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename()
    const options = context.options[0] || {}
    const packagesDir = options.packagesDir || 'packages'

    function checkImportPath(node: Rule.Node, importPath: string) {
      // Only check relative imports
      if (!importPath.startsWith('.')) return

      const fileDir = path.dirname(filename)
      const resolved = path.resolve(fileDir, importPath)

      // Find the current package root — walk up until we find a dir inside packages/
      const packagesIndex = filename.indexOf(`/${packagesDir}/`)
      if (packagesIndex === -1) return

      const afterPackages = filename.substring(
        packagesIndex + `/${packagesDir}/`.length
      )
      const currentPkg = afterPackages.split('/')[0]

      // Check if the resolved import lands in a different package
      const resolvedPackagesIndex = resolved.indexOf(`/${packagesDir}/`)
      if (resolvedPackagesIndex === -1) return

      const resolvedAfterPackages = resolved.substring(
        resolvedPackagesIndex + `/${packagesDir}/`.length
      )
      const targetPkg = resolvedAfterPackages.split('/')[0]

      if (targetPkg && targetPkg !== currentPkg) {
        context.report({
          node,
          messageId: 'noCrossPackageImport',
          data: { importPath, targetPkg },
        })
      }
    }

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value === 'string') {
          checkImportPath(node, node.source.value)
        }
      },

      // Also catch dynamic imports: import('...')
      ImportExpression(node) {
        if (
          node.source.type === 'Literal' &&
          typeof node.source.value === 'string'
        ) {
          checkImportPath(node, node.source.value)
        }
      },

      // Also catch require('...')
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          checkImportPath(node, node.arguments[0].value)
        }
      },
    }
  },
}

export default rule
