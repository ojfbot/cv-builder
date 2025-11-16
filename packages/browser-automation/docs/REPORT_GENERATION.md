# Test Report Generation

All screenshot test runs now automatically generate structured `report.json` files that capture both machine-readable metadata and human-readable annotations.

## Report Structure

Each `report.json` file contains:

### Machine-Readable Metadata
- **Test identification**: name, date, time, script, target URL, purpose
- **Browser configuration**: engine, headless mode, viewport settings
- **Phase**: Implementation phase number
- **Features**: List of features being tested
- **Prerequisites**: Required services and dependencies
- **Screenshots**: Array with filename, size, description, capture type, interactions
- **Status**: Test completion status (completed, failed, partial)
- **Errors**: Array of any errors encountered

### Human-Readable Annotations
- **type**: Category of annotation (test-purpose, architectural-note, debugging, etc.)
- **content**: Detailed explanation in natural language

## Annotation Types

Standard annotation types used across reports:

- `test-purpose` - Why this test exists and what it validates
- `architectural-note` - Design decisions and patterns
- `implementation-detail` - Technical specifics of how features work
- `critical-debugging` - Important bugs found and fixed during testing
- `verification-methodology` - How test success is verified
- `integration-milestone` - Significant integration achievements
- `phase-N-features` - Overview of phase-specific capabilities

## Automatic Generation

All three test scripts now automatically generate reports:

### test-workflow.sh (Example.com Test)
```bash
./test-workflow.sh
# Generates: temp/screenshots/session-*/report.json
```

### test-cv-builder.sh (CV Builder Component Test)
```bash
./test-cv-builder.sh
# Generates: temp/screenshots/session-*/report.json
```

### test-ui-navigation.sh (Full UI Navigation Test)
```bash
./test-ui-navigation.sh
# Generates: temp/screenshots/ui-navigation-test/report.json
```

## Manual Generation

You can also generate reports manually using `generate-report.sh`:

```bash
./generate-report.sh <test-name> <output-dir> [additional-metadata-json]
```

### Example: Basic Report
```bash
./generate-report.sh "my-test" "./temp/screenshots/session-123"
```

### Example: With Metadata
```bash
METADATA='{
  "testScript": "custom-test.sh",
  "targetUrl": "http://localhost:3000",
  "purpose": "Custom feature testing",
  "browser": {
    "name": "Chromium",
    "engine": "Playwright",
    "headless": true
  },
  "phase": "3",
  "features": ["custom-feature-1", "custom-feature-2"]
}'

./generate-report.sh "custom-test" "./output-dir" "$METADATA"
```

## Report Schema

```typescript
interface TestReport {
  testName: string;
  testDate: string;        // YYYY-MM-DD
  testTime: string;        // HH:MM:SS
  generatedBy: string;     // "generate-report.sh" or "manual"
  outputDir: string;
  screenshots: Screenshot[];
  status: "completed" | "failed" | "partial";
  errors: Error[];
  metadata: {
    testScript?: string;
    targetUrl?: string;
    purpose?: string;
    browser?: BrowserConfig;
    viewport?: ViewportConfig;
    phase?: string;
    features?: string[];
    prerequisites?: string[];
    [key: string]: any;  // Additional custom metadata
  };
  annotations: Annotation[];
}

interface Screenshot {
  filename: string;
  path: string;
  size: string;           // "79KB"
  sizeBytes: number;
  description?: string;
  captureType?: "fullPage" | "viewport" | "element";
  selector?: string;
  interaction?: string;
  viewport?: string | ViewportConfig;
  chatState?: "collapsed" | "expanded";
  verification?: VerificationResult;
}

interface Annotation {
  type: string;
  content: string;
}
```

## Use Cases

### CI/CD Integration
Parse `report.json` files in CI pipelines to:
- Track test execution metrics
- Compare screenshot sizes across runs
- Detect regressions in file sizes (may indicate UI changes)
- Archive test artifacts with metadata

### Non-LLM Environments
The structured metadata enables:
- Automated test result aggregation
- Build status reporting
- Historical trend analysis
- Screenshot organization and cleanup

### Human Review
The annotations provide:
- Context for why tests exist
- Debugging insights for failures
- Architectural understanding
- Verification methodologies

## Example Report

```json
{
  "testName": "ui-navigation-test",
  "testDate": "2025-11-16",
  "testTime": "14:32:10",
  "generatedBy": "generate-report.sh",
  "outputDir": "temp/screenshots/ui-navigation-test",
  "screenshots": [
    {
      "filename": "05-condensed-chat-collapsed.png",
      "size": "77KB",
      "sizeBytes": 78848,
      "description": "Condensed chat (collapsed)",
      "captureType": "viewport",
      "viewport": "desktop",
      "chatState": "collapsed"
    },
    {
      "filename": "06-condensed-chat-expanded.png",
      "size": "129KB",
      "sizeBytes": 132096,
      "description": "Condensed chat (expanded)",
      "captureType": "viewport",
      "viewport": "desktop",
      "chatState": "expanded",
      "interaction": "click:#condensed-input",
      "verification": {
        "method": "file-size-increase",
        "baseline": "77KB",
        "result": "129KB",
        "percentageIncrease": "67.5%",
        "passed": true
      }
    }
  ],
  "status": "completed",
  "errors": [],
  "metadata": {
    "testScript": "test-ui-navigation.sh",
    "targetUrl": "http://localhost:3000",
    "purpose": "Comprehensive UI navigation with chat expansion verification",
    "phase": "3",
    "features": ["tab-navigation", "chat-expansion", "multi-viewport-testing"]
  },
  "annotations": [
    {
      "type": "test-purpose",
      "content": "This is the most comprehensive test run demonstrating Phase 3 capabilities..."
    },
    {
      "type": "verification-methodology",
      "content": "Since we're running in headless mode, we verify chat expansion by comparing file sizes..."
    }
  ]
}
```

## Extending Reports

To add custom metadata or annotations to reports:

1. **During test execution**: Pass JSON to `generate-report.sh`
2. **After generation**: Edit `report.json` directly or use `jq`:

```bash
# Add annotation
jq '.annotations += [{
  "type": "custom-note",
  "content": "Additional context..."
}]' report.json > tmp.json && mv tmp.json report.json

# Update metadata
jq '.metadata.customField = "value"' report.json > tmp.json && mv tmp.json report.json
```

## Best Practices

1. **Always generate reports** - They provide crucial context for future debugging
2. **Include verification data** - Document how test success was verified
3. **Capture errors** - Record any failures or warnings in the errors array
4. **Annotate debugging insights** - Future you will thank present you
5. **Version control reports** - Commit reports in `docs/screenshots/` for documentation
6. **Archive temp reports** - Keep `temp/screenshots/` reports for local debugging
