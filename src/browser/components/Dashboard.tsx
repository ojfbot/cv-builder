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
import ResearchDashboard from './ResearchDashboard'
import CondensedChat from './CondensedChat'

function DashboardContent() {
  const { currentTab, setCurrentTab, isExpanded, requestTabChange } = useChat()
  const { setTabChangeHandler } = useAgent()

  // Connect the tab change handler from the agent service to the chat context
  useEffect(() => {
    setTabChangeHandler((tab: number, reason: string) => {
      requestTabChange(tab, reason)
    })
  }, [setTabChangeHandler, requestTabChange])

  return (
    <>
      <div className="dashboard-wrapper">
        <Heading className="page-header">CV Builder Dashboard</Heading>

        <Tabs
          selectedIndex={currentTab}
          onChange={({ selectedIndex }) => setCurrentTab(selectedIndex)}
        >
          <TabList aria-label="CV Builder sections" contained>
            <Tab>Interactive</Tab>
            <Tab>Bio</Tab>
            <Tab>Jobs</Tab>
            <Tab>Outputs</Tab>
            <Tab>Research</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <InteractiveChat />
            </TabPanel>
            <TabPanel>
              <BioDashboard />
            </TabPanel>
            <TabPanel>
              <JobsDashboard />
            </TabPanel>
            <TabPanel>
              <OutputsDashboard />
            </TabPanel>
            <TabPanel>
              <ResearchDashboard />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      {/* Show condensed chat on all non-Interactive tabs */}
      {currentTab !== 0 && (
        <CondensedChat />
      )}
    </>
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
