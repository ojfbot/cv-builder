/**
 * GitHub API Client
 *
 * Provides authenticated GitHub API client using @octokit/rest
 * with rate limit handling and automatic retries.
 */

import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';

const MyOctokit = Octokit.plugin(throttling);

export interface GitHubConfig {
  auth: string;
  owner?: string;
  repo?: string;
}

/**
 * Create GitHub client with throttling plugin
 */
export function createGitHubClient(config: GitHubConfig): Octokit {
  const octokit = new MyOctokit({
    auth: config.auth,
    throttle: {
      onRateLimit: (retryAfter, options, _octokit, retryCount) => {
        console.warn(
          `Rate limit hit for ${options.method} ${options.url}, retrying after ${retryAfter}s`
        );
        if (retryCount < 2) return true; // Retry up to 2 times
        return false;
      },
      onSecondaryRateLimit: (_retryAfter, options, _octokit) => {
        console.warn(
          `Secondary rate limit hit for ${options.method} ${options.url}`
        );
        return false; // Don't retry on secondary limits
      },
    },
  });

  return octokit;
}

// Singleton instance with auto-config
let _octokit: Octokit | null = null;

/**
 * Get singleton GitHub client instance
 * Automatically configures from environment variables
 */
export function getGitHubClient(): Octokit {
  if (!_octokit) {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    if (!token) {
      throw new Error(
        'GitHub token not found. Set GITHUB_TOKEN or GH_TOKEN environment variable.\n' +
          'Create a token at: https://github.com/settings/tokens'
      );
    }

    _octokit = createGitHubClient({ auth: token });
  }

  return _octokit;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetGitHubClient(): void {
  _octokit = null;
}
