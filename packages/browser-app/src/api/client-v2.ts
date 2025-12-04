/**
 * V2 API Client with LangGraph Thread Support
 *
 * This client provides access to the V2 LangGraph-based API with:
 * - Thread-based conversations
 * - State persistence
 * - Streaming support with state updates
 * - RAG-enhanced responses
 */

export interface Thread {
  threadId: string;
  userId?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadMessage {
  messageId: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ThreadWithMessages extends Thread {
  messages: ThreadMessage[];
}

export interface ChatRequest {
  threadId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  message: string;
  threadId: string;
  state?: {
    expertResults?: Record<string, unknown>;
    ragContext?: Record<string, unknown>;
    routingDecision?: {
      primaryNode: string;
      parallelNodes: string[];
      requiresRAG: boolean;
    };
  };
}

export interface StreamEvent {
  type: 'chunk' | 'state_update' | 'node_start' | 'node_end' | 'done' | 'error';
  data?: unknown;
  chunk?: string;
  node?: string;
  error?: string;
  message?: string;
  threadId?: string;
  state?: Record<string, unknown>;
}

export interface ApiClientV2Config {
  baseUrl: string;
  timeout?: number;
}

/**
 * V2 API Client for LangGraph-based orchestration
 */
export class ApiClientV2 {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiClientV2Config) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 60000; // 60 seconds for LangGraph workflows
  }

  /**
   * Make a fetch request with timeout
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
   * Parse JSON response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: response.statusText },
      }));
      throw new Error(errorData.error?.message || 'API request failed');
    }

    return response.json();
  }

  /**
   * Create a new conversation thread
   */
  async createThread(metadata?: {
    userId?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Thread> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/threads`, {
      method: 'POST',
      body: JSON.stringify(metadata || {}),
    });

    return this.parseResponse<Thread>(response);
  }

  /**
   * List all threads
   */
  async listThreads(options?: {
    userId?: string;
    limit?: number;
  }): Promise<Thread[]> {
    const params = new URLSearchParams();
    if (options?.userId) params.append('userId', options.userId);
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `${this.baseUrl}/threads${params.toString() ? `?${params}` : ''}`;
    const response = await this.fetchWithTimeout(url);

    return this.parseResponse<Thread[]>(response);
  }

  /**
   * Get a thread by ID with its message history
   */
  async getThread(threadId: string): Promise<ThreadWithMessages> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/threads/${threadId}`
    );

    return this.parseResponse<ThreadWithMessages>(response);
  }

  /**
   * Update thread metadata
   */
  async updateThread(
    threadId: string,
    updates: {
      title?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Thread> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/threads/${threadId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );

    return this.parseResponse<Thread>(response);
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<{ success: boolean }> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/threads/${threadId}`,
      {
        method: 'DELETE',
      }
    );

    return this.parseResponse<{ success: boolean }>(response);
  }

  /**
   * Send a chat message (non-streaming)
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return this.parseResponse<ChatResponse>(response);
  }

  /**
   * Send a chat message with streaming
   */
  async chatStream(
    request: ChatRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<void> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as StreamEvent;
              onEvent(event);

              // Break on done or error
              if (event.type === 'done' || event.type === 'error') {
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get the full conversation history for a thread
   */
  async getConversationHistory(threadId: string): Promise<ThreadMessage[]> {
    const thread = await this.getThread(threadId);
    return thread.messages;
  }
}

/**
 * Create a V2 API client instance
 */
export function createApiClientV2(config?: Partial<ApiClientV2Config>): ApiClientV2 {
  const baseUrl =
    config?.baseUrl ||
    import.meta.env.VITE_API_V2_URL ||
    'http://localhost:3001/api/v2';

  return new ApiClientV2({
    baseUrl,
    timeout: config?.timeout,
  });
}

/**
 * Default V2 API client instance
 */
export const apiClientV2 = createApiClientV2();
