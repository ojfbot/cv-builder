import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BrowserOrchestrator } from '../services/browser-orchestrator.js'
import { initializeAgentService, isAgentServiceInitialized, setTabChangeCallback } from '../services/agent-service.js'

interface AgentContextType {
  orchestrator: BrowserOrchestrator | null
  isInitialized: boolean
  apiKey: string | null
  setApiKey: (key: string) => void
  error: string | null
  setTabChangeHandler: (handler: (tab: number, reason: string) => void) => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [orchestrator, setOrchestrator] = useState<BrowserOrchestrator | null>(null)
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Try to get API key from environment variable or localStorage
  useEffect(() => {
    // Check Vite environment variable
    const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY
    if (envKey) {
      setApiKeyState(envKey)
    } else {
      // Try localStorage as fallback
      const storedKey = localStorage.getItem('anthropic_api_key')
      if (storedKey) {
        setApiKeyState(storedKey)
      }
    }
  }, [])

  // Initialize orchestrator when API key is set
  useEffect(() => {
    if (apiKey) {
      try {
        const agent = initializeAgentService(apiKey)
        setOrchestrator(agent)
        setError(null)
        // Store in localStorage for persistence
        localStorage.setItem('anthropic_api_key', apiKey)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize agent service')
        setOrchestrator(null)
      }
    }
  }, [apiKey])

  const setApiKey = (key: string) => {
    setApiKeyState(key)
  }

  const setTabChangeHandler = (handler: (tab: number, reason: string) => void) => {
    setTabChangeCallback(handler)
  }

  return (
    <AgentContext.Provider
      value={{
        orchestrator,
        isInitialized: isAgentServiceInitialized(),
        apiKey,
        setApiKey,
        error,
        setTabChangeHandler,
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const context = useContext(AgentContext)
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider')
  }
  return context
}
