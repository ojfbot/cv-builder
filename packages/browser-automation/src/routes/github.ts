/**
 * GitHub Integration Routes
 *
 * Endpoints for GitHub integration (screenshot uploads, PR comments)
 * Wraps the screenshot-commenter agent for programmatic access
 */

import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const router = Router();

interface AttachScreenshotsRequest {
  prOrIssueNumber: number;
  targetType: 'pr' | 'issue';
  screenshotDir?: string;
  message?: string;
}

/**
 * POST /api/github/attach-screenshots
 * Attach screenshots to PR or issue using screenshot-commenter agent
 */
router.post('/attach-screenshots', async (req: Request, res: Response) => {
  try {
    const {
      prOrIssueNumber,
      targetType,
      screenshotDir,
      message,
    }: AttachScreenshotsRequest = req.body;

    if (!prOrIssueNumber || !targetType) {
      res.status(400).json({
        success: false,
        error: 'prOrIssueNumber and targetType are required',
      });
      return;
    }

    console.log(`Attaching screenshots to ${targetType} #${prOrIssueNumber}`);

    // Build command to invoke screenshot-commenter script (now using TypeScript with @octokit)
    const scriptPath = path.resolve(
      __dirname,
      '../../../.agents/github/scripts/upload-screenshots.ts'
    );

    const command = `npx tsx "${scriptPath}" ${prOrIssueNumber} ${targetType} ${screenshotDir || 'auto-detect'}`;

    // Execute screenshot-commenter script
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.resolve(__dirname, '../../../'),
      env: {
        ...process.env,
        CUSTOM_MESSAGE: message || '',
      },
      timeout: 60000, // 1 minute timeout
    });

    console.log('Screenshot commenter output:', stdout);
    if (stderr) console.error('Screenshot commenter errors:', stderr);

    // Parse output to get comment URL
    const commentUrlMatch = stdout.match(/Comment URL: (https:\/\/github\.com\/[^\s]+)/);
    const commentUrl = commentUrlMatch ? commentUrlMatch[1] : null;

    const imagesMatch = stdout.match(/Attached (\d+) image/);
    const imagesAttached = imagesMatch ? parseInt(imagesMatch[1], 10) : 0;

    res.json({
      success: true,
      commentUrl,
      imagesAttached,
      output: stdout,
    });
  } catch (error) {
    console.error('GitHub attach error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to attach screenshots',
    });
  }
});

/**
 * GET /api/github/sessions
 * List all screenshot sessions available for upload
 */
router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const screenshotsRoot = path.resolve(__dirname, '../../../temp/screenshots');

    if (!fs.existsSync(screenshotsRoot)) {
      res.json({
        success: true,
        sessions: [],
      });
      return;
    }

    const entries = fs.readdirSync(screenshotsRoot, { withFileTypes: true });
    const sessions = entries
      .filter((entry) => entry.isDirectory())
      .map((dir) => {
        const sessionPath = path.join(screenshotsRoot, dir.name);
        const stats = fs.statSync(sessionPath);

        // Count screenshots in session
        const files = fs.readdirSync(sessionPath);
        const screenshots = files.filter((f) =>
          /\.(png|jpg|jpeg|gif)$/i.test(f)
        );

        // Check for manifest
        const hasManifest = files.includes('manifest.json');

        return {
          sessionId: dir.name,
          path: `temp/screenshots/${dir.name}`,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          screenshotCount: screenshots.length,
          hasManifest,
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sessions',
    });
  }
});

/**
 * GET /api/github/sessions/:id
 * Get details of a specific screenshot session
 */
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const sessionPath = path.resolve(__dirname, `../../../temp/screenshots/${sessionId}`);

    if (!fs.existsSync(sessionPath)) {
      res.status(404).json({
        success: false,
        error: `Session not found: ${sessionId}`,
      });
      return;
    }

    const files = fs.readdirSync(sessionPath);
    const screenshots = files
      .filter((f) => /\.(png|jpg|jpeg|gif)$/i.test(f))
      .map((filename) => {
        const filePath = path.join(sessionPath, filename);
        const stats = fs.statSync(filePath);

        return {
          filename,
          path: `temp/screenshots/${sessionId}/${filename}`,
          size: stats.size,
          created: stats.birthtime.toISOString(),
        };
      });

    // Load manifest if exists
    let manifest = null;
    const manifestPath = path.join(sessionPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }

    res.json({
      success: true,
      sessionId,
      screenshots,
      manifest,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session',
    });
  }
});

export default router;
