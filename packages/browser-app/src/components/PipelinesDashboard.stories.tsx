import type { Meta, StoryObj } from '@storybook/react'
import PipelinesDashboard from './PipelinesDashboard'

const meta: Meta<typeof PipelinesDashboard> = {
  title: 'Dashboards/PipelinesDashboard',
  component: PipelinesDashboard,
}

export default meta
type Story = StoryObj<typeof PipelinesDashboard>

/** Empty state -- no pipelines configured. */
export const Default: Story = {}

export const Empty: Story = {}
