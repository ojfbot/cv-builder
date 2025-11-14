import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { BrowserOrchestrator } from '../../services/browser-orchestrator.js'

export interface AgentState {
  orchestrator: BrowserOrchestrator | null
  apiKey: string | null
  error: string | null
  isInitialized: boolean
}

const initialState: AgentState = {
  orchestrator: null,
  apiKey: null,
  error: null,
  isInitialized: false,
}

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    setOrchestrator: (state, action: PayloadAction<BrowserOrchestrator | null>) => {
      state.orchestrator = action.payload
      state.isInitialized = action.payload !== null
    },
    setApiKey: (state, action: PayloadAction<string>) => {
      state.apiKey = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const { setOrchestrator, setApiKey, setError, clearError } = agentSlice.actions
export default agentSlice.reducer
