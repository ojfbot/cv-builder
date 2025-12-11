/**
 * GitHub PR Reporter
 *
 * Generates markdown reports for GitHub PR comments with embedded visual diffs.
 * Uses GitHub Actions artifact URLs for screenshot embedding.
 */

import fs from 'fs';
import path from 'path';
import { Reporter, TestResult, TestSummary } from '../types.js';

export interface GitHubPRReporterOptions {
  outputPath: string;
  runNumber?: string;
  runId?: string;
  repository?: string;
  includeVisualDiffs?: boolean;
}

export class GitHubPRReporter implements Reporter {
  private options: GitHubPRReporterOptions;
  private results: TestResult[] = [];
  private visualDiffs: Map<string, VisualDiffInfo> = new Map();

  constructor(options: GitHubPRReporterOptions) {
    this.options = {
      includeVisualDiffs: true,
      ...options,
    };
  }

  async onTestComplete(result: TestResult): Promise<void> {
    this.results.push(result);

    // Track visual regression failures
    if (result.error && result.error.message?.includes('Visual regression detected')) {
      this.extractVisualDiffInfo(result);
    }
  }

  async onSuiteComplete(summary: TestSummary): Promise<void> {
    const markdown = this.generateMarkdown(summary);

    // Ensure output directory exists
    const outputDir = path.dirname(this.options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write PR comment markdown
    fs.writeFileSync(this.options.outputPath, markdown);
    console.log(`\n📝 GitHub PR comment saved to: ${this.options.outputPath}`);
  }

  private extractVisualDiffInfo(result: TestResult): void {
    const errorMsg = result.error?.message || '';

    // Parse visual regression error message
    const diffMatch = errorMsg.match(/- Diff: (.+\.diff\.png)/);
    const baselineMatch = errorMsg.match(/- Baseline: (.+\.png)/);
    const currentMatch = errorMsg.match(/- Current: (.+\.png)/);
    const diffPixelsMatch = errorMsg.match(/- Different pixels: ([\d,]+)/);
    const diffPercentMatch = errorMsg.match(/- Difference: ([\d.]+)%/);

    if (diffMatch) {
      this.visualDiffs.set(result.name, {
        testName: result.name,
        diffPath: diffMatch[1],
        baselinePath: baselineMatch?.[1],
        currentPath: currentMatch?.[1],
        differentPixels: diffPixelsMatch?.[1] || '0',
        differencePercent: diffPercentMatch?.[1] || '0',
      });
    }
  }

  private generateMarkdown(summary: TestSummary): string {
    const { passed, failed, skipped, total } = summary;
    const hasFailures = failed > 0;
    const icon = hasFailures ? '❌' : '✅';

    let markdown = `## ${icon} Browser Automation Test Results\n\n`;

    // Summary
    markdown += '### 📊 Summary\n\n';
    markdown += `| Metric | Count |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| ✅ Passed | ${passed} |\n`;
    markdown += `| ❌ Failed | ${failed} |\n`;
    markdown += `| ⏭️ Skipped | ${skipped} |\n`;
    markdown += `| 📝 Total | ${total} |\n`;
    markdown += `| ⏱️ Duration | ${summary.duration}ms |\n\n`;

    // Visual Regression Details
    if (this.visualDiffs.size > 0) {
      markdown += this.generateVisualDiffSection();
    }

    // Failed Test Details
    if (failed > 0) {
      markdown += this.generateFailureDetails();
    }

    // Artifact Links
    markdown += this.generateArtifactLinks();

    // Instructions
    if (hasFailures) {
      markdown += this.generateUpdateInstructions();
    }

    return markdown;
  }

  private generateVisualDiffSection(): string {
    let markdown = '### 🎨 Visual Regression Differences\n\n';
    markdown += `Found ${this.visualDiffs.size} visual regression(s):\n\n`;

    for (const [testName, info] of this.visualDiffs) {
      markdown += `#### ${testName}\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `|--------|-------|\n`;
      markdown += `| Different Pixels | ${info.differentPixels} |\n`;
      markdown += `| Difference | ${info.differencePercent}% |\n`;
      markdown += `| Threshold | 0.1% (STANDARD) |\n\n`;

      // Note about viewing diffs
      markdown += `> 📸 **View the diff**: Download the \`visual-diffs\` artifact below to see the side-by-side comparison.\n\n`;

      // File paths (relative for reference)
      if (info.baselinePath && info.currentPath && info.diffPath) {
        const baselineFile = path.basename(info.baselinePath);
        const currentFile = path.basename(info.currentPath);
        const diffFile = path.basename(info.diffPath);

        markdown += `<details>\n`;
        markdown += `<summary>📁 File Paths</summary>\n\n`;
        markdown += `\`\`\`\n`;
        markdown += `Baseline: ${baselineFile}\n`;
        markdown += `Current:  ${currentFile}\n`;
        markdown += `Diff:     ${diffFile}\n`;
        markdown += `\`\`\`\n\n`;
        markdown += `</details>\n\n`;
      }
    }

    markdown += '---\n\n';
    return markdown;
  }

  private generateFailureDetails(): string {
    const failedTests = this.results.filter((r) => !r.success);

    let markdown = '### ❌ Failed Tests\n\n';

    for (const test of failedTests) {
      markdown += `<details>\n`;
      markdown += `<summary><b>${test.name}</b> (${test.duration}ms)</summary>\n\n`;

      if (test.error) {
        markdown += `\`\`\`\n`;
        markdown += test.error.message || 'Unknown error';
        markdown += `\n\`\`\`\n\n`;

        if (test.error.stack) {
          markdown += `<details>\n`;
          markdown += `<summary>Stack Trace</summary>\n\n`;
          markdown += `\`\`\`\n`;
          markdown += test.error.stack;
          markdown += `\n\`\`\`\n\n`;
          markdown += `</details>\n`;
        }
      }

      markdown += `</details>\n\n`;
    }

    return markdown;
  }

  private generateArtifactLinks(): string {
    let markdown = '### 📦 Artifacts\n\n';

    if (this.options.runId && this.options.repository) {
      const baseUrl = `https://github.com/${this.options.repository}/actions/runs/${this.options.runId}`;

      markdown += `Download artifacts from the [CI run](${baseUrl}):\n\n`;
      markdown += `- 📸 **[Test Screenshots](${baseUrl})** - All captured screenshots\n`;
      markdown += `- 🎯 **[Visual Diffs](${baseUrl})** - Side-by-side comparison images\n`;
      markdown += `- 📊 **[Test Report](${baseUrl})** - Detailed test results\n\n`;
    } else {
      markdown += 'Artifacts are available for download in the GitHub Actions run.\n\n';
    }

    markdown += '> 💡 **Tip**: Download the `visual-diffs` artifact to see highlighted pixel differences.\n\n';
    markdown += '---\n\n';

    return markdown;
  }

  private generateUpdateInstructions(): string {
    let markdown = '### 🔄 Updating Baselines\n\n';
    markdown += 'If the visual changes are intentional:\n\n';
    markdown += '**Option 1: Update all baselines locally**\n';
    markdown += '```bash\n';
    markdown += 'UPDATE_BASELINES=true pnpm --filter @cv-builder/browser-automation test:visual\n';
    markdown += 'git add packages/browser-automation/test-baselines/\n';
    markdown += 'git commit -m "chore: update visual regression baselines"\n';
    markdown += 'git push\n';
    markdown += '```\n\n';

    markdown += '**Option 2: Trigger workflow to update baselines in CI**\n';
    markdown += '```bash\n';
    markdown += 'gh workflow run "Browser Automation Tests (No Docker)" \\\n';
    markdown += '  --field update_baselines=true\n';
    markdown += '```\n\n';

    markdown += '**Option 3: Update specific baseline**\n';
    if (this.visualDiffs.size > 0) {
      const firstDiff = Array.from(this.visualDiffs.values())[0];
      const baselineName = firstDiff.baselinePath ?
        path.basename(firstDiff.baselinePath, '.png') :
        'example';

      markdown += '```bash\n';
      markdown += `pnpm test:visual:update -- "cv-builder-visual" "${baselineName}"\n`;
      markdown += '```\n\n';
    }

    markdown += '---\n\n';
    return markdown;
  }
}

interface VisualDiffInfo {
  testName: string;
  diffPath?: string;
  baselinePath?: string;
  currentPath?: string;
  differentPixels: string;
  differencePercent: string;
}
