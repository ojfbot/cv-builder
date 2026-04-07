import type { Rule } from 'eslint'

/**
 * Rule: no-untyped-schema-fields
 *
 * Warns when Zod schemas use z.array(z.string()) for fields that should
 * carry richer metadata — specifically fields named "skills", "technologies",
 * "items", "achievements", or "collaborators".
 *
 * Addresses TECHDEBT TD-002 (ExperienceSchema lacks cross-functional fields)
 * and TD-003 (SkillCategorySchema has no proficiency or recency metadata).
 *
 * The fix message teaches the enriched pattern:
 *   z.array(z.object({ name: z.string(), proficiency: z.enum([...]), ... }))
 *
 * When injected via PreToolUse hook, this nudges Claude toward richer schemas
 * instead of flat string arrays.
 */

const ENRICHABLE_FIELDS = [
  'skills',
  'technologies',
  'items',
  'achievements',
  'collaborators',
  'adjacentSkills',
  'certifications',
]

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn on flat z.array(z.string()) for fields that benefit from enriched metadata',
    },
    messages: {
      untypedField:
        '"{{field}}" uses z.array(z.string()) which loses proficiency, recency, and context metadata. Consider z.array(z.object({ name: z.string(), proficiency: z.enum([...]).optional(), lastUsed: z.string().optional(), context: z.string().optional() })) for richer agent analysis. See TECHDEBT.md TD-002/TD-003.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          fields: {
            type: 'array',
            items: { type: 'string' },
            description: 'Field names to check (default: skills, technologies, items, achievements, collaborators)',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename()
    const options = context.options[0] || {}
    const targetFields: string[] = options.fields || ENRICHABLE_FIELDS

    // Only apply to model/schema files
    if (
      !/models?\//i.test(filename) &&
      !/schemas?\//i.test(filename) &&
      !/types?\//i.test(filename)
    ) {
      return {}
    }

    return {
      // Match: fieldName: z.array(z.string())
      // AST: Property with key matching target fields, value is CallExpression
      // where callee is z.array and first arg is z.string()
      CallExpression(node) {
        // Check for z.array(z.string()) pattern
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'array'
        ) {
          return
        }

        // Check the argument is z.string()
        if (
          node.arguments.length === 0 ||
          node.arguments[0].type !== 'CallExpression'
        ) {
          return
        }

        const arg = node.arguments[0] as Rule.Node & { callee: any }
        if (
          arg.callee.type !== 'MemberExpression' ||
          arg.callee.property.type !== 'Identifier' ||
          arg.callee.property.name !== 'string'
        ) {
          return
        }

        // Now check if this is assigned to a target field name
        // Walk up to find the parent Property node
        const ancestors = context.sourceCode.getAncestors(node)
        for (let i = ancestors.length - 1; i >= 0; i--) {
          const ancestor = ancestors[i]
          if (ancestor.type === 'Property') {
            const key = (ancestor as any).key
            const fieldName =
              key.type === 'Identifier'
                ? key.name
                : key.type === 'Literal'
                  ? String(key.value)
                  : null

            if (fieldName && targetFields.includes(fieldName)) {
              context.report({
                node,
                messageId: 'untypedField',
                data: { field: fieldName },
              })
            }
            break
          }
        }
      },
    }
  },
}

export default rule
