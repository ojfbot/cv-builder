# Draw.io Templates for Visual Regression Testing

This directory contains canonical Draw.io templates for documenting UI interaction flows and generating automated visual regression tests.

## Available Templates

### 1. **Form Interaction** (`form-interaction.drawio`)
Documents form filling, validation, and submission flows.

**Use for**:
- Registration forms
- Login pages
- Contact forms
- Profile editing

**Nodes**: 6 (form, inputs, validation, submission)
**Screenshots**: 6

---

### 2. **Modal Dialog Flow** (`modal-dialog-flow.drawio`)
Documents modal opening, interaction, and closing.

**Use for**:
- Settings modals
- Confirmation dialogs
- Image lightboxes
- Popups

**Nodes**: 5 (trigger, modal, interaction, close)
**Screenshots**: 4

---

### 3. **Source Diagram** (`cvBuilder.drawio.xml`)
Original CV Builder UI flow diagram (6.2 MB) used for pattern detection research.

**Stats**:
- 27 nodes parsed
- 13 edges
- 9 screenshot points detected

---

## Custom Shape Library

**File**: `custom-shapes.xml`

Import this library in Draw.io (**File → Open Library**) to access custom shapes:

- **ScreenshotPoint** (purple ellipse) - Marks screenshot locations
- **UserAction** (yellow process) - User interactions
- **StateAssertion** (red hexagon) - Expected UI states
- **ViewportMarker** (blue dashed) - Viewport indicators

---

## Template Metadata

Each template includes:
- `.drawio` - Editable Draw.io diagram
- `-schema.json` - Parsed schema (nodes, edges, patterns)
- `-metadata.json` - Template info and few-shot examples

---

## Quick Start

### 1. Use an Existing Template

```bash
# Copy template
cp templates/drawio/form-interaction.drawio my-flow.drawio

# Edit in Draw.io
open my-flow.drawio

# Parse to validate
pnpm exec tsx src/drawio/test-parser.ts
```

### 2. Create from Scratch

```bash
# Import custom shapes
# In Draw.io: File → Open Library → custom-shapes.xml

# Follow labeling conventions:
# - Actions: "user clicks Bio tab button"
# - States: "Modal shown"
# - Screenshots: "Dashboard (desktop)"
```

### 3. Generate Templates

```bash
# Re-generate all templates
pnpm exec tsx src/drawio/export-templates.ts
```

---

## Labeling Conventions

### ✅ Good Labels

- "user clicks Bio tab button" (action)
- "user types email into login field" (type interaction)
- "Sidebar expanded" (state change)
- "Dashboard layout (desktop)" (screenshot)

### ❌ Bad Labels

- "Bio tab" (ambiguous - component or action?)
- "click" (missing subject)
- "user does something" (vague)

---

## Schema Validation

Templates are automatically validated against the Draw.io UI Schema:

```typescript
interface DrawioUISchema {
  version: string;
  nodes: DrawioNode[];     // Parsed UI elements
  edges: DrawioEdge[];     // Flow connections
  patterns: DetectedPattern[];  // Auto-detected patterns
  metadata: SchemaMetadata;
}
```

See [DRAWIO_SCHEMA.md](../../docs/DRAWIO_SCHEMA.md) for full specification.

---

## Few-Shot Prompting

Templates include few-shot examples for AI-assisted flow generation:

```json
{
  "input": "User clicks Settings button",
  "output": {
    "type": "action",
    "interaction": { "type": "click", "target": "settings-button" },
    "screenshotConfig": { "viewport": "desktop", "captureAt": "both" }
  },
  "explanation": "Button clicks require before/after screenshots"
}
```

---

## Contributing

To add a new template:

1. Create flow in Draw.io
2. Follow labeling conventions
3. Test with parser: `pnpm exec tsx src/drawio/test-parser.ts`
4. Add few-shot examples to template generator
5. Document use cases in this README
6. Submit PR

---

## See Also

- [Draw.io Schema Documentation](../../docs/DRAWIO_SCHEMA.md)
- [Pattern Detection Rules](../../docs/PATTERN_DETECTION.md)
- [Template Usage Guide](../../docs/TEMPLATE_USAGE.md)
