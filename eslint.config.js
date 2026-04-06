import tseslint from 'typescript-eslint'
import framePlugin from './packages/eslint-plugin/src/index.ts'

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      'packages/temp/**',
      'personal/**',
      'dev/**',
      'docs/**',
      'packages/tsconfig/**',
      // Build artifacts and generated files
      '**/storybook-static/**',
      // Scripts and agents that don't need strict linting
      '.agents/**',
      'scripts/**',
    ],
  },

  // TypeScript parser for TS/TSX files
  ...tseslint.configs.recommended,

  // Relax typescript-eslint rules — we're adding @frame rules incrementally,
  // not fixing all pre-existing TS lint issues at once
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Apply @frame rules to all source files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    plugins: {
      '@frame': framePlugin,
    },
    rules: {
      '@frame/no-source-maps-in-production': 'error',
      '@frame/no-api-keys-in-client': 'error',
      '@frame/enforce-singleton-versions': 'warn',
      '@frame/no-cross-package-relative-imports': 'error',
      '@frame/require-zod-validation-at-boundaries': 'warn',
    },
  },
]
