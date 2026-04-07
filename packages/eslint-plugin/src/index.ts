import noSourceMapsInProduction from './rules/no-source-maps-in-production.ts'
import noApiKeysInClient from './rules/no-api-keys-in-client.ts'
import enforceSingletonVersions from './rules/enforce-singleton-versions.ts'
import noCrossPackageRelativeImports from './rules/no-cross-package-relative-imports.ts'
import requireZodValidationAtBoundaries from './rules/require-zod-validation-at-boundaries.ts'
import noConsoleInProduction from './rules/no-console-in-production.ts'
import noUntypedSchemaFields from './rules/no-untyped-schema-fields.ts'
import requireTestForNewExports from './rules/require-test-for-new-exports.ts'

const plugin = {
  meta: {
    name: '@frame/eslint-plugin',
    version: '2.0.0',
  },
  rules: {
    'no-source-maps-in-production': noSourceMapsInProduction,
    'no-api-keys-in-client': noApiKeysInClient,
    'enforce-singleton-versions': enforceSingletonVersions,
    'no-cross-package-relative-imports': noCrossPackageRelativeImports,
    'require-zod-validation-at-boundaries': requireZodValidationAtBoundaries,
    'no-console-in-production': noConsoleInProduction,
    'no-untyped-schema-fields': noUntypedSchemaFields,
    'require-test-for-new-exports': requireTestForNewExports,
  },
  configs: {} as Record<string, unknown>,
}

// Flat config presets (ESLint 9+)
plugin.configs.recommended = {
  plugins: {
    '@frame': plugin,
  },
  rules: {
    '@frame/no-source-maps-in-production': 'error',
    '@frame/no-api-keys-in-client': 'error',
    '@frame/enforce-singleton-versions': 'warn',
    '@frame/no-cross-package-relative-imports': 'error',
    '@frame/require-zod-validation-at-boundaries': 'warn',
    '@frame/no-console-in-production': 'warn',
    '@frame/no-untyped-schema-fields': 'warn',
    '@frame/require-test-for-new-exports': 'warn',
  },
}

plugin.configs.browser = {
  plugins: {
    '@frame': plugin,
  },
  rules: {
    '@frame/no-source-maps-in-production': 'error',
    '@frame/no-api-keys-in-client': 'error',
    '@frame/enforce-singleton-versions': 'warn',
    '@frame/no-cross-package-relative-imports': 'error',
    '@frame/require-zod-validation-at-boundaries': 'warn',
    '@frame/no-console-in-production': 'warn',
    '@frame/no-untyped-schema-fields': 'warn',
    '@frame/require-test-for-new-exports': 'warn',
  },
}

export default plugin
