import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/no-untyped-schema-fields.js'

const tester = new RuleTester()

describe('no-untyped-schema-fields', () => {
  it('catches z.array(z.string()) on enrichable fields in model files', () => {
    tester.run('no-untyped-schema-fields', rule, {
      valid: [
        // z.array(z.string()) on a non-target field name
        {
          code: `const schema = { tags: z.array(z.string()) }`,
          filename: '/repo/packages/agent-core/src/models/bio.ts',
        },
        // z.array(z.object(...)) on a target field (enriched — correct pattern)
        {
          code: `const schema = { skills: z.array(z.object({ name: z.string() })) }`,
          filename: '/repo/packages/agent-core/src/models/bio.ts',
        },
        // z.array(z.string()) in a non-model file (ignored)
        {
          code: `const config = { skills: z.array(z.string()) }`,
          filename: '/repo/packages/api/src/routes/auth.ts',
        },
        // z.string() without z.array wrapper
        {
          code: `const schema = { skills: z.string() }`,
          filename: '/repo/packages/agent-core/src/models/bio.ts',
        },
      ],
      invalid: [
        // skills: z.array(z.string()) in a model file
        {
          code: `const schema = { skills: z.array(z.string()) }`,
          filename: '/repo/packages/agent-core/src/models/bio.ts',
          errors: [{ messageId: 'untypedField', data: { field: 'skills' } }],
        },
        // technologies: z.array(z.string()) in a model file
        {
          code: `const schema = { technologies: z.array(z.string()) }`,
          filename: '/repo/packages/agent-core/src/models/output.ts',
          errors: [{ messageId: 'untypedField', data: { field: 'technologies' } }],
        },
        // items: z.array(z.string()) in a model file
        {
          code: `const schema = { items: z.array(z.string()) }`,
          filename: '/repo/packages/agent-core/src/models/bio.ts',
          errors: [{ messageId: 'untypedField', data: { field: 'items' } }],
        },
        // achievements: z.array(z.string()) in a schema file
        {
          code: `const schema = { achievements: z.array(z.string()) }`,
          filename: '/repo/packages/agent-core/src/schemas/experience.ts',
          errors: [{ messageId: 'untypedField', data: { field: 'achievements' } }],
        },
      ],
    })
  })
})
