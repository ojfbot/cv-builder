import type { Rule } from 'eslint'

/**
 * Rule: require-zod-validation-at-boundaries
 *
 * Warns when Express route handlers access req.body, req.params, or req.query
 * without Zod validation (.parse() or .safeParse()) in the same function scope.
 * Enforces the validation pattern established in agent-core models.
 *
 * Applies to files matching route/API patterns (configurable).
 */

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require Zod schema validation when accessing request data in route handlers',
    },
    messages: {
      missingZodValidation:
        'Accessing req.{{property}} without Zod validation in this handler. Use schema.parse(req.{{property}}) or schema.safeParse(req.{{property}}) to validate external input.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          routeFilePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Path patterns that identify route handler files',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename()
    const options = context.options[0] || {}
    const routePatterns = options.routeFilePatterns || [
      'routes/',
      'route.',
      'api/',
      'controllers/',
      'handlers/',
    ]

    // Only apply to route files
    const isRouteFile = routePatterns.some((pattern: string) =>
      filename.includes(pattern)
    )
    if (!isRouteFile) return {}

    const REQUEST_PROPERTIES = ['body', 'params', 'query']

    // Track per-function scope: which req properties are accessed and
    // whether Zod parse/safeParse is called
    type ScopeInfo = {
      reqAccesses: Array<{ property: string; node: Rule.Node }>
      hasZodParse: boolean
    }

    const scopeStack: ScopeInfo[] = []

    function enterScope() {
      scopeStack.push({ reqAccesses: [], hasZodParse: false })
    }

    function exitScope() {
      const scope = scopeStack.pop()
      if (!scope) return

      if (!scope.hasZodParse) {
        for (const access of scope.reqAccesses) {
          context.report({
            node: access.node,
            messageId: 'missingZodValidation',
            data: { property: access.property },
          })
        }
      }
    }

    return {
      FunctionDeclaration: enterScope,
      FunctionExpression: enterScope,
      ArrowFunctionExpression: enterScope,

      'FunctionDeclaration:exit': exitScope,
      'FunctionExpression:exit': exitScope,
      'ArrowFunctionExpression:exit': exitScope,

      // Track req.body / req.params / req.query access
      MemberExpression(node) {
        if (scopeStack.length === 0) return

        if (
          node.object.type === 'Identifier' &&
          (node.object.name === 'req' || node.object.name === 'request') &&
          node.property.type === 'Identifier' &&
          REQUEST_PROPERTIES.includes(node.property.name)
        ) {
          scopeStack[scopeStack.length - 1].reqAccesses.push({
            property: node.property.name,
            node,
          })
        }
      },

      // Track .parse() / .safeParse() calls (Zod validation)
      CallExpression(node) {
        if (scopeStack.length === 0) return

        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          (node.callee.property.name === 'parse' ||
            node.callee.property.name === 'safeParse')
        ) {
          scopeStack[scopeStack.length - 1].hasZodParse = true
        }
      },
    }
  },
}

export default rule
