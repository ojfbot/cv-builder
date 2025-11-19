/**
 * GitHub Integration Module
 *
 * Exports GitHub client, utilities, and service for browser automation.
 */

export { createGitHubClient, getGitHubClient, resetGitHubClient } from './client.js';
export type { GitHubConfig } from './client.js';

export {
  getRepoInfo,
  getCurrentBranch,
  getCommitSha,
  commitAndPush,
  hasUncommittedChanges,
  isWorkingDirectoryClean,
  getRemoteUrl,
} from './utils.js';
export type { RepoInfo } from './utils.js';
