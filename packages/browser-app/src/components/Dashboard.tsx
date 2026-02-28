import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'
import { AgentProvider } from '../contexts/AgentContext'
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Heading,
  Tooltip,
} from '@carbon/react'
import { Menu, Close } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setCurrentTab } from '../store/slices/navigationSlice'
import { generateChatSummary, setChatSummary } from '../store/slices/chatSlice'
import { loadV2Settings, setSidebarExpanded } from '../store/slices/v2Slice'
import { TabKey, TAB_ORDER, getTabByKey } from '../models/navigation'
import BioDashboard from './BioDashboard'
import JobsDashboard from './JobsDashboard'
import InteractiveChat from './InteractiveChat'
import OutputsDashboard from './OutputsDashboard'
import ResearchDashboard from './ResearchDashboard'
import PipelinesDashboard from './PipelinesDashboard'
import ToolboxDashboard from './ToolboxDashboard'
import CondensedChat from './CondensedChat'
import { ThreadSidebar } from './ThreadSidebar'
import { V2Toggle } from './V2Toggle'
import './Dashboard.css'

function DashboardContent() {
  const dispatch = useAppDispatch()
  const currentTab = useAppSelector(state => state.navigation.currentTab)
  const currentTabIndex = useAppSelector(state => state.navigation.currentTabIndex)
  const previousTab = useAppSelector(state => state.navigation.previousTab)
  const messages = useAppSelector(state => state.chat.messages)
  const v2Enabled = useAppSelector(state => state.v2.enabled)
  const showThreadSidebar = useAppSelector(state => state.v2.showThreadSidebar)
  const sidebarExpanded = useAppSelector(state => state.v2.sidebarExpanded)
  const bioModalOpen = useAppSelector(state => state.v2.bioModalOpen)

  // Load V2 settings on mount
  useEffect(() => {
    dispatch(loadV2Settings())
  }, [dispatch])

  // Generate chat summary when navigating away from Interactive tab
  useEffect(() => {
    if (previousTab === TabKey.INTERACTIVE && currentTab !== TabKey.INTERACTIVE && messages.length > 1) {
      dispatch(generateChatSummary())
    } else if (currentTab === TabKey.INTERACTIVE) {
      dispatch(setChatSummary(''))
    }
  }, [currentTab, previousTab, messages.length, dispatch])

  // Render tab content based on tab key
  const renderTabContent = (tabKey: TabKey) => {
    switch (tabKey) {
      case TabKey.INTERACTIVE:
        return <InteractiveChat />
      case TabKey.BIO:
        return <BioDashboard />
      case TabKey.JOBS:
        return <JobsDashboard />
      case TabKey.OUTPUTS:
        return <OutputsDashboard />
      case TabKey.RESEARCH:
        return <ResearchDashboard />
      case TabKey.PIPELINES:
        return <PipelinesDashboard />
      case TabKey.TOOLBOX:
        return <ToolboxDashboard />
      default:
        return <div>Unknown tab</div>
    }
  }

  return (
    <>
      {/* V2 Thread Sidebar */}
      {v2Enabled && showThreadSidebar && (
        <ThreadSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => dispatch(setSidebarExpanded(!sidebarExpanded))}
        />
      )}

      <div className={`dashboard-wrapper ${v2Enabled && showThreadSidebar && sidebarExpanded ? 'with-sidebar' : ''}`} data-element="app-container">
        <div className="dashboard-header">
          <Heading className="page-header">CV Builder Dashboard</Heading>

          <div className="dashboard-header-actions">
            <V2Toggle />

            {/* Thread sidebar toggle button (V2 only) */}
            {v2Enabled && showThreadSidebar && (
              <Tooltip
                align="bottom-right"
                label={sidebarExpanded ? 'Close threads' : 'Show threads'}
              >
                <button
                  className="sidebar-toggle-btn"
                  onClick={() => dispatch(setSidebarExpanded(!sidebarExpanded))}
                  disabled={bioModalOpen}
                  aria-label="Toggle thread sidebar"
                  aria-hidden={bioModalOpen}
                  style={{
                    opacity: bioModalOpen ? 0.3 : 1,
                    pointerEvents: bioModalOpen ? 'none' : 'auto',
                    cursor: bioModalOpen ? 'not-allowed' : 'pointer'
                  }}
                >
                  {sidebarExpanded ? <Close size={20} /> : <Menu size={20} />}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <Tabs
          selectedIndex={currentTabIndex}
          onChange={({ selectedIndex }) => dispatch(setCurrentTab(selectedIndex))}
        >
          <TabList aria-label="CV Builder sections" contained>
            {TAB_ORDER.map(tabKey => {
              const tab = getTabByKey(tabKey)
              return (
                <Tab
                  key={tabKey}
                  data-element={`${tabKey}-tab`}
                >
                  {tab.icon} {tab.label}
                </Tab>
              )
            })}
          </TabList>
          <TabPanels>
            {TAB_ORDER.map(tabKey => (
              <TabPanel
                key={tabKey}
                data-element={`${tabKey}-panel`}
              >
                {renderTabContent(tabKey)}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>

      {/* Show condensed chat on all non-Interactive tabs */}
      {currentTab !== TabKey.INTERACTIVE && (
        <CondensedChat />
      )}
    </>
  )
}

// When mounted as a Module Federation remote, the shell's Provider wraps everything
// at a higher level but does NOT carry cv-builder's slice reducers. This self-contained
// wrapper ensures the remote is always backed by its own store + context regardless of
// how the shell composes its store. See docs/FEDERATION.md for the Redux store contract.
function Dashboard() {
  return (
    <Provider store={store}>
      <AgentProvider>
        <DashboardContent />
      </AgentProvider>
    </Provider>
  )
}

export default Dashboard
