/**
 * Skills Gap Node
 *
 * Analyzes skill gaps between candidate and job requirements,
 * creates personalized learning paths with resources and exercises.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "./types";
import { LearningPathResultSchema } from "../state/types";
import { getLogger } from "../utils/logger";

const logger = getLogger("skills-gap-node");

function getSystemPrompt(): string {
  return `You are the Skills Gap Analyzer. Your role is to create personalized learning paths.

Analyze the gap between candidate skills and job requirements:
1. **Identify Gaps** - What skills are missing or need improvement?
2. **Prioritize** - Which gaps are most important to fill?
3. **Create Learning Path** - Resources, tutorials, courses
4. **Suggest Exercises** - Hands-on practice projects
5. **Estimate Time** - How long to develop each skill?

Be practical and encouraging. Focus on achievable goals.`;
}

export function createSkillsGapNode(options: NodeOptions) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.info("Analyzing skills gap");

    if (!state.bio || !state.currentJob || !state.jobAnalysis) {
      logger.warn("Missing required data for skills gap analysis");
      return {
        messages: [new AIMessage("I need your bio, a job listing, and job analysis to identify skill gaps.")],
        currentAgent: "skillsGap",
        nextAction: "done",
      };
    }

    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    const prompt = `Analyze skill gaps and create a learning path:

**Candidate Bio:**
${JSON.stringify(state.bio, null, 2)}

**Job Requirements:**
${JSON.stringify(state.jobAnalysis, null, 2)}

Provide as JSON:
{
  "gaps": [
    {
      "skill": "string",
      "currentLevel": "none|beginner|intermediate|advanced|expert",
      "targetLevel": "beginner|intermediate|advanced|expert",
      "priority": "high|medium|low"
    }
  ],
  "resources": [
    {
      "skill": "string",
      "type": "documentation|tutorial|course|book|practice",
      "title": "string",
      "url": "string",
      "estimatedHours": 10
    }
  ],
  "exercises": [
    {
      "skill": "string",
      "description": "string",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

    try {
      const response = await model.invoke([
        new HumanMessage({
          content: [
            { type: "text", text: getSystemPrompt() },
            { type: "text", text: prompt },
          ],
        }),
      ]);

      const content =
        typeof response.content === "string"
          ? response.content
          : response.content.map((c) => (typeof c === "string" ? c : c.type === "text" ? c.text : "")).join("");

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const learningPathData = JSON.parse(jsonMatch[0]);
      const learningPath = LearningPathResultSchema.parse({
        jobId: state.currentJob.id,
        ...learningPathData,
      });

      logger.info({ jobId: state.currentJob.id, gapsCount: learningPath.gaps.length }, "Learning path created");

      return {
        learningPath,
        messages: [new AIMessage(`Learning Path Created\n\n${content}`)],
        currentAgent: "skillsGap",
        nextAction: "done",
      };
    } catch (error) {
      logger.error({ error }, "Skills gap analysis failed");
      return {
        messages: [new AIMessage(`Error analyzing skills gap: ${error instanceof Error ? error.message : String(error)}`)],
        currentAgent: "skillsGap",
        nextAction: "error",
      };
    }
  };
}
