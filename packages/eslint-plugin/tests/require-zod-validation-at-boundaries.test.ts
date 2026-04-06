import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/require-zod-validation-at-boundaries.js'

describe('require-zod-validation-at-boundaries', () => {
  it('allows handlers with Zod .parse()', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [
        {
          code: `app.post('/api/foo', (req, res) => { const data = schema.parse(req.body); res.json(data) })`,
          filename: '/repo/packages/api/src/routes/foo.ts',
        },
      ],
      invalid: [],
    })
  })

  it('allows handlers with Zod .safeParse()', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [
        {
          code: `app.get('/api/bar', (req, res) => { const result = QuerySchema.safeParse(req.query); res.json(result) })`,
          filename: '/repo/packages/api/src/routes/bar.ts',
        },
      ],
      invalid: [],
    })
  })

  it('ignores non-route files', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [
        {
          code: `function handler(req) { return req.body }`,
          filename: '/repo/packages/core/src/utils/helper.ts',
        },
      ],
      invalid: [],
    })
  })

  it('allows handlers without req access', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [
        {
          code: `app.get('/health', (req, res) => { res.json({ ok: true }) })`,
          filename: '/repo/packages/api/src/routes/health.ts',
        },
      ],
      invalid: [],
    })
  })

  it('catches req.body without validation', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [],
      invalid: [
        {
          code: `app.post('/api/foo', (req, res) => { const data = req.body; res.json(data) })`,
          filename: '/repo/packages/api/src/routes/foo.ts',
          errors: [{ messageId: 'missingZodValidation' }],
        },
      ],
    })
  })

  it('catches req.params without validation', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [],
      invalid: [
        {
          code: `app.get('/api/foo/:id', (req, res) => { const id = req.params.id; res.json({ id }) })`,
          filename: '/repo/packages/api/src/routes/foo.ts',
          errors: [{ messageId: 'missingZodValidation' }],
        },
      ],
    })
  })

  it('catches req.query without validation', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [],
      invalid: [
        {
          code: `app.get('/api/search', (req, res) => { const q = req.query.q; res.json({ q }) })`,
          filename: '/repo/packages/api/src/routes/search.ts',
          errors: [{ messageId: 'missingZodValidation' }],
        },
      ],
    })
  })

  it('catches multiple unvalidated accesses', () => {
    const tester = new RuleTester()
    tester.run('require-zod-validation-at-boundaries', rule, {
      valid: [],
      invalid: [
        {
          code: `app.put('/api/foo/:id', (req, res) => { const id = req.params.id; const data = req.body; res.json({ id, data }) })`,
          filename: '/repo/packages/api/src/routes/foo.ts',
          errors: [
            { messageId: 'missingZodValidation' },
            { messageId: 'missingZodValidation' },
          ],
        },
      ],
    })
  })
})
