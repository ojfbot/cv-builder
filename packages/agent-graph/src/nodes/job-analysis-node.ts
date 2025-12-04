/**
 * Job Analysis Node
 *
 * Analyzes job listings to extract requirements and calculate match scores.
 * Reads job from state, writes analysis to state.jobAnalysis.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "./types";
import { JobAnalysisResultSchema } from "../state/types";
import { getLogger } from "../utils/logger";

const logger = getLogger("job-analysis-node");

function getSystemPrompt(): string {
  return `You are the Job Analysis Agent. Your role is to analyze job listings and extract key requirements.

Analyze the job and provide:
1. **Key Requirements** - Extract technical skills, soft skills, experience, and education
2. **Importance Levels** - Mark each as critical, important, or nice-to-have
3. **Industry Terms** - ATS keywords that should be in the resume
4. **Match Score** - If bio provided, calculate 0-100 match score
5. **Recommendations** - Specific, actionable advice

Be thorough and objective. Focus on what will help candidates succeed.`;
}

export function createJobAnalysisNode(options: NodeOptions) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.info("Analyzing job");

    if (!state.currentJob) {
      logger.warn("No job found in state");
      return {
        messages: [
          new AIMessage(
            "I need a job listing to analyze. Please provide the job details."
          ),
        ],
        currentAgent: "jobAnalysis",
        nextAction: "done",
      };
    }

    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    const prompt = `Analyze this job listing:

${JSON.stringify(state.currentJob, null, 2)}

${state.bio ? `\nCandidate Bio:\n${JSON.stringify(state.bio, null, 2)}\n\nCalculate a match score (0-100).` : ""}

Provide your analysis as JSON:
{
  "keyRequirements": [
    {
      "skill": "string",
      "importance": "critical|important|nice-to-have",
      "category": "technical|soft-skill|experience|education"
    }
  ],
  "industryTerms": ["term1", "term2"],
  "matchScore": 75,
  "recommendations": ["recommendation1", "recommendation2"]
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

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      const analysis = JobAnalysisResultSchema.parse({
        jobId: state.currentJob.id,
        ...analysisData,
      });

      logger.info({ jobId: state.currentJob.id, matchScore: analysis.matchScore }, "Job analyzed");

      return {
        jobAnalysis: analysis,
        messages: [new AIMessage(`Job Analysis Complete\n\n${content}`)],
        currentAgent: "jobAnalysis",
        nextAction: "done",
      };
    } catch (error) {
      logger.error({ error }, "Job analysis failed");

      return {
        messages: [
          new AIMessage(
            `Error analyzing job: ${error instanceof Error ? error.message : String(error)}`
          ),
        ],
        currentAgent: "jobAnalysis",
        nextAction: "error",
      };
    }
  };
}
