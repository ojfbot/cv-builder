import { RunnableConfig } from "@langchain/core/runnables";
import { CVBuilderStateType } from "../state/schema";

/**
 * Node function signature
 *
 * All LangGraph nodes follow this pattern:
 * - Receive the current state
 * - Return partial state updates
 * - Can be async
 */
export type NodeFunction = (
  state: CVBuilderStateType,
  config?: RunnableConfig
) => Promise<Partial<CVBuilderStateType>>;

/**
 * Node options for configuration
 */
export interface NodeOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Base node configuration
 */
export interface BaseNodeConfig extends NodeOptions {
  nodeName: string;
}

/**
 * System prompt generator function
 */
export type SystemPromptGenerator = (state: CVBuilderStateType) => string;
