import { useState, useEffect } from 'react'
import {
  Theme,
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
} from '@carbon/react'
import { Asleep, Light, Settings } from '@carbon/icons-react'
import { AgentProvider } from './contexts/AgentContext'
import Dashboard from './components/Dashboard'
import ApiKeySettings from './components/ApiKeySettings'
import './App.css'

function App() {
  const [theme, setTheme] = useState<'white' | 'g100'>('g100')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sideNavExpanded, setSideNavExpanded] = useState(false)

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-carbon-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'white' ? 'g100' : 'white')
  }

  const onClickSideNavExpand = () => {
    setSideNavExpanded(!sideNavExpanded)
  }

  return (
    <AgentProvider>
      <Theme theme={theme}>
        <div className="app-container" style={{ maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header aria-label="CV Builder" style={{ zIndex: 9000, position: 'relative', marginLeft: sideNavExpanded ? '256px' : '0', transition: 'margin-left 0.11s cubic-bezier(0.2, 0, 1, 0.9)' }}>
            <HeaderMenuButton
              aria-label={sideNavExpanded ? 'Close menu' : 'Open menu'}
              onClick={onClickSideNavExpand}
              isActive={sideNavExpanded}
              aria-expanded={sideNavExpanded}
            />
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

          {sideNavExpanded && (
            <SideNav
              aria-label="Side navigation"
              expanded={sideNavExpanded}
              onOverlayClick={onClickSideNavExpand}
              style={{ zIndex: 8000 }}
            >
              <SideNavItems>
                {/* Sidebar menu items will go here */}
              </SideNavItems>
            </SideNav>
          )}

          <div className="main-content" style={{ marginLeft: sideNavExpanded ? '256px' : '0', transition: 'margin-left 0.11s cubic-bezier(0.2, 0, 1, 0.9)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Dashboard />
          </div>
        </div>

        <ApiKeySettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </Theme>
    </AgentProvider>
  )
}

export default App
