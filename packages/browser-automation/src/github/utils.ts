/**
 * GitHub Utilities
 *
 * Helper functions for git operations and repository information.
 */

import { execSync } from 'child_process';

export interface RepoInfo {
  owner: string;
  repo: string;
}

/**
 * Get repository owner and name from git config
 */
export function getRepoInfo(): RepoInfo {
  try {
    // Get remote URL (e.g., git@github.com:owner/repo.git or https://github.com/owner/repo.git)
    const remoteUrl = execSync('git config --get remote.origin.url', {
      encoding: 'utf-8',
    }).trim();

    // Parse SSH format: git@github.com:owner/repo.git
    const sshMatch = remoteUrl.match(/git@github\.com:(.+?)\/(.+?)\.git/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // Parse HTTPS format: https://github.com/owner/repo.git
    const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/(.+?)\/(.+?)\.git/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    // Parse HTTPS format without .git: https://github.com/owner/repo
    const httpsNoGitMatch = remoteUrl.match(/https:\/\/github\.com\/(.+?)\/(.+?)$/);
    if (httpsNoGitMatch) {
      return { owner: httpsNoGitMatch[1], repo: httpsNoGitMatch[2] };
    }

    throw new Error(`Unable to parse GitHub repository from remote URL: ${remoteUrl}`);
  } catch (error) {
    throw new Error(
      `Failed to get repository info from git config: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * Get current git branch name
 */
export function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
}

/**
 * Get current commit SHA
 */
export function getCommitSha(): string {
  return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
}

/**
 * Stage, commit, and push files
 */
export async function commitAndPush(files: string[], message: string): Promise<string> {
  // Stage files - quote each path to prevent shell injection
  const quotedFiles = files.map(f => `"${f.replace(/"/g, '\\"')}"`).join(' ');
  execSync(`git add ${quotedFiles}`, { stdio: 'inherit' });

  // Commit - use stdin to avoid command injection
  execSync('git commit -F-', {
    input: message,
    encoding: 'utf-8',
    stdio: ['pipe', 'inherit', 'inherit']
  });

  // Push
  execSync('git push', { stdio: 'inherit' });

  // Return commit SHA after push
  return getCommitSha();
}

/**
 * Check if there are uncommitted changes for given paths
 */
export function hasUncommittedChanges(paths: string[]): boolean {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  return paths.some((path) => status.includes(path));
}

/**
 * Check if git working directory is clean
 */
export function isWorkingDirectoryClean(): boolean {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  return status.trim().length === 0;
}

/**
 * Get git remote URL
 */
export function getRemoteUrl(remote: string = 'origin'): string {
  return execSync(`git config --get remote.${remote}.url`, { encoding: 'utf-8' }).trim();
}
