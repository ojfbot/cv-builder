/**
 * TypeScript types for Visual Regression Dashboard
 */

export interface TestRun {
  id: string; // Unique ID (timestamp-commit)
  timestamp: string; // ISO 8601 timestamp
  commit: string; // Git commit SHA
  branch: string; // Git branch
  pr?: number; // PR number (if applicable)
  passed: boolean; // Overall result
  totalSteps: number; // Total interaction steps
  failedSteps: number; // Failed steps
  diagrams: string[]; // Diagram file names
  manifestPath: string; // Path to manifest.json
}

export interface TestIndex {
  runs: TestRun[];
  lastUpdated: string;
}

export interface ScreenshotMetadata {
  nodeId: string;
  stepNumber: number;
  interactionType: string;
  timestamp: string;
  viewport: ViewportConfig;
  screenshotPath: string;
  baselinePath?: string;
  diffPath?: string;
  passed: boolean;
  diffPercentage?: number;
  gitCommit?: string;
  captureAt: 'before' | 'after';
}

export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface InteractionResult {
  node: {
    id: string;
    label: string;
  };
  stepNumber: number;
  success: boolean;
  duration: number;
  screenshots: ScreenshotMetadata[];
  error?: string;
}

export interface TestManifest {
  diagramSource: string;
  timestamp: string;
  gitCommit?: string;
  gitBranch?: string;
  totalSteps: number;
  screenshotsCaptured: number;
  passed: boolean;
  duration: number;
  interactions: InteractionResult[];
  summary: {
    totalPassed: number;
    totalFailed: number;
    averageDiffPercentage: number;
  };
}

export type StatusFilter = 'all' | 'passed' | 'failed';

export interface FilterState {
  search: string;
  status: StatusFilter;
  branch?: string;
}
