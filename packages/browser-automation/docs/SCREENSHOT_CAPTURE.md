# Screenshot Capture Pipeline

**Version**: 1.0.0
**Status**: ✅ Complete (Sub-Issue #73)
**Dependencies**: Draw.io Schema (#72), Visual Regression System (existing)

This document describes the screenshot capture and metadata generation pipeline for Draw.io-driven visual regression testing.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Metadata Schema](#metadata-schema)
5. [Capture Flow](#capture-flow)
6. [Integration](#integration)
7. [Usage Examples](#usage-examples)
8. [Validation](#validation)

---

## Overview

The screenshot capture pipeline executes user interactions defined in Draw.io diagrams and captures screenshots at specified points, generating comprehensive metadata for visual regression testing.

**Key Features**:

- **Automated Interaction Execution**: Supports navigation, clicks, typing, hover, focus, scroll
- **Flexible Screenshot Timing**: Capture before/after/both for each interaction
- **Comprehensive Metadata**: Git commits, timestamps, viewport configs, state assertions
- **Visual Regression Integration**: Automatic baseline comparison with existing system
- **State Verification**: Assert expected UI states after interactions
- **Multi-Viewport Support**: Desktop, mobile, tablet, wide presets

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Screenshot Orchestrator                   │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ Initialize │→ │ Execute Flow │→ │ Generate Manifest│    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌─────────────────┐                  ┌──────────────────┐
│ Interaction     │                  │ Metadata         │
│ Executor        │                  │ Generator        │
│                 │                  │                  │
│ - executeNode() │                  │ - screenshot     │
│ - captureState()│                  │ - interaction    │
│ - assertions()  │                  │ - manifest       │
└─────────────────┘                  └──────────────────┘
        ↓                                       ↓
┌─────────────────────────────────────────────────────────┐
│              Baseline Manager & Comparison Engine       │
│  - Create/retrieve baselines                            │
│  - Pixel-perfect comparison                             │
│  - Diff image generation                                │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Metadata Generator

**File**: `src/drawio/metadata.ts` (300 LOC)

Generates comprehensive metadata for screenshots and test runs.

**Key Types**:

```typescript
interface ScreenshotMetadata {
  nodeId: string;                    // Draw.io node ID
  stepNumber: number;                // Execution sequence
  interactionType: InteractionType;  // Type of interaction
  timestamp: string;                 // ISO 8601 timestamp
  viewport: ViewportConfig;          // Viewport configuration
  screenshotPath: string;            // Relative path to screenshot
  baselinePath?: string;             // Path to baseline (if exists)
  diffPath?: string;                 // Path to diff image (if failed)
  selector?: string | null;          // Element selector (null = full page)
  expectedState?: StateAssertion[];  // Expected UI state
  actualState?: CapturedState;       // Actual captured state
  passed: boolean;                   // Visual regression result
  diffPercentage?: number;           // % of different pixels
  diffPixels?: number;               // Count of different pixels
  gitCommit?: string;                // Git SHA for traceability
  captureAt: 'before' | 'after';     // Capture timing
}
```

**Methods**:

- `generateScreenshotMetadata()` - Create metadata for single screenshot
- `generateInteractionResult()` - Create result for interaction step
- `generateManifest()` - Create complete test manifest with summary

**Git Integration**:

The generator automatically captures the current git commit SHA for traceability:

```typescript
private getGitCommit(): string | undefined {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
}
```

---

### 2. Interaction Executor

**File**: `src/drawio/interaction-executor.ts` (400 LOC)

Executes user interactions defined in Draw.io nodes using Playwright.

**Supported Interactions**:

| Type       | Description                        | Required Fields         |
|------------|------------------------------------|-------------------------|
| navigation | Navigate to URL or click link      | `target` (URL/selector) |
| click      | Click element                      | `target` (selector)     |
| type       | Type text into input               | `target`, `value`       |
| hover      | Hover over element                 | `target` (selector)     |
| focus      | Focus element                      | `target` (selector)     |
| scroll     | Scroll to element or page bottom   | `target` (optional)     |
| drag       | Drag and drop (future)             | TBD                     |

**Execution Flow**:

```typescript
async executeNode(node: DrawioNode): Promise<void> {
  // 1. Execute interaction based on type
  switch (node.interaction.type) {
    case 'click': await this.executeClick(node); break;
    case 'type': await this.executeType(node); break;
    // ... more types
  }

  // 2. Wait for animations to settle (if enabled)
  if (this.options.waitForAnimations) {
    await this.page.waitForTimeout(this.options.animationSettleTime);
  }

  // 3. Verify state assertions (if defined)
  if (node.assertions) {
    await this.verifyAssertions(node.assertions);
  }
}
```

**State Capture**:

The executor can capture current UI state for verification:

```typescript
async captureState(selectors?: string[]): Promise<CapturedState> {
  return await this.page.evaluate((sels) => {
    const state: CapturedState = {
      visibleElements: [],
      textContent: {},
      attributes: {},
    };

    sels.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, idx) => {
        const key = `${selector}[${idx}]`;

        // Capture visibility
        if (el instanceof HTMLElement && el.offsetParent !== null) {
          state.visibleElements.push(key);
        }

        // Capture text content
        if (el.textContent) {
          state.textContent[key] = el.textContent.trim();
        }

        // Capture attributes
        const attrs: Record<string, string> = {};
        Array.from(el.attributes).forEach((attr) => {
          attrs[attr.name] = attr.value;
        });
        state.attributes[key] = attrs;
      });
    });

    return state;
  }, selectors);
}
```

**State Assertions**:

Verify expected UI states after interactions:

```typescript
interface StateAssertion {
  selector: string;
  expected: {
    visible?: boolean;           // Element visibility
    text?: string;               // Text content
    attribute?: Record<string, string>;  // HTML attributes
    count?: number;              // Element count
  };
}
```

Example:

```typescript
{
  selector: '.success-message',
  expected: {
    visible: true,
    text: 'Form submitted successfully',
    count: 1
  }
}
```

---

### 3. Screenshot Orchestrator

**File**: `src/drawio/screenshot-orchestrator.ts` (400 LOC)

Orchestrates the complete capture workflow: browser initialization, interaction execution, screenshot capture, baseline comparison, and manifest generation.

**Capture Options**:

```typescript
interface CaptureOptions {
  baseUrl: string;                  // Application URL
  outputDir: string;                // Screenshot output directory
  viewport?: 'desktop' | 'mobile' | ViewportConfig;
  compareWithBaselines?: boolean;   // Enable visual regression
  threshold?: number;               // Diff threshold (default: 0.001)
  headless?: boolean;               // Headless mode (default: true)
  browserType?: 'chromium' | 'firefox' | 'webkit';
  waitForAnimations?: boolean;      // Wait for animations (default: true)
  animationSettleTime?: number;     // Settle time in ms (default: 300)
}
```

**Complete Flow**:

```typescript
async captureFlow(schema: DrawioUISchema, options: CaptureOptions): Promise<CaptureResult> {
  const startTime = Date.now();

  // 1. Initialize browser and page
  await this.initialize(options);

  // 2. Set viewport and navigate to base URL
  const viewport = this.resolveViewport(options.viewport);
  await this.page!.setViewportSize({ width: viewport.width, height: viewport.height });
  await this.page!.goto(options.baseUrl, { waitUntil: 'networkidle' });

  // 3. Get action nodes in execution order
  const actionNodes = this.getActionNodes(schema);

  // 4. Execute interactions and capture screenshots
  const interactions: InteractionResult[] = [];
  for (const node of actionNodes) {
    const result = await this.captureInteraction(node, stepNumber++, options, viewport);
    interactions.push(result);
  }

  // 5. Generate manifest
  const duration = Date.now() - startTime;
  const manifest = this.metadataGenerator.generateManifest(
    schema.metadata.sourceFile || 'unknown',
    interactions,
    duration
  );

  // 6. Save manifest and cleanup
  const manifestPath = await this.saveManifest(manifest, options.outputDir);
  await this.cleanup();

  return { manifest, outputDir, manifestPath, passed: manifest.passed };
}
```

**Screenshot Capture**:

```typescript
private async captureScreenshot(
  node: DrawioNode,
  stepNumber: number,
  captureAt: 'before' | 'after',
  options: CaptureOptions,
  viewport: ViewportConfig
): Promise<ScreenshotMetadata> {
  // Generate filename: step-01-before-desktop.png
  const viewportName = this.getViewportName(viewport);
  const filename = `step-${String(stepNumber).padStart(2, '0')}-${captureAt}-${viewportName}.png`;
  const screenshotPath = path.join(options.outputDir, filename);

  // Capture screenshot (element or full page)
  const selector = node.screenshotConfig?.selector;
  if (selector) {
    const element = this.page!.locator(selector);
    await element.screenshot({ path: screenshotPath });
  } else {
    await this.page!.screenshot({ path: screenshotPath, fullPage: true });
  }

  // Generate metadata
  const metadata = this.metadataGenerator.generateScreenshotMetadata(
    node,
    stepNumber,
    filename,
    captureAt,
    viewport
  );

  // Compare with baseline if enabled
  if (options.compareWithBaselines) {
    await this.compareWithBaseline(metadata, screenshotPath, options);
  }

  return metadata;
}
```

**Baseline Comparison**:

Integrates with existing `BaselineManager` and `ComparisonEngine`:

```typescript
private async compareWithBaseline(
  metadata: ScreenshotMetadata,
  screenshotPath: string,
  options: CaptureOptions
): Promise<void> {
  const testSuite = 'drawio-flow';
  const screenshotName = path.basename(screenshotPath, '.png');

  // Create baseline if doesn't exist
  if (!this.baselineManager.hasBaseline(testSuite, screenshotName)) {
    console.log(`Creating baseline: ${screenshotName}`);
    await this.baselineManager.saveBaseline(testSuite, screenshotName, screenshotPath);
    metadata.passed = true;
    return;
  }

  // Get baseline and compare
  const baselinePath = this.baselineManager.getBaselinePath(testSuite, screenshotName);
  metadata.baselinePath = baselinePath;

  const result = await this.comparisonEngine.compare(baselinePath, screenshotPath, {
    threshold: options.threshold || 0.001,
    createDiffImage: true,
  });

  // Update metadata with results
  metadata.passed = result.passed;
  metadata.diffPercentage = result.diffPercentage;
  metadata.diffPixels = result.numDiffPixels;
  if (result.diffImagePath) {
    metadata.diffPath = result.diffImagePath;
  }

  // Log failures
  if (!result.passed) {
    console.warn(`Visual regression: ${screenshotName} failed (${result.diffPercentage.toFixed(2)}% diff)`);
  }
}
```

---

## Metadata Schema

### Screenshot Metadata

Complete metadata for each captured screenshot:

```json
{
  "nodeId": "form-2",
  "stepNumber": 1,
  "interactionType": "type",
  "timestamp": "2025-12-14T01:36:57.611Z",
  "viewport": {
    "width": 1280,
    "height": 720,
    "deviceScaleFactor": 1
  },
  "screenshotPath": "step-01-before-desktop.png",
  "baselinePath": "test-baselines/drawio-flow/step-01-before-desktop.png",
  "diffPath": "step-01-before-desktop-diff.png",
  "selector": null,
  "passed": true,
  "diffPercentage": 0.05,
  "diffPixels": 234,
  "gitCommit": "c7b32fe2ac2a4d353e402c9346aaf3ae6cf4b7ce",
  "nodeLabel": "user types name into name field",
  "captureAt": "before"
}
```

### Interaction Result

Result of executing a single interaction step:

```json
{
  "node": {
    "id": "form-2",
    "type": "action",
    "label": "user types name into name field",
    "interaction": {
      "type": "type",
      "target": "name into name",
      "description": "user types name into name field"
    },
    "confidence": 0.8
  },
  "stepNumber": 1,
  "success": true,
  "screenshots": [
    { /* ScreenshotMetadata before */ },
    { /* ScreenshotMetadata after */ }
  ],
  "duration": 450,
  "stateBefore": { /* CapturedState */ },
  "stateAfter": { /* CapturedState */ }
}
```

### Test Manifest

Complete manifest for entire test run:

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-12-14T01:36:57.672Z",
  "gitCommit": "c7b32fe2ac2a4d353e402c9346aaf3ae6cf4b7ce",
  "diagramSource": "form-interaction.drawio",
  "totalSteps": 5,
  "screenshotsCaptured": 10,
  "duration": 4523,
  "passed": true,
  "interactions": [
    { /* InteractionResult 1 */ },
    { /* InteractionResult 2 */ }
  ],
  "summary": {
    "totalPassed": 5,
    "totalFailed": 0,
    "totalScreenshots": 10,
    "averageDiffPercentage": 0.03
  }
}
```

---

## Capture Flow

### Step-by-Step Execution

1. **Parse Draw.io Diagram**
   ```typescript
   const xml = fs.readFileSync('my-flow.drawio', 'utf-8');
   const parseResult = parseDrawioXML(xml, 'my-flow.drawio');
   const patterns = detectPatterns(parseResult.schema);
   parseResult.schema.patterns = patterns;
   ```

2. **Configure Capture**
   ```typescript
   const captureOptions = {
     baseUrl: 'http://localhost:3000',
     outputDir: './screenshots/my-flow',
     viewport: 'desktop',
     compareWithBaselines: true,
     threshold: 0.001,
     headless: true,
     waitForAnimations: true,
     animationSettleTime: 500,
   };
   ```

3. **Execute Capture**
   ```typescript
   import { captureFlow } from './drawio/screenshot-orchestrator';

   const result = await captureFlow(parseResult.schema, captureOptions);

   console.log(`Manifest: ${result.manifestPath}`);
   console.log(`Passed: ${result.passed}`);
   console.log(`Screenshots: ${result.manifest.screenshotsCaptured}`);
   ```

4. **Review Results**
   - Screenshots: `./screenshots/my-flow/step-*.png`
   - Baselines: `./test-baselines/drawio-flow/*.png`
   - Diffs: `./screenshots/my-flow/*-diff.png` (if failed)
   - Manifest: `./screenshots/my-flow/manifest.json`

---

## Integration

### With Existing Visual Regression System

The screenshot orchestrator integrates seamlessly with the existing visual regression infrastructure:

```typescript
import { getBaselineManager } from '../visual/baseline-manager.js';
import { ComparisonEngine } from '../visual/comparison-engine.js';

export class ScreenshotOrchestrator {
  private baselineManager = getBaselineManager();
  private comparisonEngine = new ComparisonEngine();

  // Uses existing baseline storage and pixel comparison
}
```

**Baseline Structure**:
```
test-baselines/
  drawio-flow/
    step-01-before-desktop.png
    step-01-after-desktop.png
    step-02-before-desktop.png
    step-02-after-desktop.png
```

### With Draw.io Schema

The pipeline consumes Draw.io schemas from the parser:

```typescript
import { parseDrawioXML } from './drawio/parser.js';
import { detectPatterns } from './drawio/pattern-detector.js';
import { captureFlow } from './drawio/screenshot-orchestrator.js';

// Parse diagram
const parseResult = parseDrawioXML(xml, sourceFile);

// Detect patterns
const patterns = detectPatterns(parseResult.schema);
parseResult.schema.patterns = patterns;

// Execute capture
const result = await captureFlow(parseResult.schema, options);
```

### With CI/CD (Future)

The manifest structure is designed for CI/CD integration:

```yaml
# .github/workflows/visual-regression.yml
name: Visual Regression Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Visual Tests
        run: pnpm exec tsx src/drawio/test-capture-flow.ts
      - name: Upload Results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diffs
          path: temp/capture-test/*.png
```

---

## Usage Examples

### Example 1: Basic Form Flow

```typescript
import { captureFlow } from './drawio/screenshot-orchestrator';
import { parseDrawioXML } from './drawio/parser';
import { detectPatterns } from './drawio/pattern-detector';
import fs from 'fs';

// Parse diagram
const xml = fs.readFileSync('templates/drawio/form-interaction.drawio', 'utf-8');
const parseResult = parseDrawioXML(xml, 'form-interaction.drawio');
parseResult.schema.patterns = detectPatterns(parseResult.schema);

// Execute capture
const result = await captureFlow(parseResult.schema, {
  baseUrl: 'http://localhost:3000',
  outputDir: './screenshots/form-test',
  viewport: 'desktop',
  compareWithBaselines: true,
  threshold: 0.001,
});

console.log(`✅ Captured ${result.manifest.screenshotsCaptured} screenshots`);
console.log(`📊 ${result.manifest.summary.totalPassed} passed, ${result.manifest.summary.totalFailed} failed`);
```

### Example 2: Multi-Viewport Testing

```typescript
const viewports = ['mobile', 'tablet', 'desktop', 'wide'] as const;

for (const viewport of viewports) {
  const result = await captureFlow(parseResult.schema, {
    baseUrl: 'http://localhost:3000',
    outputDir: `./screenshots/${viewport}`,
    viewport,
    compareWithBaselines: true,
  });

  console.log(`${viewport}: ${result.passed ? '✅' : '❌'}`);
}
```

### Example 3: Custom Viewport

```typescript
const result = await captureFlow(parseResult.schema, {
  baseUrl: 'http://localhost:3000',
  outputDir: './screenshots/custom',
  viewport: {
    width: 2560,
    height: 1440,
    deviceScaleFactor: 2,
  },
  compareWithBaselines: true,
});
```

### Example 4: Headless vs Headed

```typescript
// Development: See browser interactions
const devResult = await captureFlow(parseResult.schema, {
  baseUrl: 'http://localhost:3000',
  outputDir: './screenshots/dev',
  headless: false,  // Show browser
  waitForAnimations: true,
  animationSettleTime: 1000,  // Longer settle time
});

// CI: Fast headless execution
const ciResult = await captureFlow(parseResult.schema, {
  baseUrl: 'http://localhost:3000',
  outputDir: './screenshots/ci',
  headless: true,
  waitForAnimations: false,  // Skip animation waits
});
```

---

## Validation

### E2E Test Results

The end-to-end test (`test-capture-flow.ts`) validates the complete pipeline:

```
🎬 Testing Screenshot Capture Pipeline

✅ Parsed 6 nodes, 5 edges
✅ Detected 6 patterns
✅ Captured 2 screenshots
✅ Generated manifest with complete metadata
✅ Baselines created successfully
✅ All 6 components validated

📦 Implementation Summary:
   - TypeScript schema (600 LOC)
   - XML parser (400 LOC)
   - Pattern detector (450 LOC)
   - Metadata generator (300 LOC)
   - Interaction executor (400 LOC)
   - Screenshot orchestrator (400 LOC)
   Total: ~2,550 LOC
```

### Component Validation

All components present and functional:

- ✅ **Schema types** (`schema.ts`) - Node/edge types, viewport presets
- ✅ **Parser** (`parser.ts`) - XML parsing, node classification
- ✅ **Pattern detector** (`pattern-detector.ts`) - Heuristic pattern detection
- ✅ **Metadata generator** (`metadata.ts`) - Screenshot/manifest metadata
- ✅ **Interaction executor** (`interaction-executor.ts`) - Playwright automation
- ✅ **Screenshot orchestrator** (`screenshot-orchestrator.ts`) - Complete workflow

### Metadata Validation

The `MetadataGenerator` includes validation:

```typescript
validate(metadata: ScreenshotMetadata): boolean {
  if (!metadata.nodeId) return false;
  if (!metadata.screenshotPath) return false;
  if (!metadata.timestamp) return false;
  if (!metadata.viewport) return false;
  return true;
}
```

---

## Next Steps

### Sub-Issue #74: Draw.io Screenshot Embedding

The next phase will embed captured screenshots back into Draw.io diagrams:

- Parse Draw.io XML
- Convert screenshots to base64
- Inject as `<mxCell>` image elements
- Maintain Draw.io structure
- Generate extended diagrams with embedded screenshots

### Sub-Issue #75: GitHub Gist PR Comments

Integrate with GitHub PR workflow:

- Upload screenshots to Gists
- Post comparison comments on PRs
- Link to baselines and diffs
- Track regression trends

### Sub-Issue #76: GitHub Pages Dashboard

Create lightweight dashboard:

- Display test runs over time
- Show screenshots with diff overlays
- Navigate interaction flows
- Filter by viewport/date/status

---

## See Also

- [Draw.io Schema Documentation](./DRAWIO_SCHEMA.md) - Complete schema specification
- [Pattern Detection Rules](./PATTERN_DETECTION.md) - Heuristic detection rules
- [Template Usage Guide](./TEMPLATE_USAGE.md) - Using Draw.io templates
- [Visual Regression Architecture](./VISUAL_REGRESSION_ARCHITECTURE.md) - Overall system design

---

**Completion**: Sub-Issue #73 ✅ COMPLETE
**Implementation**: 1,100 LOC (metadata, executor, orchestrator)
**Testing**: End-to-end validated with live application
**Documentation**: Comprehensive (this document)
