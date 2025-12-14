# GitHub Pages Dashboard - Implementation Guide

**Version**: 1.0.0
**Status**: 📋 Specification Complete - Ready for Implementation
**Sub-Issue**: #76
**Estimated Effort**: 3-4 days

This document provides a complete specification and implementation guide for the GitHub Pages visual regression dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Package Structure](#package-structure)
4. [Core Components](#core-components)
5. [Data Model](#data-model)
6. [Implementation Steps](#implementation-steps)
7. [Deployment](#deployment)
8. [Future Enhancements](#future-enhancements)

---

## Overview

The GitHub Pages dashboard is a lightweight static site that provides:

1. **Test History Browser** - View all test runs by PR, branch, date
2. **Draw.io Viewer** - Interactive viewer for extended diagrams with embedded screenshots
3. **Screenshot Gallery** - Lightbox gallery with before/after/diff comparisons
4. **Trend Charts** - Visual representation of failures over time
5. **Search & Filter** - Find tests by component, name, status
6. **Responsive Design** - Works on desktop, tablet, mobile

**Key Constraints**:
- **Lean Stack**: Vite + React (or Vanilla JS for ultra-lean)
- **Static Only**: No backend, all data from JSON manifests
- **GitHub Pages**: Deployed to `gh-pages` branch
- **Fast Load**: < 1MB initial bundle, lazy-loaded diagrams

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages Dashboard                    │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐  │
│  │  Index   │ → │  Test    │ → │  Diagram │ → │Gallery  │  │
│  │  Page    │   │  History │   │  Viewer  │   │ Modal   │  │
│  └──────────┘   └──────────┘   └──────────┘   └─────────┘  │
│       ↓              ↓              ↓              ↓         │
│   Test List    Manifest Data   Draw.io XML   Screenshots    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
       ┌────────────────────┴────────────────────┐
       ↓                                         ↓
┌─────────────────┐                    ┌─────────────────┐
│ Data Layer      │                    │ Components      │
│                 │                    │                 │
│ - manifests/    │                    │ - TestList      │
│ - diagrams/     │                    │ - DiagramViewer │
│ - screenshots/  │                    │ - Gallery       │
│ - index.json    │                    │ - TrendChart    │
└─────────────────┘                    └─────────────────┘
```

**Data Flow**:

1. CI/CD generates test manifests, diagrams, screenshots
2. Artifacts committed to `gh-pages` branch
3. Dashboard reads `index.json` for test run list
4. User selects test run
5. Dashboard loads manifest, diagrams, screenshots
6. Interactive viewing and filtering

---

## Package Structure

```
packages/visual-dashboard/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── data/
│       ├── index.json              # Test run index
│       ├── manifests/              # Test manifests
│       ├── diagrams/               # Extended Draw.io files
│       └── screenshots/            # Screenshot images
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component
│   ├── components/
│   │   ├── TestList.tsx            # Test run list
│   │   ├── TestRunCard.tsx         # Individual test run card
│   │   ├── DiagramViewer.tsx       # Draw.io XML viewer
│   │   ├── ScreenshotGallery.tsx   # Screenshot lightbox
│   │   ├── TrendChart.tsx          # Failures over time chart
│   │   ├── FilterBar.tsx           # Search and filter controls
│   │   └── Layout.tsx              # Page layout
│   ├── hooks/
│   │   ├── useTestRuns.ts          # Load test run data
│   │   ├── useManifest.ts          # Load manifest
│   │   └── useScreenshots.ts       # Load screenshots
│   ├── utils/
│   │   ├── dataLoader.ts           # Fetch JSON data
│   │   └── parseDrawio.ts          # Parse Draw.io XML
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   └── styles/
│       └── main.css                # Global styles
├── scripts/
│   ├── generate-index.ts           # Generate index.json
│   └── deploy.ts                   # Build and deploy
└── docs/
    └── DEPLOYMENT.md               # Deployment guide
```

---

## Core Components

### 1. TestList Component

**Purpose**: Display all test runs with filtering and sorting

```typescript
interface TestRun {
  id: string;                  // Unique ID (timestamp-commit)
  timestamp: string;           // ISO 8601 timestamp
  commit: string;              // Git commit SHA
  branch: string;              // Git branch
  pr?: number;                 // PR number (if applicable)
  passed: boolean;             // Overall result
  totalSteps: number;          // Total interaction steps
  failedSteps: number;         // Failed steps
  diagrams: string[];          // Diagram file names
}

interface TestListProps {
  onSelectRun: (run: TestRun) => void;
}

export function TestList({ onSelectRun }: TestListProps) {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');

  useEffect(() => {
    // Load index.json
    fetch('/data/index.json')
      .then(res => res.json())
      .then(data => setRuns(data.runs));
  }, []);

  const filteredRuns = runs.filter(run => {
    if (statusFilter !== 'all' && run.passed !== (statusFilter === 'passed')) {
      return false;
    }
    if (filter && !run.branch.includes(filter) && !run.commit.includes(filter)) {
      return false;
    }
    return true;
  });

  return (
    <div className="test-list">
      <FilterBar filter={filter} onFilterChange={setFilter}
                 statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />
      <div className="test-cards">
        {filteredRuns.map(run => (
          <TestRunCard key={run.id} run={run} onClick={() => onSelectRun(run)} />
        ))}
      </div>
    </div>
  );
}
```

### 2. DiagramViewer Component

**Purpose**: Display Draw.io diagram with embedded screenshots

```typescript
interface DiagramViewerProps {
  diagramPath: string;
  manifestPath: string;
}

export function DiagramViewer({ diagramPath, manifestPath }: DiagramViewerProps) {
  const [diagram, setDiagram] = useState<string>('');
  const [manifest, setManifest] = useState<TestManifest | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    // Load diagram XML
    fetch(diagramPath)
      .then(res => res.text())
      .then(xml => setDiagram(xml));

    // Load manifest
    fetch(manifestPath)
      .then(res => res.json())
      .then(data => setManifest(data));
  }, [diagramPath, manifestPath]);

  const renderDiagram = () => {
    // Parse Draw.io XML and render as SVG or use iframe
    // Option 1: Convert to SVG using Draw.io viewer library
    // Option 2: Embed in iframe with Draw.io viewer
    // Option 3: Render as image (simple but not interactive)

    return (
      <iframe
        src={`https://viewer.diagrams.net/?lightbox=1&edit=_blank&url=${encodeURIComponent(diagramPath)}`}
        style={{ width: '100%', height: '600px', border: 'none' }}
      />
    );
  };

  return (
    <div className="diagram-viewer">
      <div className="diagram-container">
        {renderDiagram()}
      </div>
      {selectedNode && manifest && (
        <ScreenshotPanel node={selectedNode} manifest={manifest} />
      )}
    </div>
  );
}
```

### 3. ScreenshotGallery Component

**Purpose**: Lightbox gallery for screenshots with before/after/diff

```typescript
interface ScreenshotGalleryProps {
  screenshots: ScreenshotMetadata[];
  onClose: () => void;
}

export function ScreenshotGallery({ screenshots, onClose }: ScreenshotGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'before' | 'after' | 'diff' | 'side-by-side'>('after');

  const current = screenshots[currentIndex];

  return (
    <div className="screenshot-gallery-modal">
      <div className="gallery-header">
        <h3>Step {current.stepNumber}: {current.nodeLabel}</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="gallery-controls">
        <button onClick={() => setViewMode('before')}>Before</button>
        <button onClick={() => setViewMode('after')}>After</button>
        <button onClick={() => setViewMode('diff')}>Diff</button>
        <button onClick={() => setViewMode('side-by-side')}>Side by Side</button>
      </div>

      <div className="gallery-content">
        {viewMode === 'side-by-side' ? (
          <div className="side-by-side">
            <img src={current.baselinePath} alt="Before" />
            <img src={current.screenshotPath} alt="After" />
          </div>
        ) : (
          <img
            src={
              viewMode === 'before' ? current.baselinePath :
              viewMode === 'diff' ? current.diffPath :
              current.screenshotPath
            }
            alt={viewMode}
          />
        )}
      </div>

      <div className="gallery-metadata">
        <p>Diff: {current.diffPercentage?.toFixed(2)}%</p>
        <p>Pixels: {current.diffPixels}</p>
        <p>Status: {current.passed ? '✅ Passed' : '❌ Failed'}</p>
      </div>

      <div className="gallery-navigation">
        <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}>← Prev</button>
        <span>{currentIndex + 1} / {screenshots.length}</span>
        <button onClick={() => setCurrentIndex(Math.min(screenshots.length - 1, currentIndex + 1))}>Next →</button>
      </div>
    </div>
  );
}
```

### 4. TrendChart Component

**Purpose**: Chart showing failures over time

```typescript
interface TrendChartProps {
  runs: TestRun[];
}

export function TrendChart({ runs }: TrendChartProps) {
  // Sort by timestamp
  const sortedRuns = [...runs].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate failure rate for each run
  const data = sortedRuns.map(run => ({
    timestamp: new Date(run.timestamp),
    failureRate: run.totalSteps > 0 ? (run.failedSteps / run.totalSteps) * 100 : 0,
    label: `${run.branch} (${run.commit.substring(0, 7)})`,
  }));

  return (
    <div className="trend-chart">
      <h3>Visual Regression Trends</h3>
      <svg width="800" height="400">
        {/* Render line chart with failure rates */}
        {/* Use a lightweight charting library like Chart.js or D3 */}
      </svg>
    </div>
  );
}
```

---

## Data Model

### index.json

Central index of all test runs:

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-12-14T03:00:00.000Z",
  "runs": [
    {
      "id": "20251214-c7b32fe",
      "timestamp": "2025-12-14T02:45:12.000Z",
      "commit": "c7b32fe2ac2a4d353e402c9346aaf3ae6cf4b7ce",
      "branch": "main",
      "pr": 123,
      "passed": true,
      "totalSteps": 5,
      "failedSteps": 0,
      "diagrams": ["form-interaction-extended-2025-12-14.drawio"],
      "manifestPath": "manifests/20251214-c7b32fe.json"
    }
  ]
}
```

### Manifest

Test run manifest (from capture phase):

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-12-14T02:45:12.000Z",
  "gitCommit": "c7b32fe",
  "diagramSource": "form-interaction.drawio",
  "totalSteps": 5,
  "screenshotsCaptured": 10,
  "duration": 4523,
  "passed": true,
  "interactions": [
    {
      "node": { "id": "form-1", "label": "..." },
      "stepNumber": 1,
      "success": true,
      "screenshots": [
        {
          "nodeId": "form-1",
          "screenshotPath": "screenshots/step-01-before-desktop.png",
          "baselinePath": "baselines/step-01-before-desktop.png",
          "diffPath": "diffs/step-01-before-desktop-diff.png",
          "diffPercentage": 0.02,
          "passed": true
        }
      ]
    }
  ]
}
```

---

## Implementation Steps

### Phase 1: Setup (Day 1, Morning)

1. **Create package**:
   ```bash
   mkdir -p packages/visual-dashboard
   cd packages/visual-dashboard
   pnpm init
   pnpm add vite react react-dom
   pnpm add -D @types/react @types/react-dom typescript
   ```

2. **Configure Vite**:
   ```typescript
   // vite.config.ts
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     base: '/cv-builder/visual-regression/',
     build: {
       outDir: 'dist',
       assetsDir: 'assets',
     },
   });
   ```

3. **Create HTML template**:
   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>Visual Regression Dashboard</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/main.tsx"></script>
     </body>
   </html>
   ```

### Phase 2: Core Components (Day 1, Afternoon - Day 2)

1. **Implement TestList** with filtering and sorting
2. **Implement TestRunCard** with summary stats
3. **Implement FilterBar** with search and status filters
4. **Implement basic routing** (test list ↔ detail view)

### Phase 3: Diagram Viewer (Day 2 - Day 3, Morning)

1. **Research Draw.io embedding** options:
   - Option A: Use diagrams.net viewer (iframe)
   - Option B: Convert to SVG using mxGraph
   - Option C: Render as static image (fallback)

2. **Implement DiagramViewer** with chosen approach
3. **Add interactivity** (click nodes to view screenshots)
4. **Add zoom and pan** controls

### Phase 4: Gallery & Charts (Day 3, Afternoon)

1. **Implement ScreenshotGallery** with lightbox
2. **Add before/after/diff** views
3. **Implement TrendChart** using Chart.js or similar
4. **Add responsive design** for mobile

### Phase 5: Data Generation (Day 4, Morning)

1. **Create data pipeline**:
   ```typescript
   // scripts/generate-index.ts
   import fs from 'fs';
   import path from 'path';

   interface IndexEntry {
     id: string;
     timestamp: string;
     commit: string;
     branch: string;
     pr?: number;
     passed: boolean;
     totalSteps: number;
     failedSteps: number;
     diagrams: string[];
     manifestPath: string;
   }

   function generateIndex(manifestsDir: string): void {
     const manifests = fs.readdirSync(manifestsDir)
       .filter(f => f.endsWith('.json'));

     const entries: IndexEntry[] = manifests.map(filename => {
       const manifest = JSON.parse(
         fs.readFileSync(path.join(manifestsDir, filename), 'utf-8')
       );

       return {
         id: filename.replace('.json', ''),
         timestamp: manifest.generatedAt,
         commit: manifest.gitCommit || 'unknown',
         branch: process.env.GITHUB_REF_NAME || 'main',
         pr: process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER) : undefined,
         passed: manifest.passed,
         totalSteps: manifest.totalSteps,
         failedSteps: manifest.summary.totalFailed,
         diagrams: [manifest.diagramSource],
         manifestPath: `manifests/${filename}`,
       };
     });

     const index = {
       version: '1.0.0',
       generatedAt: new Date().toISOString(),
       runs: entries,
     };

     fs.writeFileSync('public/data/index.json', JSON.stringify(index, null, 2));
   }

   generateIndex('public/data/manifests');
   ```

### Phase 6: Deployment (Day 4, Afternoon)

1. **Create GitHub Actions workflow**:
   ```yaml
   # .github/workflows/deploy-dashboard.yml
   name: Deploy Dashboard

   on:
     push:
       branches: [main]
     workflow_dispatch:

   permissions:
     contents: write

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3

         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '24'

         - name: Install dependencies
           run: |
             cd packages/visual-dashboard
             pnpm install

         - name: Copy test data
           run: |
             mkdir -p packages/visual-dashboard/public/data
             cp -r packages/browser-automation/temp/capture-test/* packages/visual-dashboard/public/data/

         - name: Generate index
           run: |
             cd packages/visual-dashboard
             pnpm exec tsx scripts/generate-index.ts

         - name: Build
           run: |
             cd packages/visual-dashboard
             pnpm build

         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./packages/visual-dashboard/dist
             destination_dir: visual-regression
   ```

2. **Configure GitHub Pages**:
   - Repository Settings → Pages
   - Source: Deploy from branch
   - Branch: gh-pages
   - Folder: / (root) or /visual-regression

3. **Test deployment**:
   - Visit `https://ojfbot.github.io/cv-builder/visual-regression/`

---

## Deployment

### Manual Deployment

```bash
# Build dashboard
cd packages/visual-dashboard
pnpm build

# Deploy to gh-pages
npx gh-pages -d dist -e visual-regression
```

### Automated Deployment

Triggered on:
- Push to main branch
- Manual workflow dispatch
- PR merge (optional)

### Data Updates

Dashboard data updated by:
1. CI/CD runs visual regression tests
2. Generates manifests, diagrams, screenshots
3. Commits to `gh-pages` branch under `visual-regression/data/`
4. Dashboard automatically picks up new data

---

## Future Enhancements

### Phase 2 Features

1. **Diff Heatmap**: Show which areas changed most
2. **Baseline Management**: Update baselines directly from dashboard
3. **Test Annotations**: Add notes to test runs
4. **Export Reports**: Download PDF or HTML reports
5. **Comparison Mode**: Compare two test runs side-by-side
6. **Performance Metrics**: Show test execution times
7. **Notification Integration**: Slack/email alerts for failures

### Advanced Features

1. **AI-Powered Analysis**: Suggest which changes caused regressions
2. **Auto-Categorization**: Group similar failures
3. **Historical Trends**: Predict failure likelihood
4. **Integration Tests**: Link visual tests to integration test results
5. **Multi-Project Support**: Dashboard for multiple repositories

---

## Technology Choices

### Recommended Stack

**For Lean Implementation**:
- **Framework**: Vite + React (familiar, fast, well-supported)
- **Styling**: Tailwind CSS or vanilla CSS (lightweight)
- **Charts**: Chart.js (simple, effective)
- **Routing**: React Router (optional, can use hash routing)
- **State**: React hooks (no Redux needed)

**For Ultra-Lean**:
- **Framework**: Vite + Vanilla JS (no React)
- **Styling**: Vanilla CSS
- **Charts**: Canvas API (custom)
- **Routing**: Hash-based navigation
- **State**: localStorage + vanilla JS

### Bundle Size Targets

- Initial JS: < 100 KB (gzipped)
- Initial CSS: < 20 KB (gzipped)
- Images: Lazy-loaded
- Diagrams: Lazy-loaded
- Total initial load: < 150 KB

---

## See Also

- [Screenshot Capture Pipeline](./SCREENSHOT_CAPTURE.md)
- [Draw.io Embedding Pipeline](./EMBEDDING_PIPELINE.md)
- [GitHub Gist Integration](./GIST_INTEGRATION.md)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

---

**Status**: 📋 Specification Complete
**Next Step**: Implementation (3-4 days)
**Estimated Bundle Size**: ~150 KB (initial load)
**Target URL**: https://ojfbot.github.io/cv-builder/visual-regression/
