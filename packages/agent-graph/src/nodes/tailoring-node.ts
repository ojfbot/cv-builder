/**
 * Tailoring Node
 *
 * Customizes resumes for specific jobs by emphasizing relevant experience
 * and mirroring keywords from job descriptions.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "./types";
import { ResumeOutputSchema } from "@cv-builder/agent-core/models/output";
import { getLogger } from "../utils/logger";

const logger = getLogger("tailoring-node");

function getSystemPrompt(): string {
  return `You are the Resume Tailoring Agent. Your role is to customize resumes for specific jobs.

Tailor the resume by:
1. **Mirror Keywords** - Use exact terms from the job description naturally
2. **Emphasize Relevant Experience** - Highlight matching qualifications
3. **Reframe Achievements** - Connect past work to job requirements
4. **Optimize for ATS** - Include keywords without keyword stuffing
5. **Maintain Authenticity** - Be truthful, don't fabricate experience

Focus on making the candidate's existing experience shine for this specific role.`;
}

export function createTailoringNode(options: NodeOptions) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.info("Tailoring resume");

    if (!state.bio || !state.currentJob) {
      logger.warn("Missing bio or job");
      return {
        messages: [new AIMessage("I need both your bio and a job listing to tailor your resume.")],
        currentAgent: "tailoring",
        nextAction: "done",
      };
    }

    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    const prompt = `Tailor this resume for the specific job:

**Candidate Bio:**
${JSON.stringify(state.bio, null, 2)}

**Target Job:**
${JSON.stringify(state.currentJob, null, 2)}

${state.jobAnalysis ? `**Job Analysis:**\n${JSON.stringify(state.jobAnalysis, null, 2)}\n` : ""}

Generate a tailored resume in Markdown format that:
- Uses keywords from the job description
- Emphasizes relevant experience
- Highlights transferable skills
- Optimizes for ATS
- Maintains authenticity`;

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

      const tailoredResume = ResumeOutputSchema.parse({
        id: `resume-tailored-${Date.now()}`,
        jobId: state.currentJob.id,
        generatedAt: new Date().toISOString(),
        format: "markdown",
        content,
        metadata: {
          version: 1,
          tailored: true,
          sections: ["contact", "summary", "experience", "education", "skills"],
        },
      });

      logger.info({ jobId: state.currentJob.id }, "Resume tailored");

      return {
        outputs: [tailoredResume],
        messages: [new AIMessage(`I've tailored your resume for ${state.currentJob.title} at ${state.currentJob.company}!\n\n${content}`)],
        currentAgent: "tailoring",
        nextAction: "done",
      };
    } catch (error) {
      logger.error({ error }, "Tailoring failed");
      return {
        messages: [new AIMessage(`Error tailoring resume: ${error instanceof Error ? error.message : String(error)}`)],
        currentAgent: "tailoring",
        nextAction: "error",
      };
    }
  };
}
