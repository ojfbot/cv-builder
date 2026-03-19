import type { Meta, StoryObj } from '@storybook/react'
import CommandMenu from './CommandMenu'
import type { CommandMatch } from '../types/slash-commands'

const meta: Meta<typeof CommandMenu> = {
  title: 'Components/CommandMenu',
  component: CommandMenu,
  argTypes: {
    onSelect: { action: 'selected' },
    onClose: { action: 'closed' },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '400px', width: '400px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof CommandMenu>

const sampleMatches: CommandMatch[] = [
  {
    command: {
      name: 'generate',
      description: 'Generate a tailored resume for a specific job listing',
      category: 'agent',
      handler: async () => {},
    },
    query: '/gen',
    score: 0.9,
  },
  {
    command: {
      name: 'analyze',
      description: 'Analyze a job description and calculate match score',
      category: 'agent',
      args: [{ name: 'job-id', required: true, type: 'job-id', description: 'Job listing ID' }],
      handler: async () => {},
    },
    query: '/gen',
    score: 0.7,
  },
  {
    command: {
      name: 'bio',
      description: 'Navigate to your professional bio editor',
      category: 'navigation',
      handler: async () => {},
    },
    query: '/gen',
    score: 0.5,
  },
  {
    command: {
      name: 'clear',
      description: 'Clear the current chat session',
      category: 'utility',
      handler: async () => {},
    },
    query: '/gen',
    score: 0.3,
  },
]

export const Default: Story = {
  args: {
    matches: sampleMatches,
    selectedIndex: 0,
    position: { top: 10, left: 10 },
  },
}

export const SecondItemSelected: Story = {
  args: {
    matches: sampleMatches,
    selectedIndex: 1,
    position: { top: 10, left: 10 },
  },
}

export const SingleMatch: Story = {
  args: {
    matches: [sampleMatches[0]],
    selectedIndex: 0,
    position: { top: 10, left: 10 },
  },
}

export const Empty: Story = {
  args: {
    matches: [],
    selectedIndex: 0,
    position: { top: 10, left: 10 },
  },
}
