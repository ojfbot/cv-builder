import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../src/rules/no-cross-package-relative-imports.js'

const tester = new RuleTester()

describe('no-cross-package-relative-imports', () => {
  it('catches imports crossing package boundaries', () => {
    tester.run('no-cross-package-relative-imports', rule, {
      valid: [
        // Same-package relative import
        {
          code: `import { foo } from './utils/helper'`,
          filename: '/repo/packages/api/src/routes/index.ts',
        },
        // Workspace package import (not relative)
        {
          code: `import { Bio } from '@cv-builder/agent-core'`,
          filename: '/repo/packages/api/src/routes/index.ts',
        },
        // Node module import
        {
          code: `import express from 'express'`,
          filename: '/repo/packages/api/src/index.ts',
        },
        // Relative within same package (deeper nesting)
        {
          code: `import { schema } from '../../models/bio'`,
          filename: '/repo/packages/api/src/routes/v2/index.ts',
        },
        // File not in a packages/ directory — rule doesn't apply
        {
          code: `import { foo } from '../../other/bar'`,
          filename: '/repo/src/utils/helper.ts',
        },
      ],
      invalid: [
        // Cross-package: api/src/index.ts → agent-core
        // From /repo/packages/api/src/index.ts: ../../ goes to /repo/packages/
        {
          code: `import { BaseAgent } from '../../agent-core/src/agents/base'`,
          filename: '/repo/packages/api/src/index.ts',
          errors: [{ messageId: 'noCrossPackageImport' }],
        },
        // Cross-package from deeper nesting
        // From /repo/packages/api/src/routes/index.ts: ../../../ goes to /repo/packages/
        {
          code: `import { Bio } from '../../../agent-core/src/models/bio'`,
          filename: '/repo/packages/api/src/routes/index.ts',
          errors: [{ messageId: 'noCrossPackageImport' }],
        },
        // Dynamic import crossing boundary
        {
          code: `const mod = import('../../agent-core/src/utils')`,
          filename: '/repo/packages/api/src/index.ts',
          errors: [{ messageId: 'noCrossPackageImport' }],
        },
        // require() crossing boundary
        {
          code: `const mod = require('../../agent-core/src/utils')`,
          filename: '/repo/packages/api/src/index.ts',
          errors: [{ messageId: 'noCrossPackageImport' }],
        },
      ],
    })
  })
})
