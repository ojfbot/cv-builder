# Phase 3.5 Migration Guide - Test Organization Refactor

## Overview

Phase 3.5 reorganized all browser automation tests from a **test-type structure** (interactions/, flows/, features/) to a **semantic feature structure** (cv-builder/{suite}/). This ensures 100% screenshot coverage for PR baseline documentation.

---

## Problem Statement

**Before Phase 3.5:**
- Tests were organized by type: `interactions/`, `flows/`, `features/`
- Only 5/17 test files synced screenshots to PR baselines
- Screenshot paths were inconsistent (ephemeral vs semantic)
- Missing screenshots for flows/, features/, apps/, ui/ tests

**Result:** Incomplete PR documentation, manual review burden

---

## Solution: Semantic Test Organization

**After Phase 3.5:**
- Tests organized by feature area: `cv-builder/{suite}/`
- 10/10 test files use semantic screenshot paths
- All screenshots sync to PR baselines
- Predictable path mapping: `test suite → screenshot directory`

**Result:** 100% coverage, automated validation, complete PR documentation

---

## Migration Mapping

### Old Structure → New Structure

| Old Path | New Path | Notes |
|----------|----------|-------|
| `interactions/navigateTabs.test.ts` | Split into 4 files: | Each tab gets own suite |
| | `cv-builder/bio-form/navigation.test.ts` | Bio tab navigation |
| | `cv-builder/jobs/navigation.test.ts` | Jobs tab navigation |
| | `cv-builder/outputs/navigation.test.ts` | Outputs tab navigation |
| | `cv-builder/interactive/navigation.test.ts` | Interactive tab navigation |
| `interactions/engageChat.test.ts` | `cv-builder/chat/message-input.test.ts` | Merged with features |
| `interactions/toggleSidebar.test.ts` | `cv-builder/sidebar/toggle-interactions.test.ts` | Direct migration |
| `interactions/switchTheme.test.ts` | `cv-builder/theme/theme-switching.test.ts` | Direct migration |
| `interactions/openSettings.test.ts` | `cv-builder/settings/modal-interactions.test.ts` | Direct migration |
| `flows/addYourBioFlow.test.ts` | `cv-builder/bio-form/add-bio-flow.test.ts` | Direct migration |
| `features/chat-window.test.ts` | `cv-builder/chat/expand-collapse.test.ts` | Merged with interactions |
| `features/sidebar-toggle.test.ts` | *(duplicate)* | Removed (better version in interactions) |
| `features/theme-toggle.test.ts` | *(duplicate)* | Removed (better version in interactions) |
| `features/tab-navigation.test.ts` | *(duplicate)* | Removed (better version in interactions) |

---

## Screenshot Path Changes

### Before (Inconsistent)

```typescript
// Some tests used ephemeral paths
await client.screenshot({ name: 'engage-chat-empty-input' });
// → temp/screenshots/ephemeral/engage-chat-empty-input.png

// Others used timestamps
await client.screenshot({ name: `chat-${Date.now()}` });
// → temp/screenshots/ephemeral/chat-1234567890.png
```

### After (Semantic)

```typescript
// All tests use semantic metadata
await client.screenshot({
  name: 'empty-input',
  test: {
    app: 'cv-builder',
    suite: 'chat',
    case: 'empty-input'
  },
  viewport: 'desktop',
});
// → temp/screenshots/pr-{number}/cv-builder/chat/empty-input-desktop.png
```

---

## New Test Suites

The semantic structure introduces 8 test suites:

1. **bio-form/** - Bio tab and profile tests
   - `navigation.test.ts` - Bio tab navigation
   - `add-bio-flow.test.ts` - Add bio user flow (6 screenshots)

2. **chat/** - Chat interface tests
   - `message-input.test.ts` - Message typing and input
   - `expand-collapse.test.ts` - Chat window expand/collapse

3. **interactive/** - Interactive tab tests
   - `navigation.test.ts` - Interactive tab navigation

4. **jobs/** - Jobs panel tests
   - `navigation.test.ts` - Jobs tab navigation

5. **outputs/** - Outputs panel tests
   - `navigation.test.ts` - Outputs tab navigation

6. **settings/** - Settings modal tests
   - `modal-interactions.test.ts` - Settings open/close

7. **sidebar/** - Sidebar navigation tests
   - `toggle-interactions.test.ts` - Sidebar expand/collapse

8. **theme/** - Theme switching tests
   - `theme-switching.test.ts` - Light/dark theme toggle

---

## New Scripts

### package.json Changes

**Added:**
```json
{
  "test:bio-form": "tsx tests/cv-builder/bio-form/navigation.test.ts && ...",
  "test:chat": "tsx tests/cv-builder/chat/message-input.test.ts && ...",
  "test:interactive": "tsx tests/cv-builder/interactive/navigation.test.ts",
  "test:jobs": "tsx tests/cv-builder/jobs/navigation.test.ts",
  "test:outputs": "tsx tests/cv-builder/outputs/navigation.test.ts",
  "test:settings": "tsx tests/cv-builder/settings/modal-interactions.test.ts",
  "test:sidebar": "tsx tests/cv-builder/sidebar/toggle-interactions.test.ts",
  "test:theme": "tsx tests/cv-builder/theme/theme-switching.test.ts",
  "test:comprehensive": "tsx scripts/run-comprehensive-tests.ts"
}
```

**Deprecated (with warnings):**
```json
{
  "test:navigateTabs": "echo '⚠️  Deprecated: Use npm run test:bio-form, ...'",
  "test:engageChat": "echo '⚠️  Deprecated: Use npm run test:chat'",
  "test:toggleSidebar": "echo '⚠️  Deprecated: Use npm run test:sidebar'",
  "test:switchTheme": "echo '⚠️  Deprecated: Use npm run test:theme'",
  "test:openSettings": "echo '⚠️  Deprecated: Use npm run test:settings'",
  "test:interactions": "echo '⚠️  Deprecated: Use npm run test:comprehensive'"
}
```

### New Utility Scripts

1. **run-comprehensive-tests.ts** - Runs all semantic tests
   ```bash
   npm run test:comprehensive
   npm run test:comprehensive -- --suite=bio-form
   npm run test:comprehensive -- --dry-run
   ```

2. **validate-screenshot-coverage.ts** - Validates 100% coverage
   ```bash
   npx tsx scripts/validate-screenshot-coverage.ts
   ```

---

## Validation Results

Running validation after Phase 3.5:

```
🔍 Screenshot Coverage Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Test Analysis:

✅ bio-form/add-bio-flow.test.ts - Screenshots: 6
✅ bio-form/navigation.test.ts - Screenshots: 1
✅ chat/expand-collapse.test.ts - Screenshots: 3
✅ chat/message-input.test.ts - Screenshots: 2
✅ interactive/navigation.test.ts - Screenshots: 1
✅ jobs/navigation.test.ts - Screenshots: 1
✅ outputs/navigation.test.ts - Screenshots: 1
✅ settings/modal-interactions.test.ts - Screenshots: 3
✅ sidebar/toggle-interactions.test.ts - Screenshots: 3
✅ theme/theme-switching.test.ts - Screenshots: 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Coverage Summary

Total test files: 10
Files with screenshots: 10/10 (100%)
Files with semantic paths: 10/10 (100%)
Total screenshot calls: 24

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 100% COVERAGE - All tests have screenshots with semantic paths!
```

**Success:** All 10 test files now contribute to PR baseline documentation.

---

## Breaking Changes

### For Test Authors

1. **Import paths changed** for existing tests:
   ```typescript
   // Old
   import { createTestSuite } from '../../src/test-runner/index.js';

   // New (from cv-builder/ subdirectory)
   import { createTestSuite } from '../../../src/test-runner/index.js';
   ```

2. **Screenshot calls require semantic metadata:**
   ```typescript
   // Old (deprecated)
   await client.screenshot({ name: 'my-screenshot' });

   // New (required)
   await client.screenshot({
     name: 'my-screenshot',
     test: {
       app: 'cv-builder',
       suite: 'my-suite',
       case: 'my-case'
     }
   });
   ```

### For CI/CD

1. **Updated test:comprehensive** - Now runs semantic test runner
2. **New validation script** - Can be added to CI to enforce coverage
3. **Deprecated scripts** - Show warnings but don't break builds

---

## Timeline

- **Issue Created:** During PR #38 review (screenshot-refactor branch)
- **Implementation:** Phase 3.5 Test Organization Refactor
- **Completion:** All 10 tasks completed
- **Validation:** ✅ 100% coverage achieved

---

## Acceptance Criteria (All Met)

- [x] Semantic test directory structure created (8 suites)
- [x] All 10 test files migrated to semantic structure
- [x] All screenshot calls use semantic test metadata
- [x] Comprehensive test runner created
- [x] package.json scripts updated
- [x] Validation script confirms 100% coverage
- [x] Documentation created (TEST_ORGANIZATION.md, this file)

---

## Next Steps

1. **Delete old test directories** (interactions/, flows/, features/ duplicates)
2. **Update CI/CD** to run `npm run test:comprehensive`
3. **Add validation to pre-commit** hook
4. **Monitor PR baselines** to ensure all screenshots appear

---

## Benefits Realized

1. **✅ 100% Screenshot Coverage** - All tests contribute to PR baselines
2. **✅ Predictable Paths** - Test suite → screenshot directory mapping
3. **✅ Automated Validation** - Scripts enforce compliance
4. **✅ Better Organization** - Tests grouped by feature, not type
5. **✅ LLM-Friendly** - Semantic naming helps AI understand structure
6. **✅ Easy Maintenance** - Clear ownership per suite

---

**Migration Status:** ✅ Complete
**Coverage:** 100% (10/10 tests with semantic paths)
**Next Phase:** Visual diff tool (Issue #39)
