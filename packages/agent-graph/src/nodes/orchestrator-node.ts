/**
 * Orchestrator Node
 *
 * Routes user requests to appropriate specialized nodes.
 * Parses user intent and determines next action in the workflow.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "./types";
import { getLogger } from "../utils/logger";

const logger = getLogger("orchestrator-node");

function getSystemPrompt(): string {
  return `You are the Orchestrator Agent for a CV Builder system. Your role is to:

1. Understand user requests related to resume building, job applications, and career development
2. Determine which specialized agent should handle the request
3. Set the appropriate nextAction to route to that agent
4. Provide clear status updates to users

## Available Actions

You MUST set state.nextAction to one of these values based on the user's request:

- **generate_resume**: When user wants to create/generate a resume
- **analyze_job**: When user wants to analyze a job listing or check match score
- **tailor_resume**: When user wants to customize their resume for a specific job
- **analyze_skills_gap**: When user wants to identify skills needed or create a learning path
- **prepare_interview**: When user wants a cover letter or interview preparation
- **done**: When the request is complete or you're providing information only
- **error**: When there's an error or missing required data

## Important Rules

1. **Always check for required data**:
   - Resume generation needs: bio
   - Job analysis needs: currentJob (and optionally bio for match score)
   - Resume tailoring needs: bio + currentJob
   - Skills gap analysis needs: bio + currentJob
   - Interview prep needs: bio + currentJob

2. **If data is missing**: Set nextAction to "done" and ask the user to provide the data

3. **Be concise**: Your response should briefly explain what will happen next

4. **Single action per turn**: Choose ONE nextAction per request

## Examples

User: "Generate my resume"
→ Check if bio exists
→ If yes: Set nextAction = "generate_resume"
→ If no: Set nextAction = "done" and ask for bio

User: "How well do I match this job?"
→ Check if currentJob and bio exist
→ If yes: Set nextAction = "analyze_job"
→ If no: Set nextAction = "done" and ask for missing data

User: "Create a cover letter for the senior engineer role"
→ Check if bio and currentJob exist
→ If yes: Set nextAction = "prepare_interview"
→ If no: Set nextAction = "done" and ask for missing data

User: "What can you help me with?"
→ Set nextAction = "done" and explain capabilities

IMPORTANT: Always respond with your explanation AND explicitly state what nextAction you're setting.`;
}

/**
 * Orchestrator node that routes requests to specialized agents
 */
export function createOrchestratorNode(options: NodeOptions) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.info({ messageCount: state.messages.length }, "Orchestrator routing request");

    // Get the last user message
    const lastMessage = state.messages[state.messages.length - 1];
    if (!lastMessage) {
      logger.warn("No messages in state");
      return {
        messages: [new AIMessage("I need a request to process.")],
        currentAgent: "orchestrator",
        nextAction: "done",
      };
    }

    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
    });

    // Build context about current state
    const context = [];
    if (state.bio) context.push("✓ Bio loaded");
    if (state.currentJob) context.push(`✓ Job loaded: ${state.currentJob.title}`);
    if (state.jobAnalysis) context.push("✓ Job analysis available");
    if (state.learningPath) context.push("✓ Learning path available");

    const contextString = context.length > 0
      ? `\n\nCurrent state:\n${context.join("\n")}`
      : "\n\nNo data loaded yet.";

    const prompt = `${getSystemPrompt()}

${contextString}

User request: "${typeof lastMessage.content === "string" ? lastMessage.content : "See message history"}"

Analyze this request and respond with:
1. A brief explanation of what you'll do
2. The nextAction you're setting (must be one of: generate_resume, analyze_job, tailor_resume, analyze_skills_gap, prepare_interview, done, error)

Format:
[Your explanation]

**Next Action**: [action name]`;

    try {
      const response = await model.invoke([
        new HumanMessage(prompt),
      ]);

      const content =
        typeof response.content === "string"
          ? response.content
          : response.content.map((c) => (typeof c === "string" ? c : c.type === "text" ? c.text : "")).join("");

      // Parse nextAction from response
      let nextAction = state.nextAction || "done";

      // Look for explicit action in response
      const actionMatch = content.match(/\*\*Next Action\*\*:\s*(\w+)/i);
      if (actionMatch) {
        nextAction = actionMatch[1] as any;
      } else {
        // Fallback: keyword detection
        if (content.toLowerCase().includes("generate") && content.toLowerCase().includes("resume")) {
          nextAction = "generate_resume";
        } else if (content.toLowerCase().includes("analyz") && content.toLowerCase().includes("job")) {
          nextAction = "analyze_job";
        } else if (content.toLowerCase().includes("tailor")) {
          nextAction = "tailor_resume";
        } else if (content.toLowerCase().includes("skills") || content.toLowerCase().includes("learning")) {
          nextAction = "analyze_skills_gap";
        } else if (content.toLowerCase().includes("interview") || content.toLowerCase().includes("cover letter")) {
          nextAction = "prepare_interview";
        }
      }

      logger.info({ nextAction, hasContext: context.length > 0 }, "Orchestrator routed request");

      return {
        messages: [new AIMessage(content)],
        currentAgent: "orchestrator",
        nextAction,
      };
    } catch (error) {
      logger.error({ error }, "Orchestrator failed");
      return {
        messages: [
          new AIMessage(
            `I encountered an error processing your request: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        currentAgent: "orchestrator",
        nextAction: "error",
      };
    }
  };
}
