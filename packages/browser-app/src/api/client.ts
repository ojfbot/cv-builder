import type { Bio, JobListing } from '@cv-builder/agent-core';

/**
 * API Client Configuration
 */
interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Conversation message type
 */
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * API Client for CV Builder backend
 *
 * This client provides a robust, type-safe interface to the CV Builder API.
 * It follows best practices for API communication:
 * - Proper error handling and retry logic
 * - Request/response validation
 * - Timeout management
 * - Streaming support for real-time responses
 * - Extensible for future authentication methods
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000; // 30 seconds default
  }

  /**
   * Make a fetch request with timeout and error handling
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Parse API response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: response.statusText, statusCode: response.status },
      }));
      throw new Error(errorData.error?.message || 'API request failed');
    }

    const data: ApiResponse<T> = await response.json();
    if (!data.success || !data.data) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/health`);
    return this.parseResponse(response);
  }

  /**
   * Send a chat message and get response
   */
  async chat(
    message: string,
    conversationHistory?: ConversationMessage[]
  ): Promise<{ response: string; conversationHistory: ConversationMessage[] }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, conversationHistory }),
    });

    return this.parseResponse(response);
  }

  /**
   * Stream a chat message response
   */
  async chatStream(
    message: string,
    onChunk: (chunk: string) => void,
    conversationHistory?: ConversationMessage[]
  ): Promise<ConversationMessage[]> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      body: JSON.stringify({ message, conversationHistory }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let finalHistory: ConversationMessage[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'done') {
              finalHistory = data.conversationHistory;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            } else if (data.chunk) {
              onChunk(data.chunk);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return finalHistory;
  }

  /**
   * Generate a resume
   */
  async generateResume(
    bio: Bio,
    jobListing?: JobListing,
    format: 'markdown' | 'json' = 'markdown'
  ): Promise<{ resume: string }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/resume/generate`, {
      method: 'POST',
      body: JSON.stringify({ bio, jobListing, format }),
    });

    return this.parseResponse(response);
  }

  /**
   * Tailor a resume to a specific job
   */
  async tailorResume(
    bio: Bio,
    jobListing: JobListing,
    existingResume?: string
  ): Promise<{ resume: string }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/resume/tailor`, {
      method: 'POST',
      body: JSON.stringify({ bio, jobListing, existingResume }),
    });

    return this.parseResponse(response);
  }

  /**
   * Analyze a job listing
   */
  async analyzeJob(
    jobListing: JobListing,
    bio?: Bio
  ): Promise<{ analysis: string }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/job/analyze`, {
      method: 'POST',
      body: JSON.stringify({ jobListing, bio }),
    });

    return this.parseResponse(response);
  }

  /**
   * Analyze skills gap and generate learning path
   */
  async analyzeSkillsGap(
    bio: Bio,
    jobListing: JobListing
  ): Promise<{ learningPath: string }> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/job/skills-gap`, {
      method: 'POST',
      body: JSON.stringify({ bio, jobListing }),
    });

    return this.parseResponse(response);
  }

  /**
   * Generate a cover letter
   */
  async generateCoverLetter(
    bio: Bio,
    jobListing: JobListing,
    tone?: 'professional' | 'enthusiastic' | 'formal' | 'casual'
  ): Promise<{ coverLetter: string }> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/interview/cover-letter`,
      {
        method: 'POST',
        body: JSON.stringify({ bio, jobListing, tone }),
      }
    );

    return this.parseResponse(response);
  }

  /**
   * Prepare interview materials
   */
  async prepareInterview(
    bio: Bio,
    jobListing: JobListing,
    resume?: string
  ): Promise<{ preparation: string }> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/interview/prepare`,
      {
        method: 'POST',
        body: JSON.stringify({ bio, jobListing, resume }),
      }
    );

    return this.parseResponse(response);
  }

  /**
   * Upload and parse a resume file
   */
  async uploadResume(file: File): Promise<{
    text: string;
    metadata: {
      fileType: string;
      originalFilename: string;
      uploadDate: string;
      pageCount?: number;
      wordCount: number;
    };
    storedPath: string;
  }> {
    const formData = new FormData();
    formData.append('resume', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds for file upload

    try {
      const response = await fetch(`${this.baseUrl}/upload/resume`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      });

      clearTimeout(timeoutId);
      return this.parseResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Upload timeout - file may be too large or connection is slow');
      }
      throw error;
    }
  }
}

/**
 * Create an API client instance
 */
export function createApiClient(config?: Partial<ApiClientConfig>): ApiClient {
  const baseUrl =
    config?.baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  return new ApiClient({
    baseUrl,
    timeout: config?.timeout,
  });
}

/**
 * Default API client instance
 */
export const apiClient = createApiClient();
