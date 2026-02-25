/**
 * S3 Screenshot Uploader
 *
 * Uploads Playwright screenshot files to AWS S3 and returns their public URLs.
 * Used by the CI pipeline to make screenshots accessible as draw.io image sources.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export interface S3Config {
  bucket: string;
  region: string;
  /** Key prefix, e.g. "screenshots/run-42" */
  prefix: string;
  /** Optional — falls back to AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars */
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface UploadResult {
  filename: string;
  /** Full S3 key including prefix */
  s3Key: string;
  /** Public HTTPS URL */
  url: string;
}

export class S3Uploader {
  private client: S3Client;
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
    });
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'no-cache, no-store',
      })
    );
    return this.publicUrl(key);
  }

  async uploadFile(filePath: string, key: string): Promise<string> {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.xml' || ext === '.drawio'
          ? 'application/xml'
          : 'application/octet-stream';

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: content,
        ContentType: contentType,
        // Screenshots for a given run are immutable
        CacheControl: 'public, max-age=31536000',
      })
    );

    return this.publicUrl(key);
  }

  /**
   * Upload all files with the given extensions from a directory.
   * Returns an array of results keyed by bare filename (no directory).
   */
  async uploadDirectory(
    dirPath: string,
    extensions: string[] = ['.png']
  ): Promise<UploadResult[]> {
    if (!fs.existsSync(dirPath)) {
      console.warn(`[S3Uploader] Directory not found, skipping: ${dirPath}`);
      return [];
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((f) => extensions.includes(path.extname(f).toLowerCase()));

    return Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(dirPath, filename);
        const s3Key = `${this.config.prefix}/${filename}`;
        console.log(`  Uploading ${filename} → s3://${this.config.bucket}/${s3Key}`);
        const url = await this.uploadFile(filePath, s3Key);
        return { filename, s3Key, url };
      })
    );
  }

  publicUrl(key: string): string {
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}

/**
 * Build S3Config from environment variables.
 * Expected: S3_BUCKET, AWS_REGION, GITHUB_RUN_NUMBER (for the prefix).
 */
export function s3ConfigFromEnv(): S3Config {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';
  const runNumber = process.env.GITHUB_RUN_NUMBER || 'local';
  const repo = (process.env.GITHUB_REPOSITORY || 'cv-builder')
    .replace('/', '-')
    .toLowerCase();

  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is required');
  }

  return {
    bucket,
    region,
    prefix: `${repo}/run-${runNumber}`,
    // Credentials are picked up automatically from AWS_ACCESS_KEY_ID /
    // AWS_SECRET_ACCESS_KEY env vars by the SDK — no need to pass them explicitly.
  };
}
