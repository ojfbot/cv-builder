/**
 * Resume Generator Node
 *
 * Transforms bio data into polished, ATS-friendly resumes.
 * Reads bio from state, generates resume, writes to outputs.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { CVBuilderStateType } from "../state/schema";
import { NodeOptions } from "./types";
import { ResumeOutputSchema } from "@cv-builder/agent-core/models/output";
import { getLogger } from "../utils/logger";

const logger = getLogger("resume-generator-node");

/**
 * System prompt for resume generation
 */
function getSystemPrompt(): string {
  return `You are the Resume Generator Agent for a CV Builder system. Your role is to:

1. Transform professional bio data into polished, ATS-friendly resumes
2. Format resumes according to industry best practices
3. Generate resumes in multiple formats (Markdown, HTML, JSON)
4. Optimize content for readability and impact
5. Ensure proper structure and organization

## Output Format

Generate a complete professional resume in Markdown format with the following sections:

1. **Contact Information** - Name, email, phone, location, LinkedIn, GitHub
2. **Professional Summary** - 2-3 sentences highlighting key qualifications
3. **Work Experience** - Reverse chronological order with:
   - Company name and location
   - Position title and dates
   - 3-5 bullet points with quantified achievements
   - Start each bullet with an action verb
4. **Education** - Degree, institution, graduation date, honors
5. **Skills** - Organized by category (Technical, Languages, Tools, etc.)
6. **Projects** (if applicable) - Significant projects with technologies used
7. **Certifications** (if applicable)
8. **Publications** (if applicable)

## Best Practices

- Use action verbs to start bullet points (Led, Developed, Increased, etc.)
- Quantify achievements when possible (increased revenue by 25%, managed team of 10)
- Keep descriptions concise and impactful (1-2 lines per bullet)
- Prioritize recent and relevant experience
- Use consistent formatting throughout
- Optimize for Applicant Tracking Systems (ATS):
  - Use standard section headers
  - Avoid tables and complex formatting
  - Include relevant keywords from job descriptions
  - Use simple, clean formatting

Be professional, concise, and focused on showcasing the candidate's value.`;
}

/**
 * Create resume generator node
 */
export function createResumeGeneratorNode(options: NodeOptions) {
  return async (
    state: CVBuilderStateType
  ): Promise<Partial<CVBuilderStateType>> => {
    logger.info("Generating resume");

    // Validate bio exists
    if (!state.bio) {
      logger.warn("No bio data found in state");
      return {
        messages: [
          new AIMessage(
            "I need your bio information to generate a resume. Please provide your professional details first."
          ),
        ],
        currentAgent: "resumeGenerator",
        nextAction: "done",
      };
    }

    // Create Claude client
    const model = new ChatAnthropic({
      apiKey: options.apiKey,
      model: options.model || "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    // Prepare prompt
    const prompt = `Generate a professional resume from the following bio data:

${JSON.stringify(state.bio, null, 2)}

${state.currentJob ? `\nTailor this resume for the following job:\n\nJob Title: ${state.currentJob.title}\nCompany: ${state.currentJob.company}\nDescription: ${state.currentJob.description}\n` : ""}

Please generate a complete, professional resume in Markdown format.`;

    try {
      // Invoke Claude
      const messages = [
        new HumanMessage({
          content: [
            { type: "text", text: getSystemPrompt() },
            { type: "text", text: prompt },
          ],
        }),
      ];

      const response = await model.invoke(messages);

      const content =
        typeof response.content === "string"
          ? response.content
          : response.content
              .map((c) =>
                typeof c === "string"
                  ? c
                  : c.type === "text"
                  ? c.text
                  : ""
              )
              .join("");

      logger.info({
        contentLength: content.length,
        tailored: !!state.currentJob,
      }, "Resume generated");

      // Create resume output
      const resumeOutput = {
        id: `resume-${Date.now()}`,
        jobId: state.currentJob?.id,
        generatedAt: new Date().toISOString(),
        format: "markdown" as const,
        content,
        metadata: {
          version: 1,
          tailored: !!state.currentJob,
          sections: [
            "contact",
            "summary",
            "experience",
            "education",
            "skills",
            "projects",
          ],
        },
      };

      // Validate with Zod
      const validatedOutput = ResumeOutputSchema.parse(resumeOutput);

      // Return state updates
      return {
        outputs: [validatedOutput],
        messages: [
          new AIMessage(
            `I've generated your ${state.currentJob ? "tailored " : ""}resume! Here it is:\n\n${content}\n\nWould you like me to:\n- Download it in a different format\n- Tailor it for a specific job\n- Make any adjustments`
          ),
        ],
        currentAgent: "resumeGenerator",
        nextAction: "done",
      };
    } catch (error) {
      logger.error({ error }, "Resume generation failed");

      return {
        messages: [
          new AIMessage(
            `I encountered an error while generating your resume: ${
              error instanceof Error ? error.message : String(error)
            }. Please try again.`
          ),
        ],
        currentAgent: "resumeGenerator",
        nextAction: "error",
      };
    }
  };
}
