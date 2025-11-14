import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface NavigationState {
  currentTab: number
  previousTab: number
}

const initialState: NavigationState = {
  currentTab: 0,
  previousTab: 0,
}

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setCurrentTab: (state, action: PayloadAction<number>) => {
      state.previousTab = state.currentTab
      state.currentTab = action.payload
    },
    requestTabChange: (state, action: PayloadAction<{ tab: number; reason: string }>) => {
      // Direct navigation without confirmation
      state.previousTab = state.currentTab
      state.currentTab = action.payload.tab
    },
  },
})

export const { setCurrentTab, requestTabChange } = navigationSlice.actions
export default navigationSlice.reducer
