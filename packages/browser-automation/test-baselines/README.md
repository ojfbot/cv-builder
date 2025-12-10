# Visual Regression Test Baselines

This directory contains baseline screenshots for visual regression testing.

## Structure

- `index.json` - Metadata index for all baselines
- `{test-suite}/` - Directories organized by test suite
  - `{screenshot-name}.png` - Baseline screenshots

## Usage

Baselines are **version controlled** in git. When UI changes are intentional:

1. Review the diff images in test reports
2. If changes are correct, update baselines:
   ```bash
   pnpm test:visual:update
   ```
3. Commit the updated baselines with your PR

## CI/CD

In CI, tests compare current screenshots against these baselines.
Failures indicate unintended visual changes that need investigation.

## Platform-Specific Baselines

Some rendering differences exist across platforms (fonts, anti-aliasing).
Platform-specific baselines are stored as:
- `{name}.darwin.png` - macOS
- `{name}.linux.png` - Linux (used in CI)
- `{name}.win32.png` - Windows

The test framework automatically selects the correct baseline for the platform.
