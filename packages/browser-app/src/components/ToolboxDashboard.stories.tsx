import type { Meta, StoryObj } from '@storybook/react'
import ToolboxDashboard from './ToolboxDashboard'

const meta: Meta<typeof ToolboxDashboard> = {
  title: 'Dashboards/ToolboxDashboard',
  component: ToolboxDashboard,
}

export default meta
type Story = StoryObj<typeof ToolboxDashboard>

/** Empty state with Actions, Agents, and Tools tabs. */
export const Default: Story = {}

export const Empty: Story = {}
