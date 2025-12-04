/**
 * Test script for SQLite implementation
 *
 * Tests:
 * - Database initialization
 * - Checkpointer operations
 * - Thread manager operations
 * - State persistence
 */

import { createSQLiteCheckpointer, createSQLiteThreadManager, createInitialState } from "../src/index";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const DB_PATH = "./test_cv_builder.db";

async function runTests() {
  console.log("🧪 Testing SQLite Implementation\n");

  // Initialize
  console.log("1️⃣ Initializing database...");
  const checkpointer = createSQLiteCheckpointer(DB_PATH);
  const threadManager = createSQLiteThreadManager(DB_PATH);
  await threadManager.initialize();
  console.log("✅ Database initialized\n");

  // Test thread creation
  console.log("2️⃣ Testing thread creation...");
  const thread = await threadManager.createThread({
    userId: "test-user-123",
    title: "Test Resume Generation",
    metadata: { purpose: "testing" }
  });
  console.log("✅ Thread created:", {
    id: thread.id,
    title: thread.title,
    userId: thread.userId
  });
  console.log("");

  // Test thread retrieval
  console.log("3️⃣ Testing thread retrieval...");
  const retrievedThread = await threadManager.getThread(thread.id);
  console.log("✅ Thread retrieved:", retrievedThread?.id);
  console.log("");

  // Test checkpoint creation
  console.log("4️⃣ Testing checkpoint creation...");
  const state = createInitialState("test-user-123", thread.id);
  state.messages = [
    new HumanMessage("Generate my resume"),
    new AIMessage("I'll help you create a professional resume...")
  ];

  const checkpoint1 = {
    v: 1,
    id: "checkpoint-1",
    ts: new Date().toISOString(),
    channel_values: state
  };

  const config1 = await checkpointer.put(
    { configurable: { thread_id: thread.id } },
    checkpoint1 as any,
    { step: 1, source: "test" }
  );
  console.log("✅ Checkpoint 1 saved:", config1.configurable?.thread_ts);
  console.log("");

  // Wait a moment to ensure different timestamp
  await new Promise(resolve => setTimeout(resolve, 10));

  // Test checkpoint retrieval
  console.log("5️⃣ Testing checkpoint retrieval...");
  const retrieved = await checkpointer.getTuple({ configurable: { thread_id: thread.id } });
  console.log("✅ Checkpoint retrieved:", {
    threadId: retrieved?.config.configurable?.thread_id,
    timestamp: retrieved?.config.configurable?.thread_ts,
    messagesCount: (retrieved?.checkpoint as any)?.channel_values?.messages?.length
  });
  console.log("");

  // Test second checkpoint
  console.log("6️⃣ Testing checkpoint history...");
  state.messages.push(new HumanMessage("Add my work experience"));
  const checkpoint2 = {
    v: 1,
    id: "checkpoint-2",
    ts: new Date().toISOString(),
    channel_values: state
  };

  await checkpointer.put(
    config1, // Parent config
    checkpoint2 as any,
    { step: 2, source: "test" }
  );
  console.log("✅ Checkpoint 2 saved");
  console.log("");

  // Test checkpoint listing
  console.log("7️⃣ Testing checkpoint listing...");
  const checkpoints: any[] = [];
  for await (const cp of checkpointer.list({ configurable: { thread_id: thread.id } })) {
    checkpoints.push(cp);
  }
  console.log("✅ Checkpoints listed:", checkpoints.length);
  console.log("");

  // Test thread listing
  console.log("8️⃣ Testing thread listing...");
  const threads = await threadManager.listThreads("test-user-123");
  console.log("✅ Threads listed:", threads.length);
  console.log("");

  // Test thread update
  console.log("9️⃣ Testing thread update...");
  await threadManager.updateThread(thread.id, {
    title: "Updated Test Resume Generation",
    metadata: { purpose: "testing", updated: true }
  });
  const updatedThread = await threadManager.getThread(thread.id);
  console.log("✅ Thread updated:", updatedThread?.title);
  console.log("");

  // Get statistics
  console.log("📊 Database Statistics:");
  const checkpointStats = checkpointer.getStats();
  const threadStats = threadManager.getStats();
  console.log({
    checkpoints: checkpointStats.checkpointCount,
    threads: threadStats.totalThreads,
    threadsByUser: threadStats.threadsByUser,
    dbSize: checkpointStats.dbSize
  });
  console.log("");

  // Cleanup
  console.log("🧹 Cleaning up...");
  checkpointer.clearAll();
  threadManager.clearAll();
  await checkpointer.close();
  await threadManager.close();
  console.log("✅ Cleanup complete\n");

  console.log("🎉 All tests passed!");
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Tests failed:", error);
  process.exit(1);
});
