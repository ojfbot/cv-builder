import { useEffect } from 'react'
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Heading,
} from '@carbon/react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setCurrentTab, requestTabChange } from '../store/slices/navigationSlice'
import { generateChatSummary, setChatSummary } from '../store/slices/chatSlice'
import { useAgent } from '../contexts/AgentContext'
import BioDashboard from './BioDashboard'
import JobsDashboard from './JobsDashboard'
import InteractiveChat from './InteractiveChat'
import OutputsDashboard from './OutputsDashboard'
import ResearchDashboard from './ResearchDashboard'
import CondensedChat from './CondensedChat'
import './Dashboard.css'

function DashboardContent() {
  const dispatch = useAppDispatch()
  const currentTab = useAppSelector(state => state.navigation.currentTab)
  const previousTab = useAppSelector(state => state.navigation.previousTab)
  const messages = useAppSelector(state => state.chat.messages)
  const { setTabChangeHandler } = useAgent()

  // Connect the tab change handler from the agent service to Redux
  useEffect(() => {
    setTabChangeHandler((tab: number, reason: string) => {
      dispatch(requestTabChange({ tab, reason }))
    })
  }, [setTabChangeHandler, dispatch])

  // Generate chat summary when navigating away from Interactive tab
  useEffect(() => {
    if (previousTab === 0 && currentTab !== 0 && messages.length > 1) {
      dispatch(generateChatSummary())
    } else if (currentTab === 0) {
      dispatch(setChatSummary(''))
    }
  }, [currentTab, previousTab, messages.length, dispatch])

  return (
    <>
      <div className="dashboard-wrapper">
        <Heading className="page-header">CV Builder Dashboard</Heading>

        <Tabs
          selectedIndex={currentTab}
          onChange={({ selectedIndex }) => dispatch(setCurrentTab(selectedIndex))}
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
  return <DashboardContent />
}

export default Dashboard
