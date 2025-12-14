# Draw.io Screenshot Embedding Pipeline

**Version**: 1.0.0
**Status**: ✅ Complete (Sub-Issue #74)
**Dependencies**: Draw.io Schema (#72), Screenshot Capture (#73)

This document describes the automated pipeline for embedding screenshots into Draw.io diagrams, creating self-documenting visual regression test artifacts.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Embedding Process](#embedding-process)
5. [Draw.io Integration](#drawio-integration)
6. [Usage Examples](#usage-examples)
7. [Git LFS Support](#git-lfs-support)
8. [Validation](#validation)

---

## Overview

The screenshot embedding pipeline takes captured screenshots and test manifests from the capture phase and embeds them directly into Draw.io diagrams as base64-encoded images, creating interactive, self-documenting visual regression artifacts.

**Key Features**:

- **Base64 Embedding**: Screenshots embedded directly in Draw.io XML
- **Structure Preservation**: Maintains Draw.io layers, connections, and styles
- **Metadata Annotations**: Adds test run summaries and step annotations
- **Flexible Layout**: Configurable image placement (right/below)
- **Git LFS Support**: Automatic detection and guidance for large files
- **Validation**: Ensures extended diagrams open correctly in Draw.io

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Embedding Pipeline                       │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐ │
│  │  Read    │ →  │  Parse   │ →  │  Embed   │ →  │ Save  │ │
│  │  Source  │    │   XML    │    │  Images  │    │Output │ │
│  └──────────┘    └──────────┘    └──────────┘    └───────┘ │
│        ↓              ↓                ↓              ↓      │
│   Draw.io        Validate        Add Annotations    Valid   │
│    File          Structure       Add Screenshots   Draw.io  │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                  ┌──────────────────┐
│ XML Manipulator  │                  │ Screenshot       │
│                  │                  │ Embedder         │
│ - Parse/Serialize│                  │                  │
│ - Find cells     │                  │ - Embed images   │
│ - Insert elements│                  │ - Add metadata   │
│ - Validate       │                  │ - Git LFS check  │
└──────────────────┘                  └──────────────────┘
```

---

## Components

### 1. XML Manipulator

**File**: `src/drawio/xml-manipulator.ts` (350 LOC)

Provides safe utilities for manipulating Draw.io XML structure.

**Key Methods**:

```typescript
class DrawioXMLManipulator {
  // Parse and serialize
  parse(xml: string): Document
  serialize(doc: Document): string

  // Cell operations
  findCell(doc: Document, cellId: string): Element | null
  getAllCells(doc: Document): Element[]
  getCellPosition(cell: Element): Position | null

  // Create elements
  createImageCell(doc: Document, config: ImageCellConfig): Element
  createAnnotationCell(doc: Document, id: string, text: string, position: Position): Element

  // Layout calculations
  calculateImagePosition(originalCell: Element, offset: 'right' | 'below'): Position | null

  // Utilities
  validate(doc: Document): { valid: boolean; errors: string[] }
  generateCellId(doc: Document, prefix: string): string
  updateMetadata(doc: Document, updates: { modified?: string; version?: string }): void
}
```

**Image Cell Creation**:

Draw.io image cells use a special style format:

```typescript
const style = [
  'shape=image',
  `image=data:image/png;base64,${base64Data}`,
  'imageAspect=1',
  'aspect=fixed',
].join(';');
```

**Position Calculation**:

Automatically calculates positions for embedded screenshots:

```typescript
// Place screenshot to the right of original cell
const imageWidth = 400;
const imageHeight = 300;
const margin = 50;

const position = {
  x: originalCell.x + originalCell.width + margin,
  y: originalCell.y,
  width: imageWidth,
  height: imageHeight,
};
```

---

### 2. Screenshot Embedder

**File**: `src/drawio/embedder.ts` (400 LOC)

Orchestrates the complete embedding workflow.

**Embed Options**:

```typescript
interface EmbedOptions {
  sourceFile: string;               // Source Draw.io file
  manifest: TestManifest;           // Test manifest with metadata
  screenshotDir: string;            // Directory with PNG files
  outputFile: string;               // Output extended diagram path
  includeAnnotations?: boolean;     // Add metadata annotations (default: true)
  imagePlacement?: 'right' | 'below'; // Image layout (default: 'right')
  imageScale?: number;              // Scale factor (default: 1.0)
}
```

**Embed Result**:

```typescript
interface EmbedResult {
  outputFile: string;               // Path to extended diagram
  screenshotsEmbedded: number;      // Count of screenshots
  annotationsAdded: number;         // Count of annotations
  fileSize: number;                 // Size in bytes
  recommendGitLFS: boolean;         // true if > 50MB
  warnings: string[];               // Any warnings during embedding
}
```

**Core Workflow**:

```typescript
async embed(options: EmbedOptions): Promise<EmbedResult> {
  // 1. Read and parse source Draw.io file
  const sourceXML = fs.readFileSync(options.sourceFile, 'utf-8');
  const doc = this.manipulator.parse(sourceXML);

  // 2. Validate structure
  const validation = this.manipulator.validate(doc);
  if (!validation.valid) {
    throw new Error(`Invalid Draw.io file`);
  }

  // 3. Update metadata
  this.manipulator.updateMetadata(doc, {
    modified: new Date().toISOString(),
    version: `${options.manifest.version}-extended`,
  });

  // 4. Process each interaction's screenshots
  for (const interaction of options.manifest.interactions) {
    const cell = this.manipulator.findCell(doc, interaction.node.id);

    // Embed screenshots
    for (const screenshot of interaction.screenshots) {
      await this.embedScreenshot(doc, cell, screenshot, options);
    }

    // Add annotation
    if (options.includeAnnotations) {
      this.addAnnotation(doc, cell, interaction.node.label, interaction);
    }
  }

  // 5. Add summary annotation
  if (options.includeAnnotations) {
    this.addSummaryAnnotation(doc, options.manifest);
  }

  // 6. Serialize and save
  const outputXML = this.manipulator.serialize(doc);
  fs.writeFileSync(options.outputFile, outputXML, 'utf-8');

  return { outputFile, screenshotsEmbedded, annotationsAdded, fileSize, recommendGitLFS, warnings };
}
```

---

## Embedding Process

### Step 1: Load Source Diagram

```typescript
const sourceXML = fs.readFileSync('form-interaction.drawio', 'utf-8');
const doc = manipulator.parse(sourceXML);
```

### Step 2: Locate Insertion Points

For each interaction in the manifest, find the corresponding cell:

```typescript
const cell = manipulator.findCell(doc, nodeId);
const position = manipulator.getCellPosition(cell);
```

### Step 3: Convert Screenshot to Base64

```typescript
const screenshotPath = path.join(screenshotDir, screenshot.screenshotPath);
const imageBuffer = fs.readFileSync(screenshotPath);
const base64Data = imageBuffer.toString('base64');
```

### Step 4: Create Image Cell

```typescript
const imageCell = manipulator.createImageCell(doc, {
  id: `screenshot-${nodeId}-${captureAt}`,
  base64Data,
  position: calculatedPosition,
  label: `${nodeLabel} | ${captureAt.toUpperCase()} | ${viewport} | ${passed ? '✓' : '✗'}`,
});
```

### Step 5: Insert into Diagram

```typescript
manipulator.insertCell(doc, imageCell);
```

### Step 6: Add Annotations

```typescript
// Per-node annotation
const annotationText = [
  `Step ${stepNumber}: ${label}`,
  `Duration: ${duration}ms`,
  `Success: ${success ? '✓' : '✗'}`,
].join('\n');

const annotationCell = manipulator.createAnnotationCell(doc, annotationId, annotationText, position);
manipulator.insertCell(doc, annotationCell);

// Summary annotation
const summaryText = [
  `📊 Test Run Summary`,
  `Generated: ${new Date(manifest.generatedAt).toLocaleString()}`,
  `Git Commit: ${manifest.gitCommit || 'N/A'}`,
  ``,
  `Total Steps: ${manifest.totalSteps}`,
  `Screenshots: ${manifest.screenshotsCaptured}`,
  `Passed: ${manifest.summary.totalPassed}`,
  `Failed: ${manifest.summary.totalFailed}`,
  ``,
  `Overall: ${manifest.passed ? '✓ PASSED' : '✗ FAILED'}`,
].join('\n');
```

### Step 7: Save Extended Diagram

```typescript
const outputXML = manipulator.serialize(doc);
fs.writeFileSync(outputFile, outputXML, 'utf-8');
```

---

## Draw.io Integration

### XML Structure

Draw.io files follow this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="CV Builder" modified="2025-12-14T01:12:27.861Z" version="1.0.0">
  <diagram name="Page-1" id="template">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Original node -->
        <mxCell id="form-2" value="user types name" style="..." vertex="1" parent="1">
          <mxGeometry x="400" y="100" width="200" height="80" as="geometry" />
        </mxCell>

        <!-- Embedded screenshot -->
        <mxCell id="screenshot-form-2-before" vertex="1" parent="1"
                style="shape=image;image=data:image/png;base64,iVBORw0KGgo...">
          <mxGeometry x="700" y="100" width="400" height="300" as="geometry" />
        </mxCell>

        <!-- Annotation -->
        <mxCell id="annotation-form-2" value="Step 1: user types name..."
                style="text;html=1;..." vertex="1" parent="1">
          <mxGeometry x="400" y="40" width="200" height="50" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### Compatibility

The pipeline ensures compatibility with:

- ✅ Draw.io Desktop (v22.0+)
- ✅ Draw.io Web (diagrams.net)
- ✅ VS Code Draw.io Extension
- ✅ GitHub Draw.io Viewer

Extended diagrams are fully editable - users can:
- Move screenshot images
- Resize images (maintains aspect ratio)
- Edit annotations
- Add new elements
- Export to PNG/SVG/PDF

---

## Usage Examples

### Example 1: Basic Embedding

```typescript
import { embedScreenshots } from './drawio/embedder';
import type { TestManifest } from './drawio/metadata';
import fs from 'fs';

// Load manifest from capture phase
const manifest: TestManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));

// Embed screenshots
const result = await embedScreenshots({
  sourceFile: 'templates/drawio/form-interaction.drawio',
  manifest,
  screenshotDir: 'screenshots',
  outputFile: 'form-interaction-extended.drawio',
});

console.log(`✅ Embedded ${result.screenshotsEmbedded} screenshots`);
console.log(`📄 Output: ${result.outputFile}`);
```

### Example 2: Custom Configuration

```typescript
const result = await embedScreenshots({
  sourceFile: 'my-flow.drawio',
  manifest,
  screenshotDir: 'test-results/screenshots',
  outputFile: `extended/${Date.now()}-my-flow.drawio`,
  includeAnnotations: true,
  imagePlacement: 'below',     // Place screenshots below nodes
  imageScale: 0.5,             // Scale to 50% for smaller file
});

if (result.recommendGitLFS) {
  console.log('⚠️  Large file detected. Initialize Git LFS:');
  console.log('    git lfs track "*.drawio"');
}
```

### Example 3: Automated Workflow

```typescript
import { captureFlow } from './drawio/screenshot-orchestrator';
import { embedScreenshots, ScreenshotEmbedder } from './drawio/embedder';

// Step 1: Capture screenshots
const captureResult = await captureFlow(schema, {
  baseUrl: 'http://localhost:3000',
  outputDir: './screenshots',
  viewport: 'desktop',
  compareWithBaselines: true,
});

// Step 2: Embed screenshots
const embedResult = await embedScreenshots({
  sourceFile: 'templates/drawio/my-flow.drawio',
  manifest: captureResult.manifest,
  screenshotDir: './screenshots',
  outputFile: ScreenshotEmbedder.generateOutputFilename(
    'templates/drawio/my-flow.drawio',
    './extended'
  ),
  includeAnnotations: true,
});

console.log(`✅ Complete workflow finished`);
console.log(`   Captured: ${captureResult.manifest.screenshotsCaptured} screenshots`);
console.log(`   Embedded: ${embedResult.screenshotsEmbedded} images`);
console.log(`   Output: ${embedResult.outputFile}`);
```

### Example 4: Generate Filename with Timestamp

```typescript
import { ScreenshotEmbedder } from './drawio/embedder';

const outputFile = ScreenshotEmbedder.generateOutputFilename(
  'templates/drawio/form-interaction.drawio',
  './extended'
);

// Generates: extended/form-interaction-extended-2025-12-14.drawio

const result = await embedScreenshots({
  sourceFile: 'templates/drawio/form-interaction.drawio',
  manifest,
  screenshotDir: './screenshots',
  outputFile,
});
```

---

## Git LFS Support

### Why Git LFS?

Extended Draw.io files with embedded base64 screenshots can be large (50MB+). Git LFS (Large File Storage) is recommended for files over 50MB.

### Automatic Detection

The embedder automatically detects large files:

```typescript
const fileSizeMB = stats.size / (1024 * 1024);
const recommendGitLFS = fileSizeMB > 50;

if (recommendGitLFS) {
  warnings.push(`File size is ${fileSizeMB.toFixed(1)}MB. Consider using Git LFS.`);
}
```

### Check Git LFS Availability

```typescript
import { ScreenshotEmbedder } from './drawio/embedder';

const hasLFS = await ScreenshotEmbedder.checkGitLFS();

if (!hasLFS) {
  console.log('Install Git LFS: https://git-lfs.github.com/');
}
```

### Initialize Git LFS

```typescript
import { ScreenshotEmbedder } from './drawio/embedder';

// Track all Draw.io files
await ScreenshotEmbedder.initGitLFS('*.drawio');

// Or track specific patterns
await ScreenshotEmbedder.initGitLFS('extended/*.drawio');
```

### Manual Git LFS Setup

```bash
# Install Git LFS (macOS)
brew install git-lfs

# Initialize in repository
git lfs install

# Track Draw.io files
git lfs track "*.drawio"

# Commit .gitattributes
git add .gitattributes
git commit -m "Track Draw.io files with Git LFS"
```

### Verify LFS Tracking

```bash
# Check which files are tracked
git lfs ls-files

# Check file status
git lfs status

# View LFS file details
git lfs ls-files --size
```

---

## Validation

### E2E Test Results

The end-to-end test (`test-embedding.ts`) validates the complete pipeline:

```
🎬 Testing Screenshot Embedding Pipeline

✅ Loaded manifest: form-interaction.drawio
   Steps: 2
   Screenshots: 2

✅ Verified 2 screenshots (73.4 KB each)

✅ Source file: form-interaction.drawio

✅ Embedding complete!
   Screenshots embedded: 2
   Annotations added: 3
   File size: 0.2 MB

✅ Valid Draw.io structure
   Total cells: 18
   Image cells: 2

✅ All tests passed!
```

### Structure Validation

The manipulator validates Draw.io structure:

```typescript
const validation = manipulator.validate(doc);

if (!validation.valid) {
  console.error('Invalid Draw.io file:');
  validation.errors.forEach((err) => console.error(`  - ${err}`));
}
```

Checks:
- ✅ `<mxfile>` root element exists
- ✅ `<diagram>` element exists
- ✅ `<mxGraphModel>` element exists
- ✅ `<root>` element exists

### Manual Validation

Open extended diagram in Draw.io to verify:

1. **File Opens**: No errors when loading
2. **Images Display**: Screenshots render correctly
3. **Annotations Readable**: Text annotations are visible
4. **Fully Editable**: Can move, resize, edit elements
5. **Export Works**: Can export to PNG/SVG/PDF

```bash
# Open in Draw.io Desktop
open "form-interaction-extended-2025-12-14.drawio"

# Or open in browser
open "https://app.diagrams.net/?lightbox=1#Ufile:///path/to/diagram.drawio"
```

---

## File Size Management

### Strategies to Reduce File Size

1. **Scale Images**:
   ```typescript
   imageScale: 0.5  // 50% size = ~25% file size
   ```

2. **Compress Screenshots**:
   ```typescript
   // Use PNG compression
   await page.screenshot({
     path: 'screenshot.png',
     quality: 80,  // For JPEG
   });
   ```

3. **Selective Embedding**:
   ```typescript
   // Only embed screenshots for failed tests
   const failedScreenshots = manifest.interactions.filter(i => !i.success);
   ```

4. **Use Git LFS** for files > 50MB

5. **Separate Diagrams** by test suite

### Expected File Sizes

| Screenshots | Resolution  | Scale | Approx Size |
|-------------|-------------|-------|-------------|
| 2           | 1280x720    | 100%  | 0.2 MB      |
| 5           | 1280x720    | 100%  | 0.5 MB      |
| 10          | 1280x720    | 100%  | 1.0 MB      |
| 20          | 1920x1080   | 100%  | 4.0 MB      |
| 50          | 1920x1080   | 100%  | 10 MB       |
| 100         | 1920x1080   | 100%  | 20 MB       |
| 200         | 1920x1080   | 50%   | 20 MB       |
| 300+        | 1920x1080   | Any   | Use Git LFS |

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Visual Regression with Embedding

on: [pull_request]

jobs:
  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '24'

      - name: Install Dependencies
        run: pnpm install

      - name: Start Application
        run: pnpm dev:all &

      - name: Wait for App
        run: sleep 10

      - name: Capture Screenshots
        run: pnpm exec tsx src/drawio/test-capture-flow.ts

      - name: Embed Screenshots
        run: pnpm exec tsx src/drawio/test-embedding.ts

      - name: Upload Extended Diagram
        uses: actions/upload-artifact@v3
        with:
          name: visual-regression-diagrams
          path: temp/embedding-test/*.drawio

      - name: Comment on PR (Sub-Issue #75)
        # Will be implemented in next phase
        run: echo "PR comment with embedded diagrams"
```

---

## Next Steps

### Sub-Issue #75: GitHub Gist PR Comments

The next phase will integrate with GitHub PRs:

- Upload screenshots to Gists
- Post comparison comments on PRs
- Link to extended Draw.io diagrams
- Show visual diffs inline

### Sub-Issue #76: GitHub Pages Dashboard

Create lightweight dashboard:

- Display test runs over time
- Show extended diagrams with navigation
- Filter by viewport/date/status
- Download artifacts

---

## See Also

- [Draw.io Schema Documentation](./DRAWIO_SCHEMA.md) - Complete schema specification
- [Screenshot Capture Pipeline](./SCREENSHOT_CAPTURE.md) - Capture workflow
- [Visual Regression Architecture](./VISUAL_REGRESSION_ARCHITECTURE.md) - Overall system design
- [Draw.io Developer Docs](https://www.drawio.com/doc/) - Draw.io XML format

---

**Completion**: Sub-Issue #74 ✅ COMPLETE
**Implementation**: 750 LOC (xml-manipulator, embedder, tests)
**Testing**: End-to-end validated with Draw.io compatibility
**Documentation**: Comprehensive (this document)
