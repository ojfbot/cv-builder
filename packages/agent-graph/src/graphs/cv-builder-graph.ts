/**
 * CV Builder Graph
 *
 * Main LangGraph state graph that orchestrates all agents.
 * Uses blackboard pattern where all nodes read/write to shared state.
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { CVBuilderState, CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "../nodes/types";
import {
  createOrchestratorNode,
  createResumeGeneratorNode,
  createJobAnalysisNode,
  createTailoringNode,
  createSkillsGapNode,
  createInterviewCoachNode,
} from "../nodes";
import { createCheckpointer } from "../state/checkpointer";
import { createSQLiteCheckpointer } from "../state/sqlite-checkpointer";
import { getConfig } from "../utils/config";
import { getLogger } from "../utils/logger";

const logger = getLogger("cv-builder-graph");

export interface GraphConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  databaseType?: "postgres" | "sqlite";
  databaseUrl?: string;
  dbPath?: string;
}

/**
 * Routing function that determines next node based on state.nextAction
 */
function routeToAgent(state: CVBuilderStateType): string {
  const action = state.nextAction;

  logger.debug({ action, currentAgent: state.currentAgent }, "Routing to next node");

  switch (action) {
    case "generate_resume":
      return "resumeGeneratorNode";
    case "analyze_job":
      return "jobAnalysisNode";
    case "tailor_resume":
      return "tailoringNode";
    case "analyze_skills_gap":
      return "skillsGapNode";
    case "prepare_interview":
      return "interviewCoachNode";
    case "done":
      return END;
    case "error":
      return END;
    default:
      // If no action set or unknown action, go back to orchestrator
      return "orchestrator";
  }
}

/**
 * Create the CV Builder state graph
 */
export function createCVBuilderGraph(config: GraphConfig) {
  logger.info("Creating CV Builder graph");

  // Create node options
  const nodeOptions: NodeOptions = {
    apiKey: config.apiKey,
    model: config.model || "claude-sonnet-4-20250514",
    temperature: config.temperature || 0.7,
    maxTokens: config.maxTokens || 4096,
  };

  // Create checkpointer
  const appConfig = getConfig();
  const checkpointer = appConfig.databaseType === "sqlite"
    ? createSQLiteCheckpointer(appConfig.dbPath)
    : createCheckpointer(appConfig.databaseUrl!);

  logger.debug({ databaseType: appConfig.databaseType }, "Checkpointer created");

  // Build the graph
  const graph = new StateGraph(CVBuilderState)
    // Add all nodes
    .addNode("orchestrator", createOrchestratorNode(nodeOptions))
    .addNode("resumeGeneratorNode", createResumeGeneratorNode(nodeOptions))
    .addNode("jobAnalysisNode", createJobAnalysisNode(nodeOptions))
    .addNode("tailoringNode", createTailoringNode(nodeOptions))
    .addNode("skillsGapNode", createSkillsGapNode(nodeOptions))
    .addNode("interviewCoachNode", createInterviewCoachNode(nodeOptions))

    // Entry point: START -> orchestrator
    .addEdge(START, "orchestrator")

    // Orchestrator routes to specialized nodes
    .addConditionalEdges("orchestrator", routeToAgent)

    // All specialized nodes return to orchestrator for next routing
    .addEdge("resumeGeneratorNode", "orchestrator")
    .addEdge("jobAnalysisNode", "orchestrator")
    .addEdge("tailoringNode", "orchestrator")
    .addEdge("skillsGapNode", "orchestrator")
    .addEdge("interviewCoachNode", "orchestrator");

  // Compile with checkpointer
  const compiledGraph = graph.compile({ checkpointer });

  logger.info("CV Builder graph compiled");

  return compiledGraph;
}

/**
 * Stream graph execution with events
 */
export async function* streamGraph(
  graph: ReturnType<typeof createCVBuilderGraph>,
  input: Partial<CVBuilderStateType>,
  config: RunnableConfig
) {
  logger.info({ threadId: config.configurable?.thread_id }, "Starting graph stream");

  try {
    const stream = await graph.stream(input, {
      ...config,
      streamMode: "values", // Stream full state after each node
    });

    for await (const event of stream) {
      logger.debug({ currentAgent: event.currentAgent }, "Graph event");
      yield event;
    }

    logger.info("Graph stream completed");
  } catch (error) {
    logger.error({ error }, "Graph stream failed");
    throw error;
  }
}

/**
 * Invoke graph and return final state
 */
export async function invokeGraph(
  graph: ReturnType<typeof createCVBuilderGraph>,
  input: Partial<CVBuilderStateType>,
  config: RunnableConfig
): Promise<CVBuilderStateType> {
  logger.info({ threadId: config.configurable?.thread_id }, "Invoking graph");

  try {
    const result = await graph.invoke(input, config);
    logger.info({ currentAgent: result.currentAgent }, "Graph invocation completed");
    return result;
  } catch (error) {
    logger.error({ error }, "Graph invocation failed");
    throw error;
  }
}

/**
 * Get current graph state from checkpoint
 */
export async function getGraphState(
  graph: ReturnType<typeof createCVBuilderGraph>,
  config: RunnableConfig
): Promise<CVBuilderStateType | null> {
  try {
    const state = await graph.getState(config);
    return state.values as CVBuilderStateType;
  } catch (error) {
    logger.error({ error }, "Failed to get graph state");
    return null;
  }
}

/**
 * Update graph state manually (for loading bio, jobs, etc.)
 */
export async function updateGraphState(
  graph: ReturnType<typeof createCVBuilderGraph>,
  updates: Partial<CVBuilderStateType>,
  config: RunnableConfig
): Promise<void> {
  try {
    await graph.updateState(config, updates);
    logger.info({ keys: Object.keys(updates) }, "Graph state updated");
  } catch (error) {
    logger.error({ error }, "Failed to update graph state");
    throw error;
  }
}
