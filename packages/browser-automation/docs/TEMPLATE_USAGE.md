# Draw.io Template Usage Guide

**Version**: 1.0.0
**Last Updated**: 2025-12-14

## Overview

This guide explains how to use the canonical Draw.io templates for documenting UI flows and generating automated visual regression tests.

## Available Templates

### 1. Form Interaction Template

**File**: `templates/drawio/form-interaction.drawio`

**Use Cases**:
- User registration flows
- Login forms
- Contact forms
- Profile editing
- File upload interfaces

**Expected Screenshots**: 6
- Initial form state
- After each input field filled
- Form validation errors
- Successful submission

**Example Flow**:
1. User views empty form
2. User types name → Screenshot
3. User types email → Screenshot
4. User clicks Submit → Screenshot
5. Validation error shown → Screenshot

---

### 2. Modal Dialog Template

**File**: `templates/drawio/modal-dialog-flow.drawio`

**Use Cases**:
- Settings modals
- Confirmation dialogs
- Delete confirmations
- Image lightboxes
- Popup notifications

**Expected Screenshots**: 4
- Page before modal
- Modal opened
- Modal interaction
- Modal closed

**Example Flow**:
1. User views main page
2. User clicks Settings button
3. Settings modal opens → Screenshot
4. User changes setting
5. User closes modal → Screenshot

---

## Using Templates

### Method 1: Copy and Modify

1. Copy template to your workspace:
   ```bash
   cp templates/drawio/form-interaction.drawio my-flow.drawio
   ```

2. Open in Draw.io (desktop or web)

3. Edit labels to match your UI:
   - Replace "name field" with actual field name
   - Update button labels
   - Add/remove steps as needed

4. Save and commit to repo

---

### Method 2: Import Custom Shapes

1. In Draw.io, go to **File → Open Library**

2. Select `templates/drawio/custom-shapes.xml`

3. Drag shapes from library onto canvas:
   - **ScreenshotPoint** (purple ellipse): Mark screenshot locations
   - **UserAction** (yellow process): User interactions
   - **StateAssertion** (red hexagon): Expected states
   - **ViewportMarker** (blue dashed): Viewport indicators

---

### Method 3: Start from Scratch

1. Create new Draw.io diagram

2. Use swimlanes for organization:
   ```
   ┌─────────────────────────────┐
   │ Page: Dashboard             │
   ├─────────────────────────────┤
   │ [Component] Header          │
   │ [Action] User clicks Bio    │
   │ [State] Bio panel shown     │
   └─────────────────────────────┘
   ```

3. Connect nodes with arrows to show flow

4. Add labels following conventions (see below)

---

## Labeling Conventions

### Action Nodes

**Format**: `user {verb} {target} {modifier}`

**Examples**:
- ✅ "user clicks Bio tab button"
- ✅ "user types email into login field"
- ✅ "user navigates to Settings page"
- ❌ "click Bio" (missing subject)
- ❌ "Bio tab clicked" (passive voice)

### Screenshot Nodes

**Format**: `{component name} ({viewport})`

**Examples**:
- ✅ "Dashboard layout (desktop)"
- ✅ "Bio panel (mobile)"
- ✅ "Settings modal (tablet)"

### State Nodes

**Format**: `{component} {state}`

**Examples**:
- ✅ "Sidebar expanded"
- ✅ "Modal shown"
- ✅ "Error message visible"

---

## Annotation Best Practices

### Add Metadata

Use Draw.io's custom properties to add metadata:

1. Right-click node → **Edit Data**
2. Add key-value pairs:
   ```
   selector: #bio-tab
   viewport: desktop
   threshold: 0.1
   ```

### Document Selectors

Add CSS selectors as annotations:

```
[Action] user clicks Bio tab
Selector: [data-testid="bio-tab-button"]
```

### Specify Wait Conditions

Document timing requirements:

```
[State] Data loaded
Wait: networkIdle
Timeout: 5000ms
```

---

## Few-Shot Prompting Examples

Templates include few-shot examples for AI-assisted flow generation.

### Example 1: Click Interaction

**Input**: "User clicks Settings button"

**Expected Output**:
```json
{
  "type": "action",
  "interaction": {
    "type": "click",
    "target": "settings-button"
  },
  "screenshotConfig": {
    "viewport": "desktop",
    "captureAt": "both"
  }
}
```

**Explanation**: Button clicks require before/after screenshots to capture the state change.

### Example 2: Form Input

**Input**: "User enters email address"

**Expected Output**:
```json
{
  "type": "action",
  "interaction": {
    "type": "type",
    "target": "email-field",
    "value": "user@example.com"
  },
  "screenshotConfig": {
    "viewport": "desktop",
    "captureAt": "after"
  }
}
```

**Explanation**: Input actions capture the filled state.

---

## Validation

### Check Template Compliance

Run parser to validate your diagram:

```bash
pnpm exec tsx src/drawio/test-parser.ts
```

Expected output:
- ✅ All nodes parsed successfully
- ✅ Patterns detected with >60% confidence
- ✅ No fatal errors

### Common Issues

**Issue**: "Node type ambiguous"
**Fix**: Add explicit keywords (e.g., "user clicks" instead of just "clicks")

**Issue**: "Screenshot config missing"
**Fix**: Add viewport indicator or use `screenshot` keyword

**Issue**: "Low confidence pattern"
**Fix**: Follow labeling conventions more strictly

---

## Integration with Tests

### Auto-Generate Test Code

From parsed schema, generate Playwright test:

```typescript
// Generated from: my-flow.drawio
test('Bio tab interaction flow', async ({ page }) => {
  // Step 1: Navigate to dashboard
  await page.goto('/dashboard');

  // Step 2: Click Bio tab (from action node)
  await page.click('[data-testid="bio-tab-button"]');

  // Step 3: Verify Bio panel shown (from state node)
  await expect(page.locator('[data-testid="bio-panel"]')).toBeVisible();

  // Step 4: Capture screenshot (from screenshot node)
  await expect(page).toHaveScreenshot('bio-panel-desktop.png');
});
```

### Update Baselines

When UI changes intentionally:

1. Update Draw.io diagram
2. Re-run screenshot capture
3. Review diffs
4. Commit updated baselines

---

## Contributing Templates

### Creating New Templates

1. Design flow in Draw.io
2. Test with parser (`test-parser.ts`)
3. Add few-shot examples
4. Document use cases
5. Submit PR with template

### Template Quality Checklist

- [ ] Clear, descriptive labels
- [ ] Consistent naming conventions
- [ ] All actions have interaction types
- [ ] Screenshot points defined
- [ ] Few-shot examples included
- [ ] Parses without errors
- [ ] Generates >3 patterns with >60% confidence

---

## See Also

- [Draw.io Schema](./DRAWIO_SCHEMA.md)
- [Pattern Detection](./PATTERN_DETECTION.md)
- [Screenshot Capture](./SCREENSHOT_CAPTURE.md)
