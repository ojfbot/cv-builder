# Pattern Detection Heuristics

**Version**: 1.0.0
**Last Updated**: 2025-12-14

## Overview

The Pattern Detector uses heuristic rules to automatically identify UI interaction patterns from Draw.io node labels. This enables zero-configuration schema generation from existing diagrams.

## Detection Rules

### Navigation Patterns

**Confidence**: High (0.8)

**Keywords**: `navigate`, `go to`, `open`, `switch to`, `route to`, `redirect`

**Example Labels**:
- "user navigates to Bio page"
- "go to Settings"
- "switch to Jobs tab"

**Extracted Data**:
```typescript
{
  type: 'navigation',
  interaction: {
    type: 'navigation',
    target: 'bio-page'  // Extracted from label
  }
}
```

---

### Click Interactions

**Confidence**: High (0.8)

**Keywords**: `click`, `press`, `tap`, `select`, `choose`

**Example Labels**:
- "user clicks Bio tab button"
- "press Submit"
- "tap on Settings icon"

**Extracted Data**:
```typescript
{
  type: 'interaction',
  interaction: {
    type: 'click',
    target: 'bio-tab-button'
  }
}
```

---

### Type Interactions

**Confidence**: High (0.8)

**Keywords**: `type`, `enter`, `input`, `fill`, `write`

**Example Labels**:
- "user types email into login field"
- "enter 'John Doe' in name field"
- "input password"

**Extracted Data**:
```typescript
{
  type: 'interaction',
  interaction: {
    type: 'type',
    target: 'email-field',
    value: 'user@example.com'  // Extracted if present
  }
}
```

---

### State Changes

**Confidence**: Medium (0.6)

**Keywords**: `expand`, `collapse`, `toggle`, `show`, `hide`, `enable`, `disable`, `open`, `close`

**Example Labels**:
- "user expands sidebar"
- "modal shown"
- "error message hidden"

**Extracted Data**:
```typescript
{
  type: 'state-change',
  assertions: [{
    selector: '[data-testid="sidebar"]',
    expected: { visible: true }
  }]
}
```

---

### Screenshot Points

**Confidence**: High (0.8) for explicit, Medium (0.6) for implicit

**Keywords**: `screenshot`, `capture`, `viewport`, `desktop`, `mobile`, `tablet`

**Example Labels**:
- "Screenshot: Dashboard (desktop)"
- "Capture mobile view"
- Component nodes with geometry >50x50px (implicit)

**Extracted Data**:
```typescript
{
  type: 'screenshot-point',
  screenshotConfig: {
    viewport: 'desktop',
    captureAt: 'after'
  }
}
```

---

## Confidence Scoring

Base confidence from pattern matching:
- **High (0.8-1.0)**: Clear keyword match, unambiguous intent
- **Medium (0.6-0.8)**: Probable match, some ambiguity
- **Low (0.4-0.6)**: Possible match, needs validation
- **Below threshold (<0.4)**: Rejected

Confidence boosters:
- **+0.1**: Pattern has target specified
- **+0.1**: Pattern has assertions defined
- **+0.05**: Pattern has screenshot config

---

## Extraction Patterns

### Target Extraction

Pattern: `{action} [target] {modifier}`

Examples:
- "click **Bio tab** button" → `bio-tab`
- "type into **email field**" → `email-field`
- "navigate to **Settings page**" → `settings-page`

### Value Extraction

Pattern: `type '{value}' into {target}`

Examples:
- "type **'john@example.com'** into email" → `john@example.com`
- "enter **'password123'**" → `password123`

### Viewport Extraction

Pattern: `{label} ({viewport})`

Examples:
- "Dashboard **(desktop)**" → `desktop`
- "Mobile view **(tablet)**" → `tablet`

---

## False Positive Handling

### Ambiguous Labels

**Problem**: "Submit button"
- Could be component (static) or action (click)

**Solution**: Check node type classification first
- If `type === 'component'` → Screenshot point
- If `type === 'action'` → Click interaction

### Multi-Match Keywords

**Problem**: "User expands modal and clicks button"
- Matches both state-change and click patterns

**Solution**: Split into multiple actions or choose highest confidence

---

## Extending Detection

### Adding Custom Rules

```typescript
const customRule: PatternRule = {
  type: 'interaction',
  keywords: ['drag', 'drop', 'swipe'],
  confidence: 0.7,
};
```

### ML-Based Detection (Future)

Future enhancement: Train classifier on labeled examples
- Input: Node label + context
- Output: Pattern type + confidence
- Dataset: Existing templates

---

## Testing Patterns

Run pattern detector on test files:

```bash
pnpm exec tsx src/drawio/test-parser.ts
```

Review detected patterns in output:
```json
{
  "type": "interaction",
  "nodes": ["node-id"],
  "confidence": 0.9,
  "reasoning": "Matched click interaction keywords"
}
```

---

## See Also

- [Draw.io Schema](./DRAWIO_SCHEMA.md)
- [Template Usage](./TEMPLATE_USAGE.md)
