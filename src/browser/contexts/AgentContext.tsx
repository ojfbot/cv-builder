import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setOrchestrator, setApiKey as setApiKeyAction, setError } from '../store/slices/agentSlice'
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
  const dispatch = useAppDispatch()
  const orchestrator = useAppSelector(state => state.agent.orchestrator)
  const apiKey = useAppSelector(state => state.agent.apiKey)
  const error = useAppSelector(state => state.agent.error)

  // Try to get API key from environment variable or localStorage on initial load
  useEffect(() => {
    if (apiKey) return // Already have API key from Redux state

    // Check Vite environment variable
    const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY
    if (envKey) {
      dispatch(setApiKeyAction(envKey))
    } else {
      // Try localStorage as fallback
      const storedKey = localStorage.getItem('anthropic_api_key')
      if (storedKey) {
        dispatch(setApiKeyAction(storedKey))
      }
    }
  }, [apiKey, dispatch])

  // Initialize orchestrator when API key is set
  useEffect(() => {
    if (apiKey && !orchestrator) {
      try {
        const agent = initializeAgentService(apiKey)
        dispatch(setOrchestrator(agent))
        dispatch(setError(null))
        // Store in localStorage for persistence
        localStorage.setItem('anthropic_api_key', apiKey)
      } catch (err) {
        dispatch(setError(err instanceof Error ? err.message : 'Failed to initialize agent service'))
        dispatch(setOrchestrator(null))
      }
    }
  }, [apiKey, orchestrator, dispatch])

  const setApiKey = (key: string) => {
    dispatch(setApiKeyAction(key))
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
