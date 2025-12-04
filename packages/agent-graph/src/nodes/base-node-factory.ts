/**
 * Base Node Factory
 *
 * Provides utilities for creating LangGraph nodes from agent-like patterns.
 * This bridges the gap between the old BaseAgent pattern and LangGraph nodes.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions, SystemPromptGenerator } from "./types";
import { getLogger } from "../utils/logger";

const logger = getLogger("base-node-factory");

/**
 * Create a simple node that invokes Claude with a system prompt
 */
export function createSimpleNode(
  nodeName: string,
  systemPromptGenerator: SystemPromptGenerator,
  options: NodeOptions
) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.debug({ nodeName, messageCount: state.messages.length }, "Node executing");

    // Create Claude client
    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    // Generate system prompt based on current state
    const systemPrompt = systemPromptGenerator(state);

    // Prepare messages for Claude
    const messages: BaseMessage[] = [
      new HumanMessage({
        content: systemPrompt,
      }),
      ...state.messages,
    ];

    try {
      // Invoke Claude
      const response = await model.invoke(messages);

      logger.debug({ nodeName, responseLength: response.content.length }, "Node completed");

      // Convert response content to string
      const content = typeof response.content === "string"
        ? response.content
        : response.content.map((c) => (typeof c === "string" ? c : c.type === "text" ? c.text : "")).join("");

      // Return state updates
      return {
        messages: [new AIMessage(content)],
        currentAgent: nodeName,
      };
    } catch (error) {
      logger.error({ nodeName, error }, "Node execution failed");

      return {
        messages: [
          new AIMessage(
            `Error in ${nodeName}: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        currentAgent: nodeName,
        nextAction: "error",
      };
    }
  };
}

/**
 * Create a node that processes data and returns structured output
 */
export function createDataProcessingNode<TInput, TOutput>(
  nodeName: string,
  systemPromptGenerator: (state: CVBuilderStateType, input: TInput) => string,
  inputExtractor: (state: CVBuilderStateType) => TInput,
  outputProcessor: (response: string, state: CVBuilderStateType) => Partial<CVBuilderStateType>,
  options: NodeOptions
) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.debug({ nodeName }, "Data processing node executing");

    // Extract input from state
    const input = inputExtractor(state);

    // Create Claude client
    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    // Generate system prompt with input
    const systemPrompt = systemPromptGenerator(state, input);

    try {
      // Invoke Claude
      const response = await model.invoke([
        new HumanMessage(systemPrompt),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : response.content.map((c) => (typeof c === "string" ? c : c.type === "text" ? c.text : "")).join("");

      logger.debug({ nodeName, responseLength: content.length }, "Data processing completed");

      // Process output and update state
      const stateUpdates = outputProcessor(content, state);

      return {
        ...stateUpdates,
        messages: [new AIMessage(content)],
        currentAgent: nodeName,
      };
    } catch (error) {
      logger.error({ nodeName, error }, "Data processing failed");

      return {
        messages: [
          new AIMessage(
            `Error in ${nodeName}: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        currentAgent: nodeName,
        nextAction: "error",
      };
    }
  };
}

/**
 * Wrap a legacy BaseAgent method as a LangGraph node
 *
 * This is a bridge pattern to gradually migrate from BaseAgent to pure nodes.
 */
export function wrapAgentMethod<TAgent, TResult>(
  agentFactory: (apiKey: string) => TAgent,
  methodName: keyof TAgent,
  resultToStateUpdate: (result: TResult, state: CVBuilderStateType) => Partial<CVBuilderStateType>,
  options: NodeOptions
) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    const agent = agentFactory(options.apiKey);

    try {
      // Call the agent method
      const method = agent[methodName] as any;
      const result = await method.call(agent, state);

      // Convert result to state update
      return resultToStateUpdate(result, state);
    } catch (error) {
      logger.error({ methodName: String(methodName), error }, "Agent method failed");

      return {
        messages: [
          new AIMessage(
            `Error: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        nextAction: "error",
      };
    }
  };
}
