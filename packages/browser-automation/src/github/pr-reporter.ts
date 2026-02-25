/**
 * GitHub PR Reporter
 *
 * Posts visual regression test results to GitHub PR comments.
 * Uploads screenshots to Gists and embeds them in markdown.
 */

import { execSync } from 'child_process';
import path from 'path';
import { GistUploader } from './gist-uploader.js';
import type { TestManifest, InteractionResult } from '../drawio/metadata.js';

/**
 * PR comment options
 */
export interface PRCommentOptions {
  /**
   * PR number
   */
  prNumber: number;

  /**
   * Repository owner
   */
  owner: string;

  /**
   * Repository name
   */
  repo: string;

  /**
   * Test manifest with results
   */
  manifest: TestManifest;

  /**
   * Screenshot directory
   */
  screenshotDir: string;

  /**
   * Whether to upload screenshots to Gists
   */
  uploadScreenshots?: boolean;

  /**
   * Whether to include diff images
   */
  includeDiffs?: boolean;

  /**
   * Custom header for the comment
   */
  header?: string;
}

/**
 * PR comment result
 */
export interface PRCommentResult {
  /**
   * Comment ID
   */
  commentId: string;

  /**
   * Comment URL
   */
  commentUrl: string;

  /**
   * Number of screenshots uploaded
   */
  screenshotsUploaded: number;

  /**
   * Gist URLs created
   */
  gistUrls: string[];

  /**
   * Markdown content posted
   */
  markdown: string;
}

/**
 * GitHub PR Reporter
 */
export class GitHubPRReporter {
  private gistUploader: GistUploader;
  private token?: string;

  constructor(token?: string) {
    this.token = token;
    this.gistUploader = new GistUploader(token);
  }

  /**
   * Post visual regression results to PR
   */
  async postResults(options: PRCommentOptions): Promise<PRCommentResult> {
    const { manifest, screenshotDir, prNumber, owner, repo } = options;

    // Generate markdown sections
    const sections: string[] = [];

    // Header
    sections.push(options.header || '## 🎨 Visual Regression Test Results\n');

    // Summary
    sections.push(this.generateSummary(manifest));

    // Upload screenshots if enabled
    const gistUrls: string[] = [];
    let screenshotsUploaded = 0;

    if (options.uploadScreenshots !== false) {
      sections.push('\n---\n');
      sections.push('## 📸 Screenshots\n');

      for (const interaction of manifest.interactions) {
        const interactionSection = await this.generateInteractionSection(
          interaction,
          screenshotDir,
          options.includeDiffs ?? true
        );

        sections.push(interactionSection.markdown);

        if (interactionSection.gistUrl) {
          gistUrls.push(interactionSection.gistUrl);
          screenshotsUploaded += interactionSection.screenshotsUploaded;
        }
      }
    }

    // Detailed results
    sections.push('\n---\n');
    sections.push(this.generateDetailedResults(manifest));

    // Update baselines instructions
    if (manifest.summary.totalFailed > 0) {
      sections.push('\n---\n');
      sections.push(this.generateUpdateBaselineInstructions(manifest));
    }

    // Footer
    sections.push('\n---\n');
    sections.push(this.generateFooter(manifest));

    const markdown = sections.join('\n');

    // Post comment
    const commentResult = await this.postComment(owner, repo, prNumber, markdown);

    return {
      commentId: commentResult.id,
      commentUrl: commentResult.url,
      screenshotsUploaded,
      gistUrls,
      markdown,
    };
  }

  /**
   * Generate summary section
   */
  private generateSummary(manifest: TestManifest): string {
    const { summary, passed, totalSteps, screenshotsCaptured, duration } = manifest;

    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const icon = passed ? '✅' : '❌';

    return `
### ${icon} Summary

| Metric | Value |
|--------|-------|
| **Status** | ${status} |
| **Total Steps** | ${totalSteps} |
| **Screenshots** | ${screenshotsCaptured} |
| **Duration** | ${duration}ms |
| **Passed** | ${summary.totalPassed} |
| **Failed** | ${summary.totalFailed} |
| **Avg Diff** | ${summary.averageDiffPercentage.toFixed(2)}% |
`;
  }

  /**
   * Generate interaction section with screenshots
   */
  private async generateInteractionSection(
    interaction: InteractionResult,
    screenshotDir: string,
    includeDiffs: boolean
  ): Promise<{ markdown: string; gistUrl?: string; screenshotsUploaded: number }> {
    const { node, stepNumber, success, screenshots, duration } = interaction;

    const sections: string[] = [];
    let gistUrl: string | undefined;
    let screenshotsUploaded = 0;

    // Section header
    const status = success ? '✅' : '❌';
    sections.push(`\n### ${status} Step ${stepNumber}: ${node.label}\n`);

    // Upload screenshots to gist
    if (screenshots.length > 0) {
      try {
        const screenshot = screenshots[0]; // Use first screenshot
        const beforePath = screenshot.baselinePath
          ? path.resolve(screenshotDir, '..', screenshot.baselinePath)
          : undefined;
        const afterPath = path.join(screenshotDir, screenshot.screenshotPath);
        const diffPath = screenshot.diffPath
          ? path.join(screenshotDir, screenshot.diffPath)
          : undefined;

        const uploadResult = await this.gistUploader.uploadScreenshots(
          beforePath,
          afterPath,
          includeDiffs ? diffPath : undefined,
          `Step ${stepNumber}: ${node.label}`
        );

        sections.push(uploadResult.markdown);
        gistUrl = uploadResult.gistUrl;
        screenshotsUploaded = [beforePath, afterPath, diffPath].filter(Boolean).length;

        // Add diff statistics
        if (screenshot.diffPercentage !== undefined) {
          sections.push(`\n**Diff Statistics:**`);
          sections.push(`- Difference: ${screenshot.diffPercentage.toFixed(2)}%`);
          sections.push(`- Pixels changed: ${screenshot.diffPixels || 0}`);
          sections.push(`- Passed: ${screenshot.passed ? '✅' : '❌'}\n`);
        }
      } catch (error) {
        sections.push(`\n⚠️ Failed to upload screenshots: ${error}\n`);
      }
    }

    // Interaction details
    sections.push(`\n**Details:**`);
    sections.push(`- Duration: ${duration}ms`);
    sections.push(`- Interaction: ${node.interaction?.type || 'N/A'}`);
    if (node.interaction?.target) {
      sections.push(`- Target: \`${node.interaction.target}\``);
    }

    return {
      markdown: sections.join('\n'),
      gistUrl,
      screenshotsUploaded,
    };
  }

  /**
   * Generate detailed results table
   */
  private generateDetailedResults(manifest: TestManifest): string {
    const sections: string[] = [];

    sections.push('## 📋 Detailed Results\n');

    sections.push('| Step | Description | Status | Duration | Diff % |');
    sections.push('|------|-------------|--------|----------|--------|');

    for (const interaction of manifest.interactions) {
      const status = interaction.success ? '✅' : '❌';
      const diff = interaction.screenshots[0]?.diffPercentage?.toFixed(2) || 'N/A';

      sections.push(
        `| ${interaction.stepNumber} | ${interaction.node.label} | ${status} | ${interaction.duration}ms | ${diff}% |`
      );
    }

    return sections.join('\n');
  }

  /**
   * Generate update baseline instructions
   */
  private generateUpdateBaselineInstructions(manifest: TestManifest): string {
    return `
## 🔄 Update Baselines

If these changes are intentional, update the baselines:

\`\`\`bash
# Update all baselines
pnpm exec tsx src/visual/update-baselines.ts

# Or update specific test
pnpm exec tsx src/visual/update-baselines.ts --test "${manifest.diagramSource}"
\`\`\`

Then commit the updated baselines:

\`\`\`bash
git add test-baselines/
git commit -m "chore: update visual regression baselines"
git push
\`\`\`
`;
  }

  /**
   * Generate footer with metadata
   */
  private generateFooter(manifest: TestManifest): string {
    return `
<details>
<summary>📊 Test Metadata</summary>

- **Diagram Source:** \`${manifest.diagramSource}\`
- **Generated:** ${new Date(manifest.generatedAt).toLocaleString()}
- **Git Commit:** \`${manifest.gitCommit || 'N/A'}\`
- **Version:** ${manifest.version}

</details>

*Automated visual regression testing powered by CV Builder*
`;
  }

  /**
   * Post comment to PR
   */
  private async postComment(
    owner: string,
    repo: string,
    prNumber: number,
    markdown: string
  ): Promise<{ id: string; url: string }> {
    try {
      // Check if there's already a visual regression comment
      const existingComment = await this.findExistingComment(owner, repo, prNumber);

      if (existingComment) {
        // Update existing comment
        const result = execSync(
          `gh api repos/${owner}/${repo}/issues/comments/${existingComment.id} -X PATCH -f body='${markdown.replace(/'/g, "'\"'\"'")}'`,
          {
            encoding: 'utf-8',
            env: { ...process.env, GH_TOKEN: this.token },
          }
        );

        const data = JSON.parse(result);
        return {
          id: String(data.id),
          url: data.html_url,
        };
      } else {
        // Create new comment
        const result = execSync(
          `gh pr comment ${prNumber} --repo ${owner}/${repo} --body '${markdown.replace(/'/g, "'\"'\"'")}'`,
          {
            encoding: 'utf-8',
            env: { ...process.env, GH_TOKEN: this.token },
          }
        );

        // Parse comment URL from output
        const commentUrl = result.trim();
        const commentId = commentUrl.split('#issuecomment-')[1];

        return {
          id: commentId,
          url: commentUrl,
        };
      }
    } catch (error) {
      throw new Error(`Failed to post PR comment: ${error}`);
    }
  }

  /**
   * Find existing visual regression comment
   */
  private async findExistingComment(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{ id: string; url: string } | null> {
    try {
      const result = execSync(
        `gh api repos/${owner}/${repo}/issues/${prNumber}/comments`,
        {
          encoding: 'utf-8',
          env: { ...process.env, GH_TOKEN: this.token },
        }
      );

      const comments = JSON.parse(result);
      const botComment = comments.find((c: any) =>
        c.body.includes('🎨 Visual Regression Test Results')
      );

      if (botComment) {
        return {
          id: String(botComment.id),
          url: botComment.html_url,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Delete PR comment
   */
  async deleteComment(owner: string, repo: string, commentId: string): Promise<void> {
    try {
      execSync(
        `gh api repos/${owner}/${repo}/issues/comments/${commentId} -X DELETE`,
        {
          stdio: 'inherit',
          env: { ...process.env, GH_TOKEN: this.token },
        }
      );
    } catch (error) {
      throw new Error(`Failed to delete comment ${commentId}: ${error}`);
    }
  }
}

/**
 * Utility function to post results to PR
 */
export async function postResultsToPR(options: PRCommentOptions): Promise<PRCommentResult> {
  const reporter = new GitHubPRReporter();
  return reporter.postResults(options);
}
