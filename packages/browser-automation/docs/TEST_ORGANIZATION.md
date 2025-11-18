# Test Organization - Semantic Structure

## Overview

The browser-automation test suite uses a **semantic test organization** that mirrors the screenshot storage structure. This ensures 100% screenshot coverage and predictable PR baseline documentation.

**Key Principle:** Test paths match screenshot paths exactly.

---

## Directory Structure

```
tests/
├── cv-builder/                    # Application-specific tests (semantic structure)
│   ├── bio-form/                  # Bio form and profile tests
│   │   ├── navigation.test.ts     # Bio tab navigation
│   │   └── add-bio-flow.test.ts   # Add bio user flow
│   ├── chat/                      # Chat interface tests
│   │   ├── message-input.test.ts  # Message typing and input
│   │   └── expand-collapse.test.ts # Chat window expand/collapse
│   ├── interactive/               # Interactive tab tests
│   │   └── navigation.test.ts     # Interactive tab navigation
│   ├── jobs/                      # Jobs panel tests
│   │   └── navigation.test.ts     # Jobs tab navigation
│   ├── outputs/                   # Outputs panel tests
│   │   └── navigation.test.ts     # Outputs tab navigation
│   ├── settings/                  # Settings modal tests
│   │   └── modal-interactions.test.ts # Settings open/close
│   ├── sidebar/                   # Sidebar navigation tests
│   │   └── toggle-interactions.test.ts # Sidebar expand/collapse
│   └── theme/                     # Theme switching tests
│       └── theme-switching.test.ts # Light/dark theme toggle
├── apps/                          # Integration tests
│   └── cv-builder-integration.test.ts
├── features/                      # Framework feature tests
│   ├── phase2-element-store-maps.test.ts
│   ├── phase3-features.test.ts
│   └── phase4-ui-assertions.test.ts
├── integration/                   # Basic integration tests
│   └── basic-workflow.test.ts
└── ui/                            # Legacy UI tests
    └── cv-builder-navigation.test.ts
```

---

## Screenshot Path Mapping

Every test uses **semantic metadata** in screenshot calls to ensure correct path mapping:

```typescript
await client.screenshot({
  name: 'navigate-tabs-bio',
  test: {
    app: 'cv-builder',      // Application name
    suite: 'bio-form',      // Test suite (matches directory)
    case: 'navigate-tabs-bio' // Test case identifier
  },
  viewport: 'desktop',
  fullPage: false,
});
```

This generates screenshots at:
```
temp/screenshots/pr-{number}/cv-builder/bio-form/navigate-tabs-bio-desktop.png
```

---

## Running Tests

### Individual Suites

Run tests by suite name:

```bash
# Bio form tests
npm run test:bio-form

# Chat tests
npm run test:chat

# Interactive tab tests
npm run test:interactive

# Jobs tests
npm run test:jobs

# Outputs tests
npm run test:outputs

# Settings tests
npm run test:settings

# Sidebar tests
npm run test:sidebar

# Theme tests
npm run test:theme
```

### Comprehensive Test Suite

Run all semantic tests:

```bash
npm run test:comprehensive
```

Options:
- `--suite=bio-form` - Run specific suite only
- `--dry-run` - List tests without running
- `--verbose` - Show detailed output

Examples:
```bash
# Run all tests
npm run test:comprehensive

# Run bio-form suite only
npm run test:comprehensive -- --suite=bio-form

# List all tests without running
npm run test:comprehensive -- --dry-run
```

### All Tests (Including Legacy)

Run entire test suite including integration and phase tests:

```bash
npm run test:all
```

---

## Coverage Validation

Validate that all tests have semantic screenshot paths:

```bash
npx tsx scripts/validate-screenshot-coverage.ts
```

This reports:
- Total test files analyzed
- Screenshot coverage percentage
- Semantic path coverage percentage
- Issues requiring attention

**Target:** 100% coverage (all tests must capture screenshots with semantic paths)

---

## Test Organization Principles

### 1. Semantic Suite Names

Suite names match screenshot directory structure:
- `bio-form/` → Bio form and profile features
- `chat/` → Chat interface interactions
- `interactive/` → Interactive tab features
- `jobs/` → Jobs panel features
- `outputs/` → Outputs panel features
- `settings/` → Settings modal interactions
- `sidebar/` → Sidebar navigation
- `theme/` → Theme switching

### 2. Test Case Naming

Test cases use descriptive names that indicate:
- **What** is being tested (e.g., `navigation`, `message-input`)
- **How** it's tested (e.g., `expand-collapse`, `modal-interactions`)

### 3. Screenshot Coverage

**Every test MUST:**
1. Capture at least one screenshot
2. Use semantic test metadata
3. Match the suite directory name

This ensures PR baselines include complete visual documentation.

### 4. Migration from Old Structure

**Old structure (deprecated):**
```
tests/interactions/navigateTabs.test.ts  # ❌ Deprecated
tests/features/chat-window.test.ts       # ❌ Deprecated
```

**New structure:**
```
tests/cv-builder/bio-form/navigation.test.ts    # ✅ Semantic
tests/cv-builder/chat/expand-collapse.test.ts   # ✅ Semantic
```

Old test scripts show deprecation warnings:
```bash
$ npm run test:navigateTabs
⚠️  Deprecated: Use npm run test:bio-form, test:jobs, test:outputs, or test:interactive
```

---

## Screenshot Statistics

**Current coverage (as of Phase 3.5 completion):**

- **Total test files:** 10
- **Files with screenshots:** 10/10 (100%)
- **Files with semantic paths:** 10/10 (100%)
- **Total screenshot calls:** 24

**Breakdown by suite:**

| Suite | Tests | Screenshots |
|-------|-------|-------------|
| bio-form | 2 | 7 |
| chat | 2 | 5 |
| interactive | 1 | 1 |
| jobs | 1 | 1 |
| outputs | 1 | 1 |
| settings | 1 | 3 |
| sidebar | 1 | 3 |
| theme | 1 | 3 |
| **Total** | **10** | **24** |

---

## Adding New Tests

When creating a new test:

1. **Choose the correct suite directory** based on feature area
2. **Use semantic screenshot metadata:**
   ```typescript
   test: {
     app: 'cv-builder',
     suite: '<suite-name>',  // Must match directory
     case: '<test-case-name>'
   }
   ```
3. **Ensure at least one screenshot** per test
4. **Run validation** to verify coverage:
   ```bash
   npx tsx scripts/validate-screenshot-coverage.ts
   ```

---

## Benefits of Semantic Organization

1. **Predictable Screenshot Paths:** Tests and screenshots share the same structure
2. **100% Coverage:** All tests contribute to PR baseline documentation
3. **Easy Navigation:** Find tests by feature area, not test type
4. **Clear Ownership:** Each suite owns its screenshots
5. **Automated Validation:** Scripts ensure compliance
6. **LLM-Friendly:** Semantic naming helps AI understand test organization

---

## Related Documentation

- [Screenshot Storage System](../../docs/SCREENSHOT_STORAGE.md) - 3-tier storage architecture
- [Browser Automation API](../README.md) - Test framework API reference
- [Phase 3.5 Migration](./PHASE_3.5_MIGRATION.md) - Migration notes from old structure

---

**Last Updated:** Phase 3.5 Test Organization Refactor
**Validation Status:** ✅ 100% Coverage Achieved
