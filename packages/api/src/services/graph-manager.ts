/**
 * GraphManager - Service for managing LangGraph agent-graph instances
 *
 * This service provides:
 * - Singleton graph instance for performance
 * - Thread management (create, retrieve, list)
 * - Graph invocation (streaming and non-streaming)
 * - Checkpoint access and state management
 * - Graceful initialization and error handling
 */

import {
  createCVBuilderGraph,
  streamGraph,
  invokeGraph,
  getGraphState,
  updateGraphState,
  createInitialState,
  createSQLiteThreadManager,
  getConfig,
  getLogger,
  type GraphConfig,
  type CVBuilderStateType,
  type Thread,
} from '@cv-builder/agent-graph';
import { HumanMessage } from '@langchain/core/messages';

const logger = getLogger('graph-manager');

class GraphManager {
  private static instance: GraphManager | null = null;

  private graph: ReturnType<typeof createCVBuilderGraph> | null = null;
  private threadManager: ReturnType<typeof createSQLiteThreadManager> | null = null;
  private initialized: boolean = false;
  private config: GraphConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): GraphManager {
    if (!GraphManager.instance) {
      GraphManager.instance = new GraphManager();
    }
    return GraphManager.instance;
  }

  /**
   * Initialize the graph manager with configuration
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      const appConfig = getConfig();

      if (!appConfig.anthropicApiKey) {
        throw new Error('Anthropic API key not found in configuration');
      }

      // Create graph config
      this.config = {
        apiKey: appConfig.anthropicApiKey,
        model: appConfig.model,
        temperature: appConfig.temperature,
        databaseType: appConfig.databaseType,
        databaseUrl: appConfig.databaseUrl,
        dbPath: appConfig.dbPath,
      };

      // Create compiled graph
      this.graph = createCVBuilderGraph(this.config);

      // Create thread manager
      this.threadManager = createSQLiteThreadManager(
        appConfig.dbPath || './cv_builder.db'
      );

      this.initialized = true;
      logger.info('GraphManager initialized successfully with LangGraph');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize GraphManager');
      throw new Error(
        'Failed to initialize graph services. Please check configuration.'
      );
    }
  }

  /**
   * Check if graph manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure manager is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.graph || !this.threadManager) {
      throw new Error('GraphManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Create a new thread
   */
  async createThread(
    userId: string,
    metadata?: Record<string, any>
  ): Promise<Thread> {
    this.ensureInitialized();

    const thread = await this.threadManager!.createThread({
      userId,
      metadata,
    });

    // Initialize thread state
    const initialState = createInitialState(userId, thread.id);

    await updateGraphState(
      this.graph!,
      initialState,
      {
        configurable: { thread_id: thread.id },
      }
    );

    return thread;
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<Thread | null> {
    this.ensureInitialized();
    return await this.threadManager!.getThread(threadId);
  }

  /**
   * List threads for a user
   */
  async listThreads(userId: string): Promise<Thread[]> {
    this.ensureInitialized();
    return await this.threadManager!.listThreads(userId);
  }

  /**
   * Update thread metadata
   */
  async updateThread(
    threadId: string,
    updates: { title?: string; metadata?: Record<string, any> }
  ): Promise<void> {
    this.ensureInitialized();
    await this.threadManager!.updateThread(threadId, updates);
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    this.ensureInitialized();
    await this.threadManager!.deleteThread(threadId);
  }

  /**
   * Invoke graph with a message (non-streaming)
   */
  async invoke(
    threadId: string,
    message: string,
    stateUpdates?: Partial<CVBuilderStateType>
  ): Promise<CVBuilderStateType> {
    this.ensureInitialized();

    const input: Partial<CVBuilderStateType> = {
      messages: [new HumanMessage(message)],
      ...stateUpdates,
    };

    const config = {
      configurable: { thread_id: threadId },
    };

    return await invokeGraph(this.graph!, input, config);
  }

  /**
   * Stream graph execution
   */
  async *stream(
    threadId: string,
    message: string,
    stateUpdates?: Partial<CVBuilderStateType>
  ): AsyncGenerator<CVBuilderStateType, void, unknown> {
    this.ensureInitialized();

    const input: Partial<CVBuilderStateType> = {
      messages: [new HumanMessage(message)],
      ...stateUpdates,
    };

    const config = {
      configurable: { thread_id: threadId },
    };

    yield* streamGraph(this.graph!, input, config);
  }

  /**
   * Get current state for a thread
   */
  async getState(threadId: string): Promise<CVBuilderStateType | null> {
    this.ensureInitialized();

    const config = {
      configurable: { thread_id: threadId },
    };

    return await getGraphState(this.graph!, config);
  }

  /**
   * Update state for a thread (for loading bio, jobs, etc.)
   */
  async updateState(
    threadId: string,
    updates: Partial<CVBuilderStateType>
  ): Promise<void> {
    this.ensureInitialized();

    const config = {
      configurable: { thread_id: threadId },
    };

    await updateGraphState(this.graph!, updates, config);
  }

  /**
   * List checkpoints for a thread (for debugging/admin)
   */
  async listCheckpoints(threadId: string): Promise<any[]> {
    this.ensureInitialized();

    // This would require accessing the checkpointer directly
    // For now, return empty array - can be implemented if needed
    return [];
  }

  /**
   * Get graph statistics
   */
  async getStats(): Promise<{
    totalThreads: number;
    threadsByUser: Record<string, number>;
  }> {
    this.ensureInitialized();

    const stats = await this.threadManager!.getStats();

    return stats;
  }
}

// Export singleton instance
export const graphManager = GraphManager.getInstance();
