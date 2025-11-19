/**
 * GitHub Service Tests
 */

import { GitHubService, getGitHubService, resetGitHubService } from '../service.js';
import { getGitHubClient, resetGitHubClient } from '../client.js';
import { Octokit } from '@octokit/rest';

// Mock the GitHub client
jest.mock('../client.js');

const mockedGetGitHubClient = getGitHubClient as jest.MockedFunction<typeof getGitHubClient>;
const mockedResetGitHubClient = resetGitHubClient as jest.MockedFunction<typeof resetGitHubClient>;

describe('GitHubService', () => {
  let mockOctokit: jest.Mocked<Octokit>;
  let service: GitHubService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetGitHubService();

    // Create mock Octokit instance
    mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn(),
        },
        issues: {
          get: jest.fn(),
          createComment: jest.fn(),
          listComments: jest.fn(),
        },
      },
    } as any;

    mockedGetGitHubClient.mockReturnValue(mockOctokit as any);
    mockedResetGitHubClient.mockImplementation(() => {});
  });

  describe('getPullRequest', () => {
    it('should fetch pull request successfully', async () => {
      const mockPRData = {
        number: 42,
        title: 'Test PR',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/42',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        merged: false,
        merged_at: null,
      };

      (mockOctokit.rest.pulls.get as jest.Mock).mockResolvedValue({
        data: mockPRData,
      });

      const service = getGitHubService();
      const result = await service.getPullRequest(42);

      expect(result).toEqual({
        prNumber: 42,
        title: 'Test PR',
        state: 'open',
        htmlUrl: 'https://github.com/owner/repo/pull/42',
        author: 'testuser',
        headRef: 'feature-branch',
        baseRef: 'main',
        merged: false,
        mergedAt: null,
      });

      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
        owner: 'ojfbot',
        repo: 'cv-builder',
        pull_number: 42,
      });
    });

    it('should handle merged pull request', async () => {
      const mockPRData = {
        number: 41,
        title: 'Merged PR',
        state: 'closed',
        html_url: 'https://github.com/owner/repo/pull/41',
        user: { login: 'testuser' },
        head: { ref: 'feature' },
        base: { ref: 'main' },
        merged: true,
        merged_at: '2025-11-18T10:30:00Z',
      };

      (mockOctokit.rest.pulls.get as jest.Mock).mockResolvedValue({
        data: mockPRData,
      });

      const service = getGitHubService();
      const result = await service.getPullRequest(41);

      expect(result.merged).toBe(true);
      expect(result.mergedAt).toBe('2025-11-18T10:30:00Z');
    });

    it('should throw error for non-existent PR (404)', async () => {
      const error: any = new Error('Not Found');
      error.status = 404;
      (mockOctokit.rest.pulls.get as jest.Mock).mockRejectedValue(error);

      const service = getGitHubService();
      await expect(service.getPullRequest(999)).rejects.toThrow('Not Found');
    });
  });

  describe('getIssue', () => {
    it('should fetch issue successfully', async () => {
      const mockIssueData = {
        number: 21,
        title: 'Test Issue',
        state: 'open',
        html_url: 'https://github.com/owner/repo/issues/21',
        user: { login: 'issueauthor' },
        body: 'Issue description',
      };

      (mockOctokit.rest.issues.get as jest.Mock).mockResolvedValue({
        data: mockIssueData,
      });

      const service = getGitHubService();
      const result = await service.getIssue(21);

      expect(result).toEqual({
        issueNumber: 21,
        title: 'Test Issue',
        state: 'open',
        htmlUrl: 'https://github.com/owner/repo/issues/21',
        author: 'issueauthor',
        body: 'Issue description',
      });

      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: 'ojfbot',
        repo: 'cv-builder',
        issue_number: 21,
      });
    });

    it('should throw error for non-existent issue (404)', async () => {
      const error: any = new Error('Not Found');
      error.status = 404;
      (mockOctokit.rest.issues.get as jest.Mock).mockRejectedValue(error);

      const service = getGitHubService();
      await expect(service.getIssue(999)).rejects.toThrow('Not Found');
    });
  });

  describe('createComment', () => {
    it('should create comment successfully', async () => {
      const mockCommentData = {
        id: 123456,
        html_url: 'https://github.com/owner/repo/issues/42#issuecomment-123456',
      };

      (mockOctokit.rest.issues.createComment as jest.Mock).mockResolvedValue({
        data: mockCommentData,
      });

      const service = getGitHubService();
      const result = await service.createComment(42, 'Test comment body');

      expect(result).toEqual({
        commentUrl: 'https://github.com/owner/repo/issues/42#issuecomment-123456',
        commentId: 123456,
      });

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'ojfbot',
        repo: 'cv-builder',
        issue_number: 42,
        body: 'Test comment body',
      });
    });

    it('should handle permission denied (403)', async () => {
      const error: any = new Error('Forbidden');
      error.status = 403;
      (mockOctokit.rest.issues.createComment as jest.Mock).mockRejectedValue(error);

      const service = getGitHubService();
      await expect(service.createComment(42, 'Test')).rejects.toThrow('Forbidden');
    });
  });

  describe('listComments', () => {
    it('should list comments successfully', async () => {
      const mockCommentsData = [
        {
          id: 1,
          user: { login: 'user1' },
          body: 'First comment',
          created_at: '2025-11-18T10:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/42#issuecomment-1',
        },
        {
          id: 2,
          user: { login: 'user2' },
          body: 'Second comment',
          created_at: '2025-11-18T11:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/42#issuecomment-2',
        },
      ];

      (mockOctokit.rest.issues.listComments as jest.Mock).mockResolvedValue({
        data: mockCommentsData,
      });

      const service = getGitHubService();
      const result = await service.listComments(42);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        commentId: 1,
        author: 'user1',
        body: 'First comment',
        createdAt: '2025-11-18T10:00:00Z',
        htmlUrl: 'https://github.com/owner/repo/issues/42#issuecomment-1',
      });

      expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledWith({
        owner: 'ojfbot',
        repo: 'cv-builder',
        issue_number: 42,
      });
    });

    it('should return empty array if no comments', async () => {
      (mockOctokit.rest.issues.listComments as jest.Mock).mockResolvedValue({
        data: [],
      });

      const service = getGitHubService();
      const result = await service.listComments(42);

      expect(result).toEqual([]);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = getGitHubService();
      const service2 = getGitHubService();
      expect(service1).toBe(service2);
    });

    it('should return new instance after reset', () => {
      const service1 = getGitHubService();
      resetGitHubService();
      const service2 = getGitHubService();
      expect(service1).not.toBe(service2);
    });
  });
});
