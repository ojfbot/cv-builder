import { configureStore } from '@reduxjs/toolkit'
import navigationReducer from './slices/navigationSlice'
import chatReducer from './slices/chatSlice'
import agentReducer from './slices/agentSlice'

export const store = configureStore({
  reducer: {
    navigation: navigationReducer,
    chat: chatReducer,
    agent: agentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types and paths because they contain non-serializable values (orchestrator)
        ignoredActions: ['agent/setOrchestrator'],
        ignoredPaths: ['agent.orchestrator'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
