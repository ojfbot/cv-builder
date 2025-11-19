/**
 * GitHub Utils Tests
 */

import {
  getRepoInfo,
  getCurrentBranch,
  getCommitSha,
  hasUncommittedChanges,
  isWorkingDirectoryClean,
  getRemoteUrl,
} from '../utils.js';
import { execSync } from 'child_process';

jest.mock('child_process');

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitHub Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRepoInfo', () => {
    it('should parse SSH remote URL', () => {
      mockedExecSync.mockReturnValue(Buffer.from('git@github.com:owner/repo.git\n'));

      const info = getRepoInfo();

      expect(info).toEqual({ owner: 'owner', repo: 'repo' });
      expect(mockedExecSync).toHaveBeenCalledWith(
        'git config --get remote.origin.url',
        expect.any(Object)
      );
    });

    it('should parse HTTPS remote URL with .git', () => {
      mockedExecSync.mockReturnValue(Buffer.from('https://github.com/owner/repo.git\n'));

      const info = getRepoInfo();

      expect(info).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse HTTPS remote URL without .git', () => {
      mockedExecSync.mockReturnValue(Buffer.from('https://github.com/owner/repo\n'));

      const info = getRepoInfo();

      expect(info).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should throw error for invalid URL', () => {
      mockedExecSync.mockReturnValue(Buffer.from('invalid-url\n'));

      expect(() => getRepoInfo()).toThrow('Unable to parse GitHub repository');
    });

    it('should throw error if git command fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      expect(() => getRepoInfo()).toThrow('Failed to get repository info');
    });
  });

  describe('getCurrentBranch', () => {
    it('should get current branch name', () => {
      mockedExecSync.mockReturnValue(Buffer.from('main\n'));

      const branch = getCurrentBranch();

      expect(branch).toBe('main');
      expect(mockedExecSync).toHaveBeenCalledWith(
        'git rev-parse --abbrev-ref HEAD',
        expect.any(Object)
      );
    });

    it('should handle different branch names', () => {
      mockedExecSync.mockReturnValue(Buffer.from('feature/my-branch\n'));

      const branch = getCurrentBranch();

      expect(branch).toBe('feature/my-branch');
    });
  });

  describe('getCommitSha', () => {
    it('should get current commit SHA', () => {
      const mockSha = 'abc123def456789';
      mockedExecSync.mockReturnValue(Buffer.from(`${mockSha}\n`));

      const sha = getCommitSha();

      expect(sha).toBe(mockSha);
      expect(mockedExecSync).toHaveBeenCalledWith('git rev-parse HEAD', expect.any(Object));
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return true if path has uncommitted changes', () => {
      mockedExecSync.mockReturnValue(Buffer.from('M  temp/screenshots/pr-21/image.png\n'));

      const hasChanges = hasUncommittedChanges(['temp/screenshots/pr-21']);

      expect(hasChanges).toBe(true);
    });

    it('should return false if path has no uncommitted changes', () => {
      mockedExecSync.mockReturnValue(Buffer.from('M  other/file.txt\n'));

      const hasChanges = hasUncommittedChanges(['temp/screenshots/pr-21']);

      expect(hasChanges).toBe(false);
    });

    it('should return false if working directory is clean', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''));

      const hasChanges = hasUncommittedChanges(['temp/screenshots/pr-21']);

      expect(hasChanges).toBe(false);
    });

    it('should handle multiple paths', () => {
      mockedExecSync.mockReturnValue(Buffer.from('M  temp/screenshots/pr-22/image.png\n'));

      const hasChanges = hasUncommittedChanges(['temp/screenshots/pr-21', 'temp/screenshots/pr-22']);

      expect(hasChanges).toBe(true);
    });
  });

  describe('isWorkingDirectoryClean', () => {
    it('should return true if working directory is clean', () => {
      mockedExecSync.mockReturnValue(Buffer.from(''));

      const isClean = isWorkingDirectoryClean();

      expect(isClean).toBe(true);
    });

    it('should return false if there are uncommitted changes', () => {
      mockedExecSync.mockReturnValue(Buffer.from('M  file.txt\n'));

      const isClean = isWorkingDirectoryClean();

      expect(isClean).toBe(false);
    });
  });

  describe('getRemoteUrl', () => {
    it('should get origin remote URL by default', () => {
      mockedExecSync.mockReturnValue(Buffer.from('git@github.com:owner/repo.git\n'));

      const url = getRemoteUrl();

      expect(url).toBe('git@github.com:owner/repo.git');
      expect(mockedExecSync).toHaveBeenCalledWith(
        'git config --get remote.origin.url',
        expect.any(Object)
      );
    });

    it('should get specified remote URL', () => {
      mockedExecSync.mockReturnValue(Buffer.from('git@github.com:owner/fork.git\n'));

      const url = getRemoteUrl('upstream');

      expect(url).toBe('git@github.com:owner/fork.git');
      expect(mockedExecSync).toHaveBeenCalledWith(
        'git config --get remote.upstream.url',
        expect.any(Object)
      );
    });
  });
});
