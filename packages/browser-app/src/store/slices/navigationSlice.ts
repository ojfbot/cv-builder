import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { TabKey, convertIndexToKey, convertKeyToIndex } from '../../models/navigation'

export type BioViewMode = 'landing' | 'tiles' | 'files'

export interface NavigationState {
  currentTab: TabKey
  previousTab: TabKey
  // Legacy index-based access for backward compatibility
  currentTabIndex: number
  previousTabIndex: number
  // Bio panel view mode persistence
  bioViewMode: BioViewMode
}

const initialState: NavigationState = {
  currentTab: TabKey.INTERACTIVE,
  previousTab: TabKey.INTERACTIVE,
  currentTabIndex: 0,
  previousTabIndex: 0,
  bioViewMode: 'landing',
}

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    // New keyed navigation (preferred)
    navigateToTab: (state, action: PayloadAction<TabKey>) => {
      state.previousTab = state.currentTab
      state.currentTab = action.payload

      // Update index fields for backward compatibility
      state.previousTabIndex = state.currentTabIndex
      state.currentTabIndex = convertKeyToIndex(action.payload)
    },

    // Legacy index-based navigation (for backward compatibility)
    setCurrentTab: (state, action: PayloadAction<number>) => {
      const key = convertIndexToKey(action.payload)
      state.previousTab = state.currentTab
      state.currentTab = key

      // Update index fields
      state.previousTabIndex = state.currentTabIndex
      state.currentTabIndex = action.payload
    },

    // Request tab change with reason (supports both key and index)
    requestTabChange: (state, action: PayloadAction<{ tab: number | TabKey; reason: string }>) => {
      const key = typeof action.payload.tab === 'number'
        ? convertIndexToKey(action.payload.tab)
        : action.payload.tab

      state.previousTab = state.currentTab
      state.currentTab = key

      // Update index fields
      state.previousTabIndex = state.currentTabIndex
      state.currentTabIndex = convertKeyToIndex(key)
    },

    // Set Bio panel view mode
    setBioViewMode: (state, action: PayloadAction<BioViewMode>) => {
      state.bioViewMode = action.payload
    },
  },
})

export const { navigateToTab, setCurrentTab, requestTabChange, setBioViewMode } = navigationSlice.actions
export default navigationSlice.reducer
