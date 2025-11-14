import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BrowserOrchestrator } from '../../services/browser-orchestrator.js';

export interface AgentState {
  orchestrator: BrowserOrchestrator | null;
  error: string | null;
  isInitialized: boolean;
}

const initialState: AgentState = {
  orchestrator: null,
  error: null,
  isInitialized: false,
};

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    setOrchestrator: (state, action: PayloadAction<BrowserOrchestrator | null>) => {
      state.orchestrator = action.payload;
      state.isInitialized = action.payload !== null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setOrchestrator, setError, clearError } = agentSlice.actions;
export default agentSlice.reducer;
