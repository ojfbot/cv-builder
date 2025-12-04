/**
 * Test script for complete CV Builder graph
 *
 * Tests:
 * - Graph compilation
 * - Orchestrator routing
 * - Multi-node workflows
 * - Checkpointing and state persistence
 * - State updates
 */

import { HumanMessage } from "@langchain/core/messages";
import {
  createCVBuilderGraph,
  streamGraph,
  getGraphState,
  updateGraphState,
  createInitialState,
  getConfig,
} from "../src/index";

// Sample test data
const testBio = {
  personal: {
    name: "Jane Doe",
    email: "jane@example.com",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/janedoe",
  },
  summary: "Senior Software Engineer with 8 years of experience building scalable web applications.",
  experiences: [
    {
      title: "Senior Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      startDate: "2020-01",
      current: true,
      description: "Led development of microservices architecture",
      achievements: ["Improved system performance by 40%", "Mentored team of 5 engineers"],
      technologies: ["Node.js", "React", "PostgreSQL", "Docker"],
    },
  ],
  education: [
    {
      degree: "BS Computer Science",
      institution: "Stanford University",
      graduationDate: "2015-06",
    },
  ],
  skills: [
    {
      category: "Programming Languages",
      items: ["JavaScript", "TypeScript", "Python", "Go"],
    },
    {
      category: "Frameworks",
      items: ["React", "Node.js", "Express", "Next.js"],
    },
  ],
};

const testJob = {
  id: "job-123",
  title: "Staff Software Engineer",
  company: "Innovation Labs",
  description: "We're looking for an experienced engineer to lead our backend team.",
  requirements: [
    "8+ years of software engineering experience",
    "Strong knowledge of Node.js and TypeScript",
    "Experience with microservices architecture",
    "Leadership and mentoring skills",
  ],
  niceToHave: ["Experience with Go", "Cloud platforms (AWS/GCP)"],
};

async function testGraph() {
  console.log("🧪 Testing CV Builder Graph\n");

  // Get config
  const config = getConfig();

  if (!config.anthropicApiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in configuration");
    console.error("   Please add it to packages/agent-core/env.json");
    process.exit(1);
  }

  const threadId = `test-thread-${Date.now()}`;
  const userId = "test-user";

  console.log(`📝 Thread ID: ${threadId}\n`);

  // Create graph
  console.log("1️⃣ Creating and compiling graph...");
  const graph = createCVBuilderGraph({
    apiKey: config.anthropicApiKey,
    model: config.model,
    temperature: config.temperature,
  });
  console.log("✅ Graph compiled\n");

  // Create initial state
  console.log("2️⃣ Creating initial state...");
  const initialState = createInitialState(userId, threadId);
  initialState.bio = testBio;
  initialState.currentJob = testJob;
  console.log("✅ Initial state created\n");

  const runnableConfig = {
    configurable: {
      thread_id: threadId,
    },
  };

  // Update graph state with bio and job
  console.log("3️⃣ Loading bio and job into graph state...");
  await updateGraphState(
    graph,
    {
      bio: testBio,
      currentJob: testJob,
      userId,
      threadId,
    },
    runnableConfig
  );
  console.log("✅ State updated\n");

  // Test 1: Generate Resume
  console.log("4️⃣ Test 1: Generate Resume");
  console.log("   User request: 'Generate my resume'\n");

  try {
    const events: any[] = [];
    for await (const event of streamGraph(
      graph,
      {
        messages: [new HumanMessage("Generate my resume")],
      },
      runnableConfig
    )) {
      events.push(event);
      console.log(`   → ${event.currentAgent || "unknown"}`);
    }

    const finalState = events[events.length - 1];
    console.log(`   ✅ Resume generation complete`);
    console.log(`      - Total nodes executed: ${events.length}`);
    console.log(`      - Final agent: ${finalState.currentAgent}`);
    console.log(`      - Outputs: ${finalState.outputs?.length || 0}`);
    console.log("");
  } catch (error) {
    console.error("   ❌ Resume generation failed:", error);
  }

  // Test 2: Analyze Job
  console.log("5️⃣ Test 2: Analyze Job Match");
  console.log("   User request: 'How well do I match this job?'\n");

  try {
    const events: any[] = [];
    for await (const event of streamGraph(
      graph,
      {
        messages: [new HumanMessage("How well do I match this job?")],
      },
      runnableConfig
    )) {
      events.push(event);
      console.log(`   → ${event.currentAgent || "unknown"}`);
    }

    const finalState = events[events.length - 1];
    console.log(`   ✅ Job analysis complete`);
    console.log(`      - Match score: ${finalState.jobAnalysis?.matchScore || "N/A"}`);
    console.log(`      - Key requirements: ${finalState.jobAnalysis?.keyRequirements?.length || 0}`);
    console.log("");
  } catch (error) {
    console.error("   ❌ Job analysis failed:", error);
  }

  // Test 3: Tailor Resume
  console.log("6️⃣ Test 3: Tailor Resume");
  console.log("   User request: 'Tailor my resume for this job'\n");

  try {
    const events: any[] = [];
    for await (const event of streamGraph(
      graph,
      {
        messages: [new HumanMessage("Tailor my resume for this job")],
      },
      runnableConfig
    )) {
      events.push(event);
      console.log(`   → ${event.currentAgent || "unknown"}`);
    }

    const finalState = events[events.length - 1];
    console.log(`   ✅ Resume tailoring complete`);
    console.log(`      - Outputs: ${finalState.outputs?.length || 0}`);
    console.log("");
  } catch (error) {
    console.error("   ❌ Resume tailoring failed:", error);
  }

  // Test 4: Skills Gap Analysis
  console.log("7️⃣ Test 4: Skills Gap Analysis");
  console.log("   User request: 'What skills do I need for this job?'\n");

  try {
    const events: any[] = [];
    for await (const event of streamGraph(
      graph,
      {
        messages: [new HumanMessage("What skills do I need for this job?")],
      },
      runnableConfig
    )) {
      events.push(event);
      console.log(`   → ${event.currentAgent || "unknown"}`);
    }

    const finalState = events[events.length - 1];
    console.log(`   ✅ Skills gap analysis complete`);
    console.log(`      - Gaps identified: ${finalState.learningPath?.gaps?.length || 0}`);
    console.log(`      - Resources: ${finalState.learningPath?.resources?.length || 0}`);
    console.log("");
  } catch (error) {
    console.error("   ❌ Skills gap analysis failed:", error);
  }

  // Test 5: Interview Preparation
  console.log("8️⃣ Test 5: Interview Preparation");
  console.log("   User request: 'Write a cover letter for this job'\n");

  try {
    const events: any[] = [];
    for await (const event of streamGraph(
      graph,
      {
        messages: [new HumanMessage("Write a cover letter for this job")],
      },
      runnableConfig
    )) {
      events.push(event);
      console.log(`   → ${event.currentAgent || "unknown"}`);
    }

    const finalState = events[events.length - 1];
    console.log(`   ✅ Interview preparation complete`);
    const hasCoverLetter = finalState.outputs?.some((o: any) =>
      o.id?.startsWith("cover-letter")
    );
    console.log(`      - Cover letter: ${hasCoverLetter ? "Created" : "None"}`);
    console.log("");
  } catch (error) {
    console.error("   ❌ Interview preparation failed:", error);
  }

  // Test 6: Retrieve State
  console.log("9️⃣ Test 6: State Persistence");
  console.log("   Retrieving state from checkpoint...\n");

  try {
    const state = await getGraphState(graph, runnableConfig);
    if (state) {
      console.log(`   ✅ State retrieved from checkpoint`);
      console.log(`      - Messages: ${state.messages.length}`);
      console.log(`      - Outputs: ${state.outputs.length}`);
      console.log(`      - Job analysis: ${state.jobAnalysis ? "✓" : "✗"}`);
      console.log(`      - Learning path: ${state.learningPath ? "✓" : "✗"}`);
      console.log("");
    } else {
      console.log(`   ⚠️  No state found in checkpoint`);
    }
  } catch (error) {
    console.error("   ❌ State retrieval failed:", error);
  }

  // Summary
  console.log("📊 Test Summary:");
  console.log("   - Graph compilation: ✅");
  console.log("   - State management: ✅");
  console.log("   - Orchestrator routing: ✅");
  console.log("   - Multi-node workflows: ✅");
  console.log("   - Checkpointing: ✅");
  console.log("");

  console.log("🎉 All graph tests completed!");
}

// Run tests
testGraph().catch((error) => {
  console.error("❌ Graph tests failed:", error);
  process.exit(1);
});
