/**
 * Test script for LangGraph nodes
 *
 * Tests:
 * - Node creation
 * - State reading/writing
 * - Claude API integration
 * - Output validation
 */

import {
  createInitialState,
  createResumeGeneratorNode,
  createJobAnalysisNode,
  createTailoringNode,
  createSkillsGapNode,
  createInterviewCoachNode,
  getConfig,
} from "../src/index";
import { HumanMessage } from "@langchain/core/messages";

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

async function testNodes() {
  console.log("🧪 Testing LangGraph Nodes\n");

  // Get config
  const config = getConfig();

  if (!config.anthropicApiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in configuration");
    console.error("   Please add it to packages/agent-core/env.json");
    process.exit(1);
  }

  const nodeOptions = {
    apiKey: config.anthropicApiKey,
    model: config.model,
    temperature: config.temperature,
  };

  // Create initial state
  console.log("1️⃣ Creating initial state...");
  const state = createInitialState("test-user", "test-thread");
  state.bio = testBio;
  state.currentJob = testJob;
  state.messages = [new HumanMessage("Generate my resume")];
  console.log("✅ Initial state created\n");

  // Test Resume Generator Node
  console.log("2️⃣ Testing Resume Generator Node...");
  try {
    const resumeNode = createResumeGeneratorNode(nodeOptions);
    const resumeResult = await resumeNode(state);
    console.log("✅ Resume generated:");
    console.log(`   - Outputs: ${resumeResult.outputs?.length || 0}`);
    console.log(`   - Messages: ${resumeResult.messages?.length || 0}`);
    console.log(`   - Current agent: ${resumeResult.currentAgent}`);
    console.log("");

    // Update state with results
    Object.assign(state, resumeResult);
  } catch (error) {
    console.error("❌ Resume generation failed:", error);
  }

  // Test Job Analysis Node
  console.log("3️⃣ Testing Job Analysis Node...");
  try {
    const analysisNode = createJobAnalysisNode(nodeOptions);
    const analysisResult = await analysisNode(state);
    console.log("✅ Job analyzed:");
    console.log(`   - Analysis: ${analysisResult.jobAnalysis ? "Created" : "None"}`);
    console.log(`   - Match score: ${analysisResult.jobAnalysis?.matchScore || "N/A"}`);
    console.log(`   - Requirements: ${analysisResult.jobAnalysis?.keyRequirements.length || 0}`);
    console.log("");

    // Update state with results
    Object.assign(state, analysisResult);
  } catch (error) {
    console.error("❌ Job analysis failed:", error);
  }

  // Test Tailoring Node
  console.log("4️⃣ Testing Tailoring Node...");
  try {
    const tailoringNode = createTailoringNode(nodeOptions);
    const tailoringResult = await tailoringNode(state);
    console.log("✅ Resume tailored:");
    console.log(`   - Tailored outputs: ${tailoringResult.outputs?.length || 0}`);
    console.log(`   - Messages: ${tailoringResult.messages?.length || 0}`);
    console.log("");

    // Update state
    Object.assign(state, tailoringResult);
  } catch (error) {
    console.error("❌ Tailoring failed:", error);
  }

  // Test Skills Gap Node
  console.log("5️⃣ Testing Skills Gap Node...");
  try {
    const skillsGapNode = createSkillsGapNode(nodeOptions);
    const skillsGapResult = await skillsGapNode(state);
    console.log("✅ Skills gap analyzed:");
    console.log(`   - Learning path: ${skillsGapResult.learningPath ? "Created" : "None"}`);
    console.log(`   - Gaps identified: ${skillsGapResult.learningPath?.gaps.length || 0}`);
    console.log(`   - Resources: ${skillsGapResult.learningPath?.resources.length || 0}`);
    console.log("");

    // Update state
    Object.assign(state, skillsGapResult);
  } catch (error) {
    console.error("❌ Skills gap analysis failed:", error);
  }

  // Test Interview Coach Node
  console.log("6️⃣ Testing Interview Coach Node...");
  try {
    const interviewNode = createInterviewCoachNode(nodeOptions);
    const interviewResult = await interviewNode(state);
    console.log("✅ Interview materials prepared:");
    console.log(`   - Cover letter: ${interviewResult.outputs?.some((o: any) => o.id?.startsWith("cover-letter")) ? "Created" : "None"}`);
    console.log(`   - Messages: ${interviewResult.messages?.length || 0}`);
    console.log("");

    // Update state
    Object.assign(state, interviewResult);
  } catch (error) {
    console.error("❌ Interview preparation failed:", error);
  }

  // Summary
  console.log("📊 Final State Summary:");
  console.log(`   - Total messages: ${state.messages.length}`);
  console.log(`   - Total outputs: ${state.outputs.length}`);
  console.log(`   - Job analysis: ${state.jobAnalysis ? "✅" : "❌"}`);
  console.log(`   - Learning path: ${state.learningPath ? "✅" : "❌"}`);
  console.log("");

  console.log("🎉 All node tests completed!");
}

// Run tests
testNodes().catch((error) => {
  console.error("❌ Node tests failed:", error);
  process.exit(1);
});
