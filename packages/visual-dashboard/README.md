# Visual Regression Dashboard

A lightweight GitHub Pages dashboard for viewing visual regression test results from the CV Builder project.

## Features

- **Test History Browser**: View all test runs by PR, branch, and date
- **Screenshot Gallery**: Lightbox gallery with before/after/diff comparisons
- **Search & Filter**: Find tests by component, name, or status
- **Responsive Design**: Works on desktop, tablet, and mobile

## Architecture

The dashboard is a static React application that reads test data from JSON manifests. It's deployed to GitHub Pages and automatically updated via GitHub Actions when new test results are available.

### Data Flow

1. CI/CD runs visual regression tests (via `browser-automation` package)
2. Test manifests and screenshots are generated in `packages/browser-automation/temp/`
3. GitHub Actions workflow copies data to `public/data/`
4. Dashboard index is generated from manifests
5. Dashboard is built and deployed to GitHub Pages

## Development

### Prerequisites

- Node.js 24+
- pnpm 9+

### Local Development

```bash
# Install dependencies
pnpm install

# Generate index from test manifests
pnpm generate-index

# Start dev server (port 3002)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Data Structure

```
public/data/
├── index.json              # Test run index
├── manifests/              # Test manifests from browser-automation
├── screenshots/            # Screenshot images (before/after/diff)
└── diagrams/               # Extended Draw.io files
```

### index.json Format

```json
{
  "runs": [
    {
      "id": "1702512000000-abc1234",
      "timestamp": "2025-12-13T10:00:00.000Z",
      "commit": "abc1234567890",
      "branch": "main",
      "pr": 123,
      "passed": true,
      "totalSteps": 10,
      "failedSteps": 0,
      "diagrams": ["form-interaction.drawio"],
      "manifestPath": "manifests/capture-test/manifest.json"
    }
  ],
  "lastUpdated": "2025-12-13T10:00:00.000Z"
}
```

## Deployment

The dashboard is automatically deployed to GitHub Pages via the `deploy-dashboard.yml` workflow:

1. Triggers on push to `main` branch (when dashboard or test artifacts change)
2. Generates data index from test manifests
3. Copies test artifacts to `public/data/`
4. Builds dashboard with Vite
5. Deploys to GitHub Pages at `/cv-builder/visual-regression/`

### Manual Deployment

```bash
# Generate index
pnpm generate-index

# Build dashboard
pnpm build

# Deploy (handled by GitHub Actions in CI)
```

## CI/CD Integration

To integrate with your CI/CD pipeline:

1. Run visual regression tests (see `packages/browser-automation/`)
2. Test manifests and screenshots are saved to `temp/`
3. GitHub Actions automatically picks up changes and deploys dashboard
4. Dashboard is accessible at `https://[username].github.io/cv-builder/visual-regression/`

### Example CI Workflow Integration

```yaml
- name: Run Visual Regression Tests
  run: |
    cd packages/browser-automation
    pnpm test:screenshots

- name: Trigger Dashboard Update
  # Dashboard workflow auto-triggers on main branch push
  # No manual step needed
```

## Tech Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Chart.js**: Trend visualization (future enhancement)
- **GitHub Pages**: Static hosting

## Performance

- Initial bundle: ~150KB (gzipped)
- Lazy-loaded diagrams and screenshots
- Optimized with code splitting

## Future Enhancements

- [ ] Trend charts showing failures over time
- [ ] Interactive Draw.io diagram viewer
- [ ] Advanced filtering (by date range, component)
- [ ] Export test results to CSV/PDF
- [ ] Performance metrics tracking

## License

Part of the CV Builder project.
