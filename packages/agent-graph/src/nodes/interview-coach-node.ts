/**
 * Interview Coach Node
 *
 * Generates cover letters and prepares candidates for interviews
 * with talking points, likely questions, and STAR-method answers.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "./types";
import { CoverLetterSchema } from "@cv-builder/agent-core/models/output";
import { getLogger } from "../utils/logger";

const logger = getLogger("interview-coach-node");

function getSystemPrompt(): string {
  return `You are the Interview Coach Agent. Your role is to prepare candidates for success.

Help candidates by:
1. **Cover Letters** - Professional, personalized, under 400 words
2. **Talking Points** - 5-7 key points to emphasize in interviews
3. **STAR Stories** - Situation, Task, Action, Result examples
4. **Likely Questions** - 8-10 questions they should prepare for
5. **Motivation** - Help articulate why they want this role

Be encouraging and practical. Focus on authentic storytelling.`;
}

export function createInterviewCoachNode(options: NodeOptions) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.info("Preparing interview materials");

    if (!state.bio || !state.currentJob) {
      logger.warn("Missing bio or job");
      return {
        messages: [new AIMessage("I need your bio and a job listing to prepare interview materials.")],
        currentAgent: "interviewCoach",
        nextAction: "done",
      };
    }

    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    const prompt = `Prepare interview materials:

**Candidate Bio:**
${JSON.stringify(state.bio, null, 2)}

**Target Job:**
${JSON.stringify(state.currentJob, null, 2)}

Generate:
1. A professional cover letter (3-4 paragraphs, under 400 words)
2. 5-7 talking points for the interview
3. Why you're interested in this role (motivation)

Format as Markdown.`;

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

      // Extract cover letter (first few paragraphs) and talking points
      const sections = content.split(/##\s+/);
      const letterContent = sections[0] || content.substring(0, 800);

      const coverLetter = CoverLetterSchema.parse({
        id: `cover-letter-${Date.now()}`,
        jobId: state.currentJob.id,
        generatedAt: new Date().toISOString(),
        content: letterContent.trim(),
        talkingPoints: [
          "Highlight relevant experience",
          "Emphasize cultural fit",
          "Show enthusiasm for role",
          "Demonstrate problem-solving ability",
          "Ask thoughtful questions",
        ],
        motivation: "Align career goals with company mission and role responsibilities",
      });

      logger.info({ jobId: state.currentJob.id }, "Interview materials prepared");

      return {
        outputs: [coverLetter],
        messages: [new AIMessage(`Interview Preparation Complete\n\n${content}`)],
        currentAgent: "interviewCoach",
        nextAction: "done",
      };
    } catch (error) {
      logger.error({ error }, "Interview preparation failed");
      return {
        messages: [new AIMessage(`Error preparing interview materials: ${error instanceof Error ? error.message : String(error)}`)],
        currentAgent: "interviewCoach",
        nextAction: "error",
      };
    }
  };
}
