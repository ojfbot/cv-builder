import type { Meta, StoryObj } from '@storybook/react'
import { Provider } from 'react-redux'
import { configureStore, createSlice } from '@reduxjs/toolkit'
import SettingsPanel from './SettingsPanel'

/**
 * SettingsPanel reads from Redux (settings.apps['cv-builder']).
 * We provide a minimal mock store for Storybook rendering.
 */

function createMockStore(overrides: Record<string, unknown> = {}) {
  const settingsSlice = createSlice({
    name: 'settings',
    initialState: {
      apps: {
        'cv-builder': {
          apiBaseUrl: '',
          defaultTemplate: 'modern',
          exportFormat: 'pdf',
          language: 'en',
          ...overrides,
        },
      },
    },
    reducers: {},
    extraReducers: (builder) => {
      builder.addMatcher(
        (action): action is { type: string; payload: Record<string, unknown> } =>
          action.type === 'settings/updateCvBuilderSettings',
        (state, action) => {
          Object.assign(state.apps['cv-builder'], action.payload)
        },
      )
    },
  })

  return configureStore({
    reducer: { settings: settingsSlice.reducer },
  })
}

const meta: Meta<typeof SettingsPanel> = {
  title: 'Components/SettingsPanel',
  component: SettingsPanel,
  decorators: [
    (Story, context) => {
      const store = createMockStore(context.args as Record<string, unknown>)
      return (
        <Provider store={store}>
          <div style={{ maxWidth: 480, padding: '1rem' }}>
            <Story />
          </div>
        </Provider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof SettingsPanel>

export const Default: Story = {}

export const CustomApiUrl: Story = {
  args: {
    apiBaseUrl: 'http://localhost:3100/api',
  } as any,
}

export const FrenchLanguage: Story = {
  args: {
    language: 'fr',
    defaultTemplate: 'classic',
    exportFormat: 'docx',
  } as any,
}
