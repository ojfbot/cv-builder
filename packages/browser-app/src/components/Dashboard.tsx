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
} from '@carbon/react'
import { DashboardLayout, ErrorBoundary, SidebarToggle } from '@ojfbot/frame-ui-components'
import '@ojfbot/frame-ui-components/styles/dashboard-layout'
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
import ThreadSidebarConnected from './ThreadSidebarConnected'
import { V2Toggle } from './V2Toggle'
import './Dashboard.css'

interface DashboardProps {
  /** True when mounted inside the Frame shell host. Suppresses the internal
   *  app title heading and reduces standalone-mode margins so the shell's own
   *  chrome governs layout. Does NOT remove the V2 / thread-sidebar controls. */
  shellMode?: boolean
}

function DashboardContent({ shellMode }: DashboardProps) {
  const dispatch = useAppDispatch()
  const currentTab = useAppSelector(state => state.navigation.currentTab)
  const currentTabIndex = useAppSelector(state => state.navigation.currentTabIndex)
  const previousTab = useAppSelector(state => state.navigation.previousTab)
  const messages = useAppSelector(state => state.chat.messages)
  const v2Enabled = useAppSelector(state => state.v2.enabled)
  const showThreadSidebar = useAppSelector(state => state.v2.showThreadSidebar)
  const sidebarExpanded = useAppSelector(state => state.v2.sidebarExpanded)
  const chatExpanded = useAppSelector(state => state.chat.displayState === 'expanded')

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
        <ThreadSidebarConnected
          isExpanded={sidebarExpanded}
          onToggle={() => dispatch(setSidebarExpanded(!sidebarExpanded))}
        />
      )}

      <DashboardLayout
        shellMode={shellMode}
        sidebarExpanded={v2Enabled && showThreadSidebar && sidebarExpanded}
        chatExpanded={chatExpanded}
      >
        <DashboardLayout.Header>
          <Heading className="page-header">Resume Builder Dashboard</Heading>

          <div className="dashboard-header-actions">
            <V2Toggle />
            {v2Enabled && showThreadSidebar && (
              <SidebarToggle isExpanded={sidebarExpanded} onToggle={() => dispatch(setSidebarExpanded(!sidebarExpanded))} />
            )}
          </div>
        </DashboardLayout.Header>

        <Tabs
          selectedIndex={currentTabIndex}
          onChange={({ selectedIndex }) => dispatch(setCurrentTab(selectedIndex))}
        >
          <TabList aria-label="Resume Builder sections" contained>
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
      </DashboardLayout>

      {/* Show condensed chat on all non-Interactive tabs */}
      {currentTab !== TabKey.INTERACTIVE && (
        <CondensedChat />
      )}
    </>
  )
}

// Self-contained export for Module Federation. When mounted by the shell, this carries
// its own store + context. In standalone mode App.tsx also wraps in Provider+AgentProvider
// with the SAME store singleton — the inner Provider wins for DashboardContent, and
// AgentProvider safely skips re-init (checks `if (!orchestrator)` against the same store).
// Double-wrap is intentional and harmless. See docs/FEDERATION.md.
function Dashboard({ shellMode }: DashboardProps) {
  return (
    <Provider store={store}>
      <AgentProvider>
        <ErrorBoundary>
          <DashboardContent shellMode={shellMode} />
        </ErrorBoundary>
      </AgentProvider>
    </Provider>
  )
}

export default Dashboard
