import { useEffect } from 'react'
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@carbon/react'
import { ChatProvider, useChat } from '../contexts/ChatContext'
import { useAgent } from '../contexts/AgentContext'
import BioDashboard from './BioDashboard'
import JobsDashboard from './JobsDashboard'
import InteractiveChat from './InteractiveChat'
import OutputsDashboard from './OutputsDashboard'
import ResearchDashboard from './ResearchDashboard'
import PipelinesDashboard from './PipelinesDashboard'
import ToolboxDashboard from './ToolboxDashboard'
import CondensedChat from './CondensedChat'
import './Dashboard.css'

function DashboardContent() {
  const { currentTab, setCurrentTab, requestTabChange } = useChat()
  const { setTabChangeHandler } = useAgent()

  useEffect(() => {
    setTabChangeHandler((tab: number, reason: string) => {
      requestTabChange(tab, reason)
    })
  }, [setTabChangeHandler, requestTabChange])

  return (
    <>
      <div className="dashboard-wrapper">
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
            <Tab>Pipelines</Tab>
            <Tab>Toolbox</Tab>
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
            <TabPanel>
              <PipelinesDashboard />
            </TabPanel>
            <TabPanel>
              <ToolboxDashboard />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      {/* Show condensed chat on all non-Interactive tabs - outside wrapper to avoid layout issues */}
      {/* Keep mounted but hide on Interactive tab to maintain state sync */}
      <div style={{ display: currentTab === 0 ? 'none' : 'block' }}>
        <CondensedChat />
      </div>
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
