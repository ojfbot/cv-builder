/**
 * Base Retriever
 *
 * Common interface and utilities for all retrievers.
 */

import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { VectorStoreConfig, createVectorStore, addDocuments } from "../vector-store";
import { getLogger } from "../../utils/logger";

const logger = getLogger("base-retriever");

export interface Retriever {
  /**
   * Retrieve relevant documents for a query
   */
  retrieve(query: string, k?: number): Promise<Document[]>;

  /**
   * Add new documents to the retriever's index
   */
  addDocuments(documents: Document[]): Promise<void>;

  /**
   * Get retriever stats
   */
  getStats(): Promise<{ documentCount: number }>;
}

/**
 * Base retriever implementation using vector store
 */
export abstract class BaseRetriever implements Retriever {
  protected vectorStore: MemoryVectorStore | null = null;
  protected config: VectorStoreConfig;
  protected readonly name: string;

  constructor(name: string, config: VectorStoreConfig) {
    this.name = name;
    this.config = config;
  }

  /**
   * Initialize the retriever with seed data
   */
  protected abstract getSeedDocuments(): Promise<Document[]>;

  /**
   * Ensure vector store is initialized
   */
  protected async ensureInitialized(): Promise<void> {
    if (!this.vectorStore) {
      logger.info({ retriever: this.name }, "Initializing retriever");

      const seedDocs = await this.getSeedDocuments();
      this.vectorStore = await createVectorStore(this.config, seedDocs);

      logger.info(
        { retriever: this.name, docCount: seedDocs.length },
        "Retriever initialized"
      );
    }
  }

  /**
   * Retrieve relevant documents
   */
  async retrieve(query: string, k: number = 4): Promise<Document[]> {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error(`${this.name} retriever not initialized`);
    }

    logger.debug({ retriever: this.name, query, k }, "Retrieving documents");

    const results = await this.vectorStore.similaritySearch(query, k);

    logger.debug(
      { retriever: this.name, resultCount: results.length },
      "Documents retrieved"
    );

    return results;
  }

  /**
   * Add documents to retriever
   */
  async addDocuments(documents: Document[]): Promise<void> {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      throw new Error(`${this.name} retriever not initialized`);
    }

    await addDocuments(this.vectorStore, documents);

    logger.info(
      { retriever: this.name, count: documents.length },
      "Documents added to retriever"
    );
  }

  /**
   * Get stats
   */
  async getStats(): Promise<{ documentCount: number }> {
    await this.ensureInitialized();

    if (!this.vectorStore) {
      return { documentCount: 0 };
    }

    // MemoryVectorStore doesn't expose count, so we estimate
    // In a real implementation with sqlite-vec, we'd query the DB
    return { documentCount: 0 };
  }
}
