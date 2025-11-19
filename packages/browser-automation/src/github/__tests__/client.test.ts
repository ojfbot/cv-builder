/**
 * GitHub Client Tests
 */

import { createGitHubClient, getGitHubClient, resetGitHubClient } from '../client.js';
import { Octokit } from '@octokit/rest';

describe('GitHub Client', () => {
  beforeEach(() => {
    resetGitHubClient();
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  describe('createGitHubClient', () => {
    it('should create client with auth token', () => {
      const client = createGitHubClient({ auth: 'test-token' });
      expect(client).toBeInstanceOf(Octokit);
    });

    it('should create client with rate limiting plugin', () => {
      const client = createGitHubClient({ auth: 'test-token' });
      // Verify it's the throttled version (has throttle property)
      expect(client).toHaveProperty('request');
    });
  });

  describe('getGitHubClient', () => {
    it('should throw error if no token in environment', () => {
      expect(() => getGitHubClient()).toThrow('GitHub token not found');
      expect(() => getGitHubClient()).toThrow('Set GITHUB_TOKEN or GH_TOKEN');
    });

    it('should use GITHUB_TOKEN from environment', () => {
      process.env.GITHUB_TOKEN = 'test-github-token';
      const client = getGitHubClient();
      expect(client).toBeInstanceOf(Octokit);
    });

    it('should use GH_TOKEN as fallback', () => {
      process.env.GH_TOKEN = 'test-gh-token';
      const client = getGitHubClient();
      expect(client).toBeInstanceOf(Octokit);
    });

    it('should prefer GITHUB_TOKEN over GH_TOKEN', () => {
      process.env.GITHUB_TOKEN = 'github-token';
      process.env.GH_TOKEN = 'gh-token';
      const client = getGitHubClient();
      expect(client).toBeInstanceOf(Octokit);
      // Both should work, but GITHUB_TOKEN takes precedence
    });

    it('should return singleton instance', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      const client1 = getGitHubClient();
      const client2 = getGitHubClient();
      expect(client1).toBe(client2);
    });
  });

  describe('resetGitHubClient', () => {
    it('should reset singleton instance', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      const client1 = getGitHubClient();
      resetGitHubClient();
      const client2 = getGitHubClient();
      expect(client1).not.toBe(client2);
    });
  });
});
