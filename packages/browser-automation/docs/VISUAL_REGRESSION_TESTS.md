# Visual Regression Test Coverage

This document describes the comprehensive visual regression test suite for CV Builder, covering UI interactions, responsive layouts, and component states.

## Test Suite Overview

**Total Tests:** 18 visual regression tests
**Framework:** Browser Automation Test Runner with Visual Comparison Engine
**Baseline Storage:** `packages/browser-automation/baselines/`
**Test Location:** `packages/browser-automation/tests/visual/cv-builder-visual.test.ts`

## Test Categories

### 1. Layout and Navigation Tests

#### Dashboard - Initial Load
- **Viewport:** Desktop
- **Coverage:** Full page initial state, sidebar, header, all tabs
- **Baseline:** `dashboard-initial-desktop`

#### Bio Tab - Layout
- **Viewport:** Desktop
- **Coverage:** Bio management interface, empty state
- **Baseline:** `bio-tab-desktop`

#### Jobs Tab - Layout
- **Viewport:** Desktop
- **Coverage:** Job listings interface, empty state
- **Baseline:** `jobs-tab-desktop`

#### Outputs Tab - Layout
- **Viewport:** Desktop
- **Coverage:** Generated outputs interface
- **Baseline:** `outputs-tab-desktop`

#### Chat Component - Initial State
- **Viewport:** Desktop
- **Coverage:** Interactive chat interface, help system
- **Baseline:** `chat-component-desktop`

### 2. Theme Switching Tests

#### Theme - Light Mode
- **Viewport:** Desktop
- **Interaction:** Toggle theme button click
- **Coverage:** Full UI in light theme mode
- **Baseline:** `theme-light-desktop`
- **Notes:** Tests theme consistency across all components

### 3. Modal and Dialog Tests

#### Settings Modal - Open
- **Viewport:** Desktop
- **Interaction:** Click settings button
- **Coverage:** Modal overlay, settings form, connection status
- **Baseline:** `settings-modal-open-desktop`
- **Notes:** Tests modal positioning and content display

### 4. Sidebar Interaction Tests

#### Sidebar - Collapsed State
- **Viewport:** Desktop
- **Interaction:** Click sidebar toggle
- **Coverage:** Collapsed sidebar, main content expansion
- **Baseline:** `sidebar-collapsed-desktop`

#### Sidebar - Expanded State
- **Viewport:** Desktop
- **Coverage:** Default sidebar state with navigation
- **Baseline:** `sidebar-expanded-desktop`

### 5. Form and Input Tests

#### Bio Form - Empty State
- **Viewport:** Desktop
- **Interaction:** Click "Add Bio" button
- **Coverage:** Empty form fields, validation hints
- **Baseline:** `bio-form-empty-desktop`
- **Notes:** Tests form layout and initial state

#### Chat Input - Focus State
- **Viewport:** Desktop
- **Interaction:** Focus chat input field
- **Coverage:** Input focus styling, placeholder text
- **Baseline:** `chat-input-focused-desktop`
- **Notes:** Tests focus indicators and accessibility

### 6. Component Interaction Tests

#### Chat - Help Badge Interaction
- **Viewport:** Desktop
- **Coverage:** Help badge visibility and positioning
- **Baseline:** `chat-help-badge-desktop`
- **Notes:** Tests help system UI elements

### 7. Responsive Design Tests

#### Dashboard - Mobile Responsive
- **Viewport:** Mobile (375x667)
- **Coverage:** Mobile layout, navigation adaptation
- **Baseline:** `dashboard-mobile`

#### Dashboard - Tablet Responsive
- **Viewport:** Tablet (768x1024)
- **Coverage:** Tablet layout, responsive breakpoints
- **Baseline:** `dashboard-tablet`

#### Bio Tab - Mobile Responsive
- **Viewport:** Mobile (375x667)
- **Coverage:** Bio management on mobile
- **Baseline:** `bio-tab-mobile`

#### Jobs Tab - Mobile Responsive
- **Viewport:** Mobile (375x667)
- **Coverage:** Job listings on mobile
- **Baseline:** `jobs-tab-mobile`

#### Interactive Tab - Tablet Responsive
- **Viewport:** Tablet (768x1024)
- **Coverage:** Chat interface on tablet
- **Baseline:** `interactive-tab-tablet`

## Running Visual Tests

### Standard Mode (Compare against baselines)
```bash
# Run visual regression tests
pnpm --filter @cv-builder/browser-automation test:visual

# Prerequisites
pnpm dev:all  # Terminal 1: Start API + Browser app
```

### Update Baselines Mode
```bash
# Update all baselines with new screenshots
UPDATE_BASELINES=true pnpm --filter @cv-builder/browser-automation test:visual
```

**⚠️ Warning:** Update baselines only when intentional UI changes are made. Always review diff images before updating.

### CI/CD Integration
```bash
# GitHub Actions automatically runs visual tests
# Generates PR comment with embedded visual diffs
# Uploads artifacts for failed comparisons
```

## Visual Comparison Thresholds

- **Standard Threshold:** 0.1% (VISUAL_THRESHOLDS.STANDARD)
- **Strict Threshold:** 0.05% (VISUAL_THRESHOLDS.STRICT)
- **Relaxed Threshold:** 0.2% (VISUAL_THRESHOLDS.RELAXED)

Most tests use the standard threshold, allowing minor anti-aliasing differences while catching real visual regressions.

## Test Execution Flow

```
1. Navigate to APP_URL
2. Wait for app container to load
3. Perform interaction (click, focus, hover)
4. Wait for UI stabilization (300-1000ms)
5. Capture screenshot at specified viewport
6. Compare against baseline using pixelmatch
7. Generate visual diff if differences detected
8. Report results (console + GitHub PR comment)
```

## Adding New Visual Tests

To add a new visual regression test:

```typescript
suite.test('Feature Name - State Description', async ({ assert }) => {
  // 1. Setup: Navigate and wait
  await client.navigate(APP_URL);
  await client.waitForSelector('.app-container');

  // 2. Interaction: Perform UI action
  await client.click('[data-element="button-name"]');
  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. Capture: Screenshot with proper naming
  const result = await client.screenshot({
    name: 'feature-state',
    viewport: 'desktop', // or 'mobile' or 'tablet'
    fullPage: true,
    path: 'temp/screenshots/visual-test',
  });

  assert.screenshotCaptured(result);

  // 4. Compare: Match against baseline
  await visual.matchesBaseline(result.path, 'feature-state-desktop', {
    threshold: VISUAL_THRESHOLDS.STANDARD,
    updateBaseline: UPDATE_BASELINES,
  });
});
```

## Best Practices

### Naming Conventions
- **Test names:** `Component - State` (e.g., "Settings Modal - Open")
- **Screenshot names:** `component-state` (e.g., "settings-modal-open")
- **Baseline names:** `component-state-viewport` (e.g., "settings-modal-open-desktop")

### Stabilization Waits
- Use explicit waits after interactions (300-1000ms)
- Accounts for CSS transitions, animations
- Ensures consistent screenshots

### Element Existence Checks
- Always check if optional elements exist before interacting
- Gracefully skip tests if elements not found
- Log skip reasons for debugging

### Cleanup Between Tests
- Close modals/dialogs after capturing
- Reset to initial state for next test
- Prevents test interference

## Troubleshooting

### Test Failures
1. **Check diff images:** `temp/test-results/visual-diffs/`
2. **Review console output:** Look for element not found warnings
3. **Verify app is running:** Both API and browser app must be active
4. **Check viewport:** Ensure correct viewport is set

### Baseline Mismatches
1. **Intentional UI changes:** Update baselines
2. **Font rendering differences:** May need threshold adjustment
3. **Dynamic content:** Consider masking areas with timestamps/IDs
4. **Animation timing:** Increase stabilization wait

## CI/CD Artifacts

On test failure, GitHub Actions uploads:
- **Baseline images:** Expected screenshots
- **Current images:** Actual screenshots from test run
- **Diff images:** Pixel-by-pixel comparison with highlights
- **PR comment:** Markdown report with embedded images

Access artifacts via GitHub Actions workflow run page.

## Coverage Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| Layout & Navigation | 5 | All main tabs and components |
| Theme | 1 | Light/dark mode switching |
| Modals | 1 | Settings modal |
| Sidebar | 2 | Expanded/collapsed states |
| Forms | 2 | Bio form, chat input |
| Component States | 1 | Help badges |
| Responsive | 5 | Mobile, tablet, desktop |
| **Total** | **18** | **Comprehensive UI coverage** |

## Future Enhancements

Planned additions:
- [ ] Error state visualizations
- [ ] Loading state animations
- [ ] Hover state captures (requires Playwright hover)
- [ ] Multi-step interaction flows (form filling)
- [ ] Accessibility contrast checks
- [ ] Cross-browser comparison (Chrome, Firefox, Safari)
