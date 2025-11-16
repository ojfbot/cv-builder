/**
 * Automated Screenshot Cleanup
 *
 * Removes old screenshot sessions to free disk space
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../temp/screenshots');
const MAX_AGE_DAYS = parseInt(process.env.SCREENSHOT_MAX_AGE_DAYS || '30', 10);

export interface CleanupResult {
  deletedSessions: number;
  deletedFiles: number;
  freedSpace: number;
}

/**
 * Clean up old screenshot sessions
 */
export async function cleanupOldScreenshots(): Promise<CleanupResult> {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    return { deletedSessions: 0, deletedFiles: 0, freedSpace: 0 };
  }

  const now = Date.now();
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  let deletedSessions = 0;
  let deletedFiles = 0;
  let freedSpace = 0;

  const sessions = fs.readdirSync(SCREENSHOTS_DIR);

  for (const session of sessions) {
    const sessionPath = path.join(SCREENSHOTS_DIR, session);
    const stats = fs.statSync(sessionPath);

    if (!stats.isDirectory()) continue;

    const age = now - stats.mtimeMs;

    if (age > maxAge) {
      console.log(
        `Deleting old session: ${session} (${Math.round(age / (24 * 60 * 60 * 1000))} days old)`
      );

      // Calculate size before deletion
      const files = fs.readdirSync(sessionPath);
      for (const file of files) {
        const filePath = path.join(sessionPath, file);
        try {
          const fileStats = fs.statSync(filePath);
          freedSpace += fileStats.size;
          deletedFiles++;
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }
      }

      // Delete directory
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        deletedSessions++;
      } catch (error) {
        console.error(`Error deleting session ${session}:`, error);
      }
    }
  }

  return { deletedSessions, deletedFiles, freedSpace };
}

/**
 * Schedule periodic cleanup
 */
export function scheduleCleanup(): void {
  const ONE_DAY = 24 * 60 * 60 * 1000;

  setInterval(async () => {
    console.log('Running scheduled screenshot cleanup...');
    const result = await cleanupOldScreenshots();
    console.log('Cleanup complete:', {
      deletedSessions: result.deletedSessions,
      deletedFiles: result.deletedFiles,
      freedSpace: `${(result.freedSpace / (1024 * 1024)).toFixed(2)} MB`,
    });
  }, ONE_DAY);

  console.log(`Screenshot cleanup scheduled (runs daily, deletes sessions older than ${MAX_AGE_DAYS} days)`);
}
