import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setOrchestrator, setError } from '../store/slices/agentSlice';
import { BrowserOrchestrator } from '../services/browser-orchestrator.js';
import { initializeAgentService, isAgentServiceInitialized } from '../services/agent-service.js';

interface AgentContextType {
  orchestrator: BrowserOrchestrator | null;
  isInitialized: boolean;
  error: string | null;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const orchestrator = useAppSelector((state) => state.agent.orchestrator);
  const error = useAppSelector((state) => state.agent.error);

  // Initialize orchestrator on mount
  // No API key needed - all agent operations go through the backend API
  useEffect(() => {
    if (!orchestrator) {
      try {
        const agent = initializeAgentService();
        dispatch(setOrchestrator(agent));
        dispatch(setError(null));
      } catch (err) {
        dispatch(
          setError(
            err instanceof Error ? err.message : 'Failed to initialize agent service'
          )
        );
        dispatch(setOrchestrator(null));
      }
    }
  }, [orchestrator, dispatch]);

  return (
    <AgentContext.Provider
      value={{
        orchestrator,
        isInitialized: isAgentServiceInitialized(),
        error,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
