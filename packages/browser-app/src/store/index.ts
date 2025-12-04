import { configureStore } from '@reduxjs/toolkit'
import navigationReducer from './slices/navigationSlice'
import chatReducer from './slices/chatSlice'
import agentReducer from './slices/agentSlice'
import threadsReducer from './slices/threadsSlice'
import v2Reducer from './slices/v2Slice'

export const store = configureStore({
  reducer: {
    navigation: navigationReducer,
    chat: chatReducer,
    agent: agentReducer,
    threads: threadsReducer,
    v2: v2Reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types and paths because they contain non-serializable values (orchestrator)
        ignoredActions: ['agent/setOrchestrator'],
        ignoredPaths: ['agent.orchestrator'],
      },
    }),
  // Enable Redux DevTools - this allows browser automation to access state
  // via the Redux DevTools extension API without directly exposing the store
  devTools: {
    name: 'CV Builder',
    trace: true,
    traceLimit: 25,
  },
})

// For automated browser testing ONLY: Register store with Redux DevTools emulation
// The browser automation framework injects __REDUX_DEVTOOLS_EXTENSION__ with a stores array
// to emulate the extension. This avoids direct window.store exposure while enabling
// automated tests to query state. Only register if the emulated stores array exists.
if (typeof window !== 'undefined') {
  const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  // Only register if the browser automation emulation layer exists (has stores array)
  // This is more secure than checking DEV mode because it requires the framework to be running
  if (devTools && Array.isArray(devTools.stores)) {
    // Register with emulated DevTools for browser automation
    devTools.stores.push(store);
    console.log('[Store] Registered with Redux DevTools for automated testing');
  }
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
