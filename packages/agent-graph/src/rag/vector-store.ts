/**
 * Vector Store Configuration
 *
 * Creates and manages vector stores for RAG retrieval.
 * Currently uses MemoryVectorStore for rapid prototyping.
 * TODO: Add sqlite-vec persistence in future iteration.
 */

import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { getLogger } from "../utils/logger";

const logger = getLogger("vector-store");

export interface VectorStoreConfig {
  openaiApiKey: string;
  embeddingModel?: string;
}

/**
 * Create embeddings model
 */
export function createEmbeddings(config: VectorStoreConfig): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    openAIApiKey: config.openaiApiKey,
    modelName: config.embeddingModel || "text-embedding-3-small",
  });
}

/**
 * Create an in-memory vector store
 *
 * NOTE: This is ephemeral and data is lost on restart.
 * For production, consider:
 * - sqlite-vec with better-sqlite3 (local persistence)
 * - Supabase with pgvector (hosted)
 * - Pinecone (cloud)
 */
export async function createVectorStore(
  config: VectorStoreConfig,
  initialDocuments?: Document[]
): Promise<MemoryVectorStore> {
  logger.info("Creating in-memory vector store");

  const embeddings = createEmbeddings(config);

  if (initialDocuments && initialDocuments.length > 0) {
    logger.debug({ docCount: initialDocuments.length }, "Initializing with documents");
    return await MemoryVectorStore.fromDocuments(initialDocuments, embeddings);
  }

  return new MemoryVectorStore(embeddings);
}

/**
 * Add documents to vector store
 */
export async function addDocuments(
  vectorStore: MemoryVectorStore,
  documents: Document[]
): Promise<void> {
  logger.info({ count: documents.length }, "Adding documents to vector store");

  await vectorStore.addDocuments(documents);

  logger.debug({ totalDocs: documents.length }, "Documents added successfully");
}

/**
 * Similarity search with scores
 */
export async function similaritySearchWithScore(
  vectorStore: MemoryVectorStore,
  query: string,
  k: number = 4
): Promise<Array<[Document, number]>> {
  logger.debug({ query, k }, "Performing similarity search");

  const results = await vectorStore.similaritySearchWithScore(query, k);

  logger.debug({ resultCount: results.length }, "Search completed");

  return results;
}

/**
 * Maximum Marginal Relevance (MMR) search for diversity
 */
export async function maxMarginalRelevanceSearch(
  vectorStore: MemoryVectorStore,
  query: string,
  options: {
    k?: number;
    fetchK?: number;
    lambda?: number;
  } = {}
): Promise<Document[]> {
  const { k = 4, fetchK = 20, lambda = 0.5 } = options;

  logger.debug({ query, k, fetchK, lambda }, "Performing MMR search");

  const results = await vectorStore.maxMarginalRelevanceSearch(
    query,
    {
      k,
      fetchK,
      lambda,
    }
  );

  logger.debug({ resultCount: results.length }, "MMR search completed");

  return results;
}
