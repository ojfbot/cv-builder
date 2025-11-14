import { useState, useEffect } from 'react'
import {
  Theme,
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Content,
  Grid,
  Column,
} from '@carbon/react'
import { Asleep, Light, Settings } from '@carbon/icons-react'
import { Provider } from 'react-redux'
import { store } from './store'
import { AgentProvider } from './contexts/AgentContext'
import Dashboard from './components/Dashboard'
import ApiKeySettings from './components/ApiKeySettings'

function App() {
  const [theme, setTheme] = useState<'white' | 'g100'>('g100')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-carbon-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'white' ? 'g100' : 'white')
  }

  return (
    <Provider store={store}>
      <AgentProvider>
        <Theme theme={theme}>
          <Header aria-label="CV Builder">
            <HeaderName prefix="">CV Builder</HeaderName>
            <HeaderGlobalBar>
              <HeaderGlobalAction
                aria-label="Settings"
                tooltipAlignment="end"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings size={20} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label="Toggle theme"
                tooltipAlignment="end"
                onClick={toggleTheme}
              >
                {theme === 'white' ? <Asleep size={20} /> : <Light size={20} />}
              </HeaderGlobalAction>
            </HeaderGlobalBar>
          </Header>
          <Content className="main-content">
            <Dashboard />
          </Content>

          <ApiKeySettings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Theme>
      </AgentProvider>
    </Provider>
  )
}

export default App
