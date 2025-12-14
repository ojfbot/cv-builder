# Draw.io Schema for UI State Documentation

**Version**: 1.0.0
**Last Updated**: 2025-12-14

## Overview

This document specifies the schema for documenting UI states, user interactions, and screenshot points in Draw.io diagrams. The schema enables automated visual regression testing by providing a structured, machine-readable format for UI flow documentation.

## Table of Contents

- [Purpose](#purpose)
- [Core Concepts](#core-concepts)
- [Node Types](#node-types)
- [Interaction Types](#interaction-types)
- [Screenshot Configuration](#screenshot-configuration)
- [State Assertions](#state-assertions)
- [Metadata Structure](#metadata-structure)
- [Examples](#examples)
- [JSON Schema](#json-schema)

---

## Purpose

The Draw.io schema serves three primary purposes:

1. **Self-Documenting UI Flows**: Visual diagrams that humans can read and understand
2. **Automated Test Generation**: Machine-readable specifications for screenshot capture
3. **Visual Regression Testing**: Deterministic mapping of UI states to baseline images

### Why Draw.io?

- ✅ **Visual and intuitive** - Non-technical stakeholders can understand flows
- ✅ **Editable offline** - No cloud dependency
- ✅ **Version controlled** - Track changes in git
- ✅ **Extensible** - Custom shapes and metadata
- ✅ **Cross-platform** - Desktop app + web editor

---

## Core Concepts

### 1. Nodes

Nodes represent elements in the UI flow:

```typescript
interface DrawioNode {
  id: string;                    // Unique identifier
  type: DrawioNodeType;          // page | component | action | state | screenshot
  label: string;                 // Human-readable description
  metadata: NodeMetadata;        // Draw.io-specific data
  screenshotConfig?: ScreenshotConfig;  // Screenshot settings
  interaction?: InteractionConfig;      // User action details
  assertions?: StateAssertion[];        // Expected UI state
  confidence?: number;                  // Pattern detection confidence (0-1)
}
```

### 2. Edges

Edges connect nodes to show flow:

```typescript
interface DrawioEdge {
  id: string;
  source: string;     // Source node ID
  target: string;     // Target node ID
  label?: string;     // Transition description
}
```

### 3. Patterns

Detected patterns from heuristic analysis:

```typescript
interface DetectedPattern {
  type: 'navigation' | 'interaction' | 'state-change' | 'screenshot-point';
  nodes: string[];            // Node IDs involved
  confidence: number;         // Detection confidence (0-1)
  data: PatternData;          // Pattern-specific information
  reasoning?: string;         // Why this pattern was detected
}
```

---

## Node Types

### `page`

Top-level page container.

**Example Labels**:
- "Dashboard Page"
- "Settings Page"
- "Login Screen"

**Usage**: Represents a complete application page or route.

---

### `component`

UI component within a page.

**Example Labels**:
- "Header Navigation"
- "Sidebar Menu"
- "Bio Tab Panel"
- "File Upload Modal"

**Usage**: Represents reusable or distinct UI elements.

---

### `action`

User interaction that triggers a change.

**Example Labels**:
- "user clicks Bio tab button"
- "user types email into login field"
- "user navigates to Settings page"

**Detection Keywords**: `user`, `click`, `type`, `navigate`, `select`

**Associated Data**:
```typescript
interaction: {
  type: 'click' | 'type' | 'navigation' | 'hover' | 'focus' | 'scroll' | 'drag';
  target?: string;      // CSS selector or element name
  value?: string;       // Input value (for type actions)
  description?: string;
}
```

---

### `state`

UI state change (not directly triggered by user).

**Example Labels**:
- "Modal opened"
- "Sidebar expanded"
- "Form validation error shown"

**Detection Keywords**: `expand`, `collapse`, `show`, `hide`, `enable`, `disable`

**Associated Data**:
```typescript
assertions: [{
  selector: string;           // Element to verify
  expected: {
    visible?: boolean;
    text?: string;
    attribute?: Record<string, string>;
    style?: Record<string, string>;
    count?: number;
  };
  description?: string;
}]
```

---

### `screenshot`

Explicit screenshot capture marker.

**Example Labels**:
- "Screenshot: Dashboard (desktop)"
- "Capture Bio tab layout"
- "Mobile view: Expanded sidebar"

**Detection Keywords**: `screenshot`, `capture`, `viewport`, `desktop`, `mobile`, `tablet`

**Associated Data**:
```typescript
screenshotConfig: {
  viewport: 'desktop' | 'mobile' | 'tablet' | 'wide';
  selector?: string;      // Element to screenshot (null = full page)
  captureAt: 'before' | 'after' | 'both';
  threshold?: number;     // Visual diff threshold (default: 0.001)
}
```

---

### `annotation`

Documentation notes (not executed).

**Example Labels**:
- "Note: This flow requires authentication"
- "TODO: Add error handling"

**Usage**: Supplementary information for developers.

---

### `container`

Generic grouping element (swimlane, group).

**Usage**: Organizes related nodes visually.

---

## Interaction Types

### `navigation`

Page or route transitions.

**Triggers**:
- Clicking nav links
- URL changes
- Route redirects

**Example**:
```typescript
{
  type: 'navigation',
  target: '/bio',
  description: 'Navigate to Bio page'
}
```

---

### `click`

Click interactions on buttons, links, etc.

**Triggers**:
- Button clicks
- Link clicks
- Checkbox toggles

**Example**:
```typescript
{
  type: 'click',
  target: 'bio-tab-button',
  description: 'Click Bio tab'
}
```

---

### `type`

Text input interactions.

**Triggers**:
- Typing in input fields
- Textarea content
- ContentEditable elements

**Example**:
```typescript
{
  type: 'type',
  target: 'email-field',
  value: 'user@example.com',
  description: 'Enter email'
}
```

---

### `hover`

Mouse hover interactions.

**Example**:
```typescript
{
  type: 'hover',
  target: 'tooltip-trigger',
  description: 'Hover to show tooltip'
}
```

---

## Screenshot Configuration

### Viewport Presets

Predefined viewport configurations:

```typescript
const VIEWPORT_PRESETS = {
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
  },
  desktop: {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
  },
  wide: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  },
};
```

### Capture Timing

- **`before`**: Capture screenshot before action executes
- **`after`**: Capture screenshot after action executes
- **`both`**: Capture before and after (useful for transitions)

### Threshold Configuration

Visual comparison thresholds:

- **`0` (PIXEL_PERFECT)**: Exact match required
- **`0.01` (STRICT)**: 0.01% pixel difference allowed
- **`0.1` (STANDARD)**: 0.1% pixel difference (default)
- **`0.25` (LENIENT)**: 0.25% pixel difference
- **`0.5` (PERMISSIVE)**: 0.5% pixel difference

---

## State Assertions

Verify expected UI state after actions:

```typescript
interface StateAssertion {
  selector: string;           // CSS selector
  expected: {
    visible?: boolean;        // Element visibility
    text?: string;            // Text content
    attribute?: Record<string, string>;  // HTML attributes
    style?: Record<string, string>;      // CSS styles
    count?: number;           // Number of matching elements
  };
  description?: string;
}
```

### Example: Modal Visibility

```typescript
{
  selector: '.settings-modal',
  expected: {
    visible: true,
    attribute: { 'aria-hidden': 'false' },
  },
  description: 'Settings modal is shown'
}
```

### Example: Form Validation

```typescript
{
  selector: '.error-message',
  expected: {
    visible: true,
    text: 'Email is required',
  },
  description: 'Validation error displayed'
}
```

---

## Metadata Structure

### Node Metadata

```typescript
interface NodeMetadata {
  style?: string;               // Draw.io style string
  parentId?: string;            // Parent node ID
  children?: string[];          // Child node IDs
  geometry?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  customData?: Record<string, unknown>;  // Custom attributes
}
```

### Schema Metadata

```typescript
interface SchemaMetadata {
  version: string;              // Schema version (1.0.0)
  createdAt: string;            // ISO 8601 timestamp
  sourceFile?: string;          // Original Draw.io filename
  gitCommit?: string;           // Git commit hash
  [key: string]: unknown;       // Additional metadata
}
```

---

## Examples

### Example 1: Simple Click Action

**Draw.io Label**: `user clicks Bio tab button`

**Parsed Schema**:
```json
{
  "id": "action-1",
  "type": "action",
  "label": "user clicks Bio tab button",
  "interaction": {
    "type": "click",
    "target": "bio-tab-button",
    "description": "user clicks Bio tab button"
  },
  "screenshotConfig": {
    "viewport": "desktop",
    "captureAt": "both"
  },
  "confidence": 0.9
}
```

---

### Example 2: Form Input

**Draw.io Label**: `user types "john@example.com" into email field`

**Parsed Schema**:
```json
{
  "id": "action-2",
  "type": "action",
  "label": "user types \"john@example.com\" into email field",
  "interaction": {
    "type": "type",
    "target": "email-field",
    "value": "john@example.com"
  },
  "screenshotConfig": {
    "viewport": "desktop",
    "captureAt": "after"
  },
  "confidence": 0.9
}
```

---

### Example 3: State Change with Assertion

**Draw.io Label**: `Sidebar expanded`

**Parsed Schema**:
```json
{
  "id": "state-1",
  "type": "state",
  "label": "Sidebar expanded",
  "assertions": [{
    "selector": "[data-testid='sidebar']",
    "expected": {
      "visible": true,
      "attribute": {
        "aria-expanded": "true"
      }
    },
    "description": "Sidebar is expanded"
  }],
  "screenshotConfig": {
    "viewport": "desktop",
    "captureAt": "after"
  },
  "confidence": 0.7
}
```

---

## JSON Schema

Complete JSON Schema for validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DrawioUISchema",
  "type": "object",
  "required": ["version", "nodes", "edges", "metadata"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "nodes": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/DrawioNode"
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/DrawioEdge"
      }
    },
    "patterns": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/DetectedPattern"
      }
    },
    "metadata": {
      "$ref": "#/definitions/SchemaMetadata"
    }
  },
  "definitions": {
    "DrawioNode": {
      "type": "object",
      "required": ["id", "type", "label", "metadata"],
      "properties": {
        "id": { "type": "string" },
        "type": {
          "enum": ["page", "component", "action", "state", "screenshot", "annotation", "container"]
        },
        "label": { "type": "string" },
        "rawLabel": { "type": "string" },
        "metadata": { "$ref": "#/definitions/NodeMetadata" },
        "screenshotConfig": { "$ref": "#/definitions/ScreenshotConfig" },
        "interaction": { "$ref": "#/definitions/InteractionConfig" },
        "assertions": {
          "type": "array",
          "items": { "$ref": "#/definitions/StateAssertion" }
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      }
    }
  }
}
```

---

## See Also

- [Pattern Detection Guide](./PATTERN_DETECTION.md)
- [Template Usage Guide](./TEMPLATE_USAGE.md)
- [Screenshot Capture Pipeline](./SCREENSHOT_CAPTURE.md)

---

**Contributors**: Claude Code
**License**: MIT
