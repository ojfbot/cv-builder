/**
 * Interview Prep Retriever
 *
 * Retrieves interview questions, talking points, and preparation tips.
 *
 * CURRENT STATUS: Hardcoded seed data (prototype)
 *
 * TODO (Production): Replace hardcoded documents with dynamic content ingestion
 * - Load from markdown files or external knowledge base
 * - Implement document versioning and updates
 * - Add periodic refresh mechanism for industry trends
 * - Consider user-specific interview prep customization
 */

import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "./base-retriever";
import { VectorStoreConfig } from "../vector-store";

export class InterviewPrepRetriever extends BaseRetriever {
  constructor(config: VectorStoreConfig) {
    super("InterviewPrep", config);
  }

  protected async getSeedDocuments(): Promise<Document[]> {
    return [
      new Document({
        pageContent: `Common Behavioral Interview Questions and STAR Method:
**Tell me about a time you faced a challenging problem:**
- Situation: Describe the context
- Task: Explain your responsibility
- Action: Detail the steps you took
- Result: Share the outcome and what you learned

**Example Answer Structure:**
"In my role as Senior Engineer at TechCorp (Situation), I was tasked with reducing system latency that was affecting 100K users (Task). I profiled the application, identified N+1 queries, implemented caching with Redis, and optimized database indexes (Action). This reduced average response time from 800ms to 120ms, improving user satisfaction scores by 25% (Result)."`,
        metadata: {
          type: "behavioral_questions",
          category: "interview_prep",
          source: "interview_guide",
        },
      }),

      new Document({
        pageContent: `Technical Interview Topics for Software Engineers:
**Data Structures & Algorithms:**
- Arrays, Linked Lists, Stacks, Queues
- Hash Tables, Trees, Graphs
- Sorting, Searching, Dynamic Programming
- Time/Space Complexity Analysis (Big O)

**System Design:**
- Scalability and Load Balancing
- Database Design (SQL vs NoSQL)
- Caching Strategies (Redis, CDN)
- Microservices Architecture
- API Design (REST, GraphQL)
- Message Queues (Kafka, RabbitMQ)

**Coding Best Practices:**
- SOLID principles
- Design patterns
- Test-Driven Development
- Code review practices
- Version control (Git workflow)`,
        metadata: {
          type: "technical_topics",
          category: "interview_prep",
          source: "interview_guide",
        },
      }),

      new Document({
        pageContent: `Questions to Ask the Interviewer:
**About the Role:**
- "What does a typical day look like for this position?"
- "What are the biggest challenges someone in this role would face?"
- "How is success measured for this role?"
- "What opportunities for growth and learning does this role offer?"

**About the Team:**
- "How is the engineering team structured?"
- "What's the team's approach to code review and collaboration?"
- "How does the team handle technical debt?"

**About the Company:**
- "What are the company's goals for the next 6-12 months?"
- "What's the engineering culture like here?"
- "How do you approach work-life balance?"
- "What technologies is the team excited about adopting?"

**About Process:**
- "What's your development and deployment process?"
- "How do you handle on-call and production incidents?"
- "What does your CI/CD pipeline look like?"`,
        metadata: {
          type: "questions_for_interviewer",
          category: "interview_prep",
          source: "interview_guide",
        },
      }),

      new Document({
        pageContent: `Cover Letter Best Practices:
**Structure (3-4 paragraphs, under 400 words):**
1. Opening: State position and why you're interested
2. Body (1-2 paragraphs): Highlight relevant experience and achievements
3. Closing: Express enthusiasm and next steps

**Do's:**
- Customize for each company and role
- Use specific examples from your experience
- Match keywords from job description
- Show enthusiasm for the company/product
- Keep it concise and scannable
- Proofread carefully

**Don'ts:**
- Don't just repeat your resume
- Avoid generic templates
- Don't focus on what you want; focus on what you offer
- Don't use overly formal or casual language
- Don't make it too long

**Example Opening:**
"I'm excited to apply for the Senior Software Engineer position at [Company]. Your work on [specific product/technology] aligns perfectly with my 8 years of experience building scalable microservices platforms."`,
        metadata: {
          type: "cover_letter_guide",
          category: "interview_prep",
          source: "interview_guide",
        },
      }),

      new Document({
        pageContent: `Talking Points for Software Engineering Interviews:
**Your Technical Expertise:**
- Languages and frameworks you're strongest in
- Notable projects and their impact
- Complex problems you've solved
- Technologies you're learning

**Leadership & Collaboration:**
- Mentoring experience
- Cross-functional collaboration examples
- How you handle disagreements
- Code review philosophy

**Problem-Solving Approach:**
- How you break down complex problems
- Your debugging methodology
- How you stay current with technology
- How you make technical decisions

**Motivation:**
- What excites you about this role specifically
- What you're looking for in your next position
- Your career goals
- Why you want to work for this company

**Red Flag Questions to Prepare For:**
- Gaps in employment
- Why you're leaving current role
- Why you changed jobs frequently (if applicable)
- Salary expectations`,
        metadata: {
          type: "talking_points",
          category: "interview_prep",
          source: "interview_guide",
        },
      }),

      new Document({
        pageContent: `Virtual Interview Best Practices:
**Technical Setup:**
- Test video and audio beforehand
- Use a stable internet connection (ethernet if possible)
- Have a backup plan (phone number) if connection fails
- Close unnecessary applications
- Charge your devices or keep them plugged in

**Environment:**
- Choose a quiet, well-lit space
- Use a plain background or virtual background
- Ensure camera is at eye level
- Remove distractions

**During Interview:**
- Dress professionally (at least upper body)
- Make "eye contact" by looking at camera
- Minimize hand gestures that might look exaggerated
- Keep notes nearby but don't read from them
- It's okay to ask for repetition if connection is poor

**For Coding Interviews:**
- Practice using the coding platform beforehand
- Think out loud as you code
- Ask clarifying questions
- Test your code
- Discuss time/space complexity`,
        metadata: {
          type: "virtual_interview",
          category: "interview_prep",
          source: "interview_guide",
        },
      }),
    ];
  }
}
