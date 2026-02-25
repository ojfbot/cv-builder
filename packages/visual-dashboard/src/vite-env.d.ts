/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  /** Public S3 bucket base URL, e.g. https://my-bucket.s3.us-east-1.amazonaws.com */
  readonly VITE_S3_BASE_URL?: string;
  /** S3 key namespace matching the CI pipeline (default: ojfbot-cv-builder) */
  readonly VITE_S3_PREFIX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
