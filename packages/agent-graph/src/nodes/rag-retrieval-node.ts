/**
 * RAG Retrieval Node
 *
 * Retrieves relevant context from vector stores to enrich agent responses.
 */

import { AIMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "./types";
import { VectorStoreConfig } from "../rag/vector-store";
import {
  ResumeTemplatesRetriever,
  InterviewPrepRetriever,
  LearningResourcesRetriever,
} from "../rag/retrievers";
import { getLogger } from "../utils/logger";

const logger = getLogger("rag-retrieval-node");

export interface RAGNodeOptions extends NodeOptions {
  openaiApiKey?: string;
}

// Singleton retrievers to avoid re-initializing on every call
let resumeRetriever: ResumeTemplatesRetriever | null = null;
let interviewRetriever: InterviewPrepRetriever | null = null;
let learningRetriever: LearningResourcesRetriever | null = null;

function getRetrievers(config: VectorStoreConfig) {
  if (!resumeRetriever) {
    resumeRetriever = new ResumeTemplatesRetriever(config);
  }
  if (!interviewRetriever) {
    interviewRetriever = new InterviewPrepRetriever(config);
  }
  if (!learningRetriever) {
    learningRetriever = new LearningResourcesRetriever(config);
  }

  return { resumeRetriever, interviewRetriever, learningRetriever };
}

/**
 * Create RAG retrieval node
 */
export function createRAGRetrievalNode(options: RAGNodeOptions) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.info("Retrieving RAG context");

    // Check if OpenAI API key is available
    if (!options.openaiApiKey) {
      logger.warn("OpenAI API key not configured, skipping RAG retrieval");
      return {
        messages: [new AIMessage("RAG retrieval skipped: OpenAI API key not configured")],
        currentAgent: "ragRetrieval",
        nextAction: "done",
      };
    }

    // Determine what to retrieve based on state
    let query = "";
    let retrieverType: "resume" | "interview" | "learning" = "resume";

    // Analyze current agent to determine retrieval strategy
    if (state.currentAgent === "tailoring" || state.currentAgent === "resumeGenerator") {
      query = state.currentJob
        ? `Resume best practices for ${state.currentJob.title} position`
        : "Professional resume writing best practices";
      retrieverType = "resume";
    } else if (state.currentAgent === "interviewCoach") {
      query = state.currentJob
        ? `Interview preparation for ${state.currentJob.title}`
        : "General interview preparation tips";
      retrieverType = "interview";
    } else if (state.currentAgent === "skillsGap") {
      query = state.learningPath?.gaps.map((g) => g.skill).join(", ") ||
        "Software engineering learning resources";
      retrieverType = "learning";
    }

    if (!query) {
      logger.debug("No retrieval query generated");
      return {
        currentAgent: "ragRetrieval",
        nextAction: "done",
      };
    }

    try {
      const vectorConfig: VectorStoreConfig = {
        openaiApiKey: options.openaiApiKey,
      };

      const { resumeRetriever, interviewRetriever, learningRetriever } =
        getRetrievers(vectorConfig);

      // Select appropriate retriever
      const retriever =
        retrieverType === "resume"
          ? resumeRetriever
          : retrieverType === "interview"
          ? interviewRetriever
          : learningRetriever;

      logger.debug({ query, retrieverType }, "Performing RAG retrieval");

      const documents = await retriever.retrieve(query, 4);

      logger.info(
        { retrieverType, docCount: documents.length },
        "RAG documents retrieved"
      );

      // Format documents for state
      const ragResults = {
        query,
        documents: documents.map((doc) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
        })),
        retrievedAt: new Date().toISOString(),
      };

      return {
        ragResults,
        messages: [
          new AIMessage(
            `Retrieved ${documents.length} relevant documents for context`
          ),
        ],
        currentAgent: "ragRetrieval",
        nextAction: "done",
      };
    } catch (error) {
      logger.error({ error, query }, "RAG retrieval failed");
      return {
        messages: [
          new AIMessage(
            `RAG retrieval encountered an error: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        currentAgent: "ragRetrieval",
        nextAction: "error",
      };
    }
  };
}
