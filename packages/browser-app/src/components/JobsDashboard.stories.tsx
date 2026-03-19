import type { Meta, StoryObj } from '@storybook/react'
import JobsDashboard from './JobsDashboard'

const meta: Meta<typeof JobsDashboard> = {
  title: 'Dashboards/JobsDashboard',
  component: JobsDashboard,
}

export default meta
type Story = StoryObj<typeof JobsDashboard>

/** The default empty state -- no job listings have been added yet. */
export const Default: Story = {}

/** Same as Default; the component currently renders an empty table with a prompt. */
export const Empty: Story = {}
