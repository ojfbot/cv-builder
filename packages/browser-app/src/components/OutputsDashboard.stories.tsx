import type { Meta, StoryObj } from '@storybook/react'
import OutputsDashboard from './OutputsDashboard'

const meta: Meta<typeof OutputsDashboard> = {
  title: 'Dashboards/OutputsDashboard',
  component: OutputsDashboard,
}

export default meta
type Story = StoryObj<typeof OutputsDashboard>

/** Empty state -- no generated outputs yet. */
export const Default: Story = {}

export const Empty: Story = {}
