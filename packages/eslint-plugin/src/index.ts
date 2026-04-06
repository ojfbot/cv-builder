import noSourceMapsInProduction from './rules/no-source-maps-in-production.ts'
import noApiKeysInClient from './rules/no-api-keys-in-client.ts'
import enforceSingletonVersions from './rules/enforce-singleton-versions.ts'
import noCrossPackageRelativeImports from './rules/no-cross-package-relative-imports.ts'
import requireZodValidationAtBoundaries from './rules/require-zod-validation-at-boundaries.ts'

const plugin = {
  meta: {
    name: '@frame/eslint-plugin',
    version: '1.0.0',
  },
  rules: {
    'no-source-maps-in-production': noSourceMapsInProduction,
    'no-api-keys-in-client': noApiKeysInClient,
    'enforce-singleton-versions': enforceSingletonVersions,
    'no-cross-package-relative-imports': noCrossPackageRelativeImports,
    'require-zod-validation-at-boundaries': requireZodValidationAtBoundaries,
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
  },
}

export default plugin
