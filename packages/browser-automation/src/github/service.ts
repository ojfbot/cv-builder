/**
 * GitHub Service Layer
 *
 * High-level GitHub operations for browser automation.
 * Wraps @octokit/rest client with domain-specific methods.
 */

import { Octokit } from '@octokit/rest';
import { getGitHubClient } from './client.js';
import { getRepoInfo } from './utils.js';
import fs from 'fs';
import path from 'path';

export interface AttachScreenshotsOptions {
  prOrIssueNumber: number;
  targetType: 'pr' | 'issue';
  screenshotDir?: string;
  message?: string;
}

export interface AttachScreenshotsResult {
  success: boolean;
  commentUrl: string;
  imagesAttached: number;
  commitSha: string;
}

export interface PRInfo {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  mergedAt: string | null;
  author: string;
  url: string;
}

export interface IssueInfo {
  number: number;
  title: string;
  state: string;
  author: string;
  url: string;
  labels: string[];
}

export interface PRScreenshotInfo {
  prNumber: number;
  state: 'open' | 'closed';
  mergedAt: string | null;
}

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor() {
    this.octokit = getGitHubClient();
    const repoInfo = getRepoInfo();
    this.owner = repoInfo.owner;
    this.repo = repoInfo.repo;
  }

  /**
   * Get PR information
   */
  async getPullRequest(prNumber: number): Promise<PRInfo> {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state,
      merged: data.merged || false,
      mergedAt: data.merged_at,
      author: data.user?.login || 'unknown',
      url: data.html_url,
    };
  }

  /**
   * Get issue information
   */
  async getIssue(issueNumber: number): Promise<IssueInfo> {
    const { data } = await this.octokit.rest.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state,
      author: data.user?.login || 'unknown',
      url: data.html_url,
      labels: data.labels.map((label) =>
        typeof label === 'string' ? label : label.name || ''
      ),
    };
  }

  /**
   * List all PRs with screenshot directories
   */
  async listPRsWithScreenshots(): Promise<PRScreenshotInfo[]> {
    const screenshotsBase = path.resolve(process.cwd(), 'temp/screenshots');

    if (!fs.existsSync(screenshotsBase)) {
      return [];
    }

    const entries = fs.readdirSync(screenshotsBase, { withFileTypes: true });
    const prInfos: PRScreenshotInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('pr-')) continue;

      const prNumber = parseInt(entry.name.match(/^pr-(\d+)$/)?.[1] || '0');
      if (!prNumber) continue;

      try {
        const { data: pr } = await this.octokit.rest.pulls.get({
          owner: this.owner,
          repo: this.repo,
          pull_number: prNumber,
        });

        prInfos.push({
          prNumber,
          state: pr.state as 'open' | 'closed',
          mergedAt: pr.merged_at,
        });
      } catch (error: any) {
        if (error.status === 404) {
          // PR doesn't exist, skip it
          continue;
        }
        console.warn(`Warning: Failed to fetch PR #${prNumber}:`, error.message);
      }
    }

    return prInfos;
  }

  /**
   * Create a comment on PR or issue
   */
  async createComment(
    issueNumber: number,
    body: string
  ): Promise<{ commentUrl: string; commentId: number }> {
    const { data } = await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body,
    });

    return {
      commentUrl: data.html_url,
      commentId: data.id,
    };
  }

  /**
   * List comments on a PR or issue
   */
  async listComments(issueNumber: number): Promise<Array<{
    id: number;
    author: string;
    body: string;
    createdAt: string;
    url: string;
  }>> {
    const { data } = await this.octokit.rest.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    });

    return data.map((comment) => ({
      id: comment.id,
      author: comment.user?.login || 'unknown',
      body: comment.body || '',
      createdAt: comment.created_at,
      url: comment.html_url,
    }));
  }

  /**
   * Get repository information
   */
  getRepoInfo(): { owner: string; repo: string } {
    return {
      owner: this.owner,
      repo: this.repo,
    };
  }
}

// Singleton instance
let _service: GitHubService | null = null;

/**
 * Get singleton GitHub service instance
 */
export function getGitHubService(): GitHubService {
  if (!_service) {
    _service = new GitHubService();
  }
  return _service;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetGitHubService(): void {
  _service = null;
}
