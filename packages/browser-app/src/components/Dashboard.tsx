import { useEffect } from 'react'
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Heading,
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

  // Load V2 settings on mount
  useEffect(() => {
    dispatch(loadV2Settings())
  }, [dispatch])

  // Auto-expand sidebar when V2 is enabled
  useEffect(() => {
    if (v2Enabled && showThreadSidebar) {
      dispatch(setSidebarExpanded(true))
    } else {
      dispatch(setSidebarExpanded(false))
    }
  }, [v2Enabled, showThreadSidebar, dispatch])

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

          {/* Thread sidebar toggle button (V2 only) */}
          {v2Enabled && showThreadSidebar && (
            <button
              className="sidebar-toggle-btn"
              onClick={() => dispatch(setSidebarExpanded(!sidebarExpanded))}
              aria-label="Toggle thread sidebar"
            >
              {sidebarExpanded ? <Close size={20} /> : <Menu size={20} />}
            </button>
          )}
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

function Dashboard() {
  return <DashboardContent />
}

export default Dashboard
