import { BrowserOrchestrator } from './browser-orchestrator.js'

/**
 * Agent Service for Browser
 *
 * This service provides a singleton instance of the BrowserOrchestrator
 * for use in the React application.
 *
 * Note: In a production app, you would typically call a backend API
 * instead of using the Anthropic API directly in the browser to protect your API key.
 * For this demo, we'll use it directly with proper warnings.
 */

let orchestratorInstance: BrowserOrchestrator | null = null
let tabChangeCallback: ((tab: number, reason: string) => void) | undefined

export function setTabChangeCallback(callback: (tab: number, reason: string) => void) {
  tabChangeCallback = callback
  // If orchestrator already exists, we need to recreate it
  if (orchestratorInstance) {
    const apiKey = (orchestratorInstance as any).apiKey
    orchestratorInstance = new BrowserOrchestrator(apiKey, callback)
  }
}

export function initializeAgentService(apiKey: string): BrowserOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new BrowserOrchestrator(apiKey, tabChangeCallback)
  }
  return orchestratorInstance
}

export function getOrchestratorAgent(): BrowserOrchestrator {
  if (!orchestratorInstance) {
    throw new Error('Agent service not initialized. Call initializeAgentService first.')
  }
  return orchestratorInstance
}

export function isAgentServiceInitialized(): boolean {
  return orchestratorInstance !== null
}

export function resetAgentService(): void {
  orchestratorInstance = null
}
