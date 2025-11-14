import { BrowserOrchestrator } from './browser-orchestrator.js';
import { createApiClient } from '../api/client.js';

/**
 * Agent Service for Browser
 *
 * This service provides a singleton instance of the BrowserOrchestrator
 * for use in the React application. The orchestrator now communicates with
 * the backend API instead of directly using agents in the browser.
 *
 * Benefits of this architecture:
 * - API keys are stored securely on the server (env.json)
 * - No sensitive credentials exposed in the browser
 * - Proper separation of concerns
 * - Ready for future authentication/authorization
 */

let orchestratorInstance: BrowserOrchestrator | null = null;

/**
 * Initialize the agent service
 * No API key needed - all agent operations go through the backend API
 */
export function initializeAgentService(): BrowserOrchestrator {
  if (!orchestratorInstance) {
    const apiClient = createApiClient();
    orchestratorInstance = new BrowserOrchestrator(apiClient);
  }
  return orchestratorInstance;
}

/**
 * Get the orchestrator agent instance
 */
export function getOrchestratorAgent(): BrowserOrchestrator {
  if (!orchestratorInstance) {
    throw new Error('Agent service not initialized. Call initializeAgentService first.');
  }
  return orchestratorInstance;
}

/**
 * Check if agent service is initialized
 */
export function isAgentServiceInitialized(): boolean {
  return orchestratorInstance !== null;
}

/**
 * Reset the agent service (useful for testing or switching configurations)
 */
export function resetAgentService(): void {
  orchestratorInstance = null;
}
