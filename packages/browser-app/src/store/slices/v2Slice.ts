import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface V2State {
  enabled: boolean; // Whether V2 is enabled in the UI
  apiAvailable: boolean; // Whether V2 API is available on server
  streamingEnabled: boolean; // Whether to use streaming
  showThreadSidebar: boolean; // Show thread list sidebar
  showStateInspector: boolean; // Show LangGraph state inspector (debug)
  preferences: {
    autoCreateThread: boolean; // Auto-create thread on first message
    persistThreads: boolean; // Persist threads in localStorage
    showNodeExecution: boolean; // Show which nodes are executing
    showRAGContext: boolean; // Show RAG context when retrieved
  };
}

const initialState: V2State = {
  enabled: false, // Default to V1 (backwards compatible)
  apiAvailable: false,
  streamingEnabled: true,
  showThreadSidebar: false,
  showStateInspector: false,
  preferences: {
    autoCreateThread: true,
    persistThreads: true,
    showNodeExecution: false,
    showRAGContext: false,
  },
};

const v2Slice = createSlice({
  name: 'v2',
  initialState,
  reducers: {
    setV2Enabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('cv-builder:v2-enabled', JSON.stringify(action.payload));
      }
    },
    setApiAvailable: (state, action: PayloadAction<boolean>) => {
      state.apiAvailable = action.payload;
    },
    setStreamingEnabled: (state, action: PayloadAction<boolean>) => {
      state.streamingEnabled = action.payload;
    },
    setShowThreadSidebar: (state, action: PayloadAction<boolean>) => {
      state.showThreadSidebar = action.payload;
    },
    setShowStateInspector: (state, action: PayloadAction<boolean>) => {
      state.showStateInspector = action.payload;
    },
    updatePreferences: (state, action: PayloadAction<Partial<V2State['preferences']>>) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('cv-builder:v2-preferences', JSON.stringify(state.preferences));
      }
    },
    loadV2Settings: (state) => {
      // Load from localStorage
      if (typeof window !== 'undefined') {
        const enabled = localStorage.getItem('cv-builder:v2-enabled');
        if (enabled !== null) {
          state.enabled = JSON.parse(enabled);
        }

        const preferences = localStorage.getItem('cv-builder:v2-preferences');
        if (preferences !== null) {
          state.preferences = JSON.parse(preferences);
        }
      }
    },
  },
});

export const {
  setV2Enabled,
  setApiAvailable,
  setStreamingEnabled,
  setShowThreadSidebar,
  setShowStateInspector,
  updatePreferences,
  loadV2Settings,
} = v2Slice.actions;

export default v2Slice.reducer;
