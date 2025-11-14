import { useEffect } from 'react'
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Heading,
} from '@carbon/react'
import { ChatProvider, useChat } from '../contexts/ChatContext'
import { useAgent } from '../contexts/AgentContext'
import BioDashboard from './BioDashboard'
import JobsDashboard from './JobsDashboard'
import InteractiveChat from './InteractiveChat'
import OutputsDashboard from './OutputsDashboard'
import CondensedChat from './CondensedChat'

function DashboardContent() {
  const { currentTab, setCurrentTab, requestTabChange } = useChat()
  const { setTabChangeHandler } = useAgent()

  // Connect the tab change handler from the agent service to the chat context
  useEffect(() => {
    setTabChangeHandler((tab: number, reason: string) => {
      requestTabChange(tab, reason)
    })
  }, [setTabChangeHandler, requestTabChange])

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Heading className="page-header">CV Builder Dashboard</Heading>
      </div>

      <div className="dashboard-tabs">
        <Tabs
          selectedIndex={currentTab}
          onChange={({ selectedIndex }) => setCurrentTab(selectedIndex)}
        >
          <TabList aria-label="CV Builder sections" contained>
            <Tab>Interactive</Tab>
            <Tab>Bio</Tab>
            <Tab>Jobs</Tab>
            <Tab>Outputs</Tab>
          </TabList>
          <div className="dashboard-tab-panels">
            <TabPanels>
              <TabPanel style={{ height: '100%', overflow: 'hidden' }}>
                <InteractiveChat />
              </TabPanel>
              <TabPanel style={{ height: '100%', overflow: 'auto', padding: '1rem 0 2rem 0' }}>
                <BioDashboard />
              </TabPanel>
              <TabPanel style={{ height: '100%', overflow: 'auto', padding: '1rem 0 2rem 0' }}>
                <JobsDashboard />
              </TabPanel>
              <TabPanel style={{ height: '100%', overflow: 'auto', padding: '1rem 0 2rem 0' }}>
                <OutputsDashboard />
              </TabPanel>
            </TabPanels>
          </div>
        </Tabs>
      </div>

      {/* Show condensed chat on all non-Interactive tabs */}
      {currentTab !== 0 && (
        <CondensedChat />
      )}
    </div>
  )
}

function Dashboard() {
  return (
    <ChatProvider>
      <DashboardContent />
    </ChatProvider>
  )
}

export default Dashboard
