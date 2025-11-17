import { useState, useEffect, useRef } from 'react'
import {
  Theme,
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderMenuButton,
  SideNav,
  SideNavItems,
  TextInput,
} from '@carbon/react'
import { Asleep, Light, Settings } from '@carbon/icons-react'
import { Provider } from 'react-redux'
import { store } from './store'
import { AgentProvider } from './contexts/AgentContext'
import Dashboard from './components/Dashboard'
import ApiKeySettings from './components/ApiKeySettings'
import './App.css'

function App() {
  const [theme, setTheme] = useState<'white' | 'g100'>('g100')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sideNavExpanded, setSideNavExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Mock applications for demo
  const applications = [
    'CV Builder',
    'HR Portal',
    'Analytics Dashboard',
    'Project Manager',
    'Document Editor',
    'Calendar App'
  ]

  // Filter applications based on search query
  const filteredApplications = applications.filter(app =>
    app.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  // Focus search input when sidebar expands
  useEffect(() => {
    if (sideNavExpanded && searchInputRef.current) {
      // Small delay to ensure the sidebar is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 150)
    }
  }, [sideNavExpanded])

  return (
    <Provider store={store}>
      <AgentProvider>
        <Theme theme={theme}>
        <div className="app-container" style={{ maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header aria-label="CV Builder">
            <HeaderMenuButton
              data-element="sidebar-toggle"
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
                data-element="theme-toggle"
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
            >
              <SideNavItems>
                <div className="sidebar-search-container">
                  <TextInput
                    ref={searchInputRef}
                    id="app-search"
                    labelText=""
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="lg"
                  />
                  
                  <div className="applications-list">
                    {filteredApplications.length > 0 ? (
                      filteredApplications.map((app, index) => (
                        <div key={index} className="application-item">
                          {app}
                        </div>
                      ))
                    ) : (
                      <div className="no-results">No applications found</div>
                    )}
                  </div>
                </div>
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
    </Provider>
  )
}

export default App
