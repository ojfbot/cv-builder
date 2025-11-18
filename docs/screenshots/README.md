# Screenshot Documentation

This directory contains the **golden reference screenshots** for visual regression testing and documentation.

## Current Baseline

**Source:** PR #36
**Date:** 2025-11-17
**Total Screenshots:** 15

## Applications

### Cv Builder

**Suites:** 8
**Screenshots:** 15

- **Bio Form** (1 screenshots)
- **Chat** (2 screenshots)
- **Interactive** (1 screenshots)
- **Jobs** (1 screenshots)
- **Outputs** (1 screenshots)
- **Settings** (3 screenshots)
- **Sidebar** (3 screenshots)
- **Theme** (3 screenshots)

[View Cv Builder Documentation](./cv-builder/README.md)

## Usage

### For Visual Regression Testing

Compare new screenshots against these baselines to detect unintended visual changes.

### For Documentation

Use these screenshots in documentation, onboarding materials, and design reviews.

### Updating Baselines

To update these screenshots with a new baseline:

```bash
# Promote latest PR screenshots
npm run screenshots:promote

# Or promote specific PR
npm run screenshots:promote -- --pr=36
```

## Update History

- **2025-11-17** - Baseline from PR #36 (15 screenshots)
