import type { Meta, StoryObj } from '@storybook/react'
import { MarkdownMessage, createBadgeAction, createChatAction, createNavigateAction } from '@ojfbot/frame-ui-components'
import '@ojfbot/frame-ui-components/styles/markdown-message'
import { TabKey } from '../models/navigation'

const meta: Meta<typeof MarkdownMessage> = {
  title: 'Components/MarkdownMessage',
  component: MarkdownMessage,
  argTypes: {
    onExecute: { action: 'executed' },
  },
}

export default meta
type Story = StoryObj<typeof MarkdownMessage>

export const Default: Story = {
  args: {
    content: `## Welcome to Resume Builder

I've analyzed your profile and here's what I found:

- **5 years** of experience in software engineering
- Strong skills in **TypeScript**, **React**, and **Node.js**
- Experience at 3 companies including a FAANG

### Next Steps
- **Update Bio**: Add your latest project details
- **Generate Resume**: Create a tailored resume for your target role`,
  },
}

export const WithCodeBlock: Story = {
  args: {
    content: `Here's a sample cover letter opening:

\`\`\`
Dear Hiring Manager,

I am writing to express my interest in the Senior Frontend Engineer
position at Acme Corp. With over 7 years of experience building
scalable React applications...
\`\`\`

You can customize this template in the **Outputs** tab.`,
  },
}

export const WithSuggestions: Story = {
  args: {
    content: `I've finished analyzing the job description for **Senior Design Engineer at TBCoNY**.

Key findings:
- 85% skill match
- Gap areas: Figma prototyping, design systems at scale
- Strong fit: React, TypeScript, Carbon Design System

What would you like to do next?`,
    suggestions: [
      createBadgeAction('Tailor Resume', [createNavigateAction(TabKey.OUTPUTS)], {
        icon: '📄',
        variant: 'green',
      }),
      createBadgeAction('Research Company', [createChatAction('Research TBCoNY company culture and values')], {
        icon: '🔬',
        variant: 'cyan',
      }),
      createBadgeAction('View Jobs', [createNavigateAction(TabKey.JOBS)], {
        icon: '💼',
        variant: 'blue',
      }),
    ],
  },
}

export const Compact: Story = {
  args: {
    content: `Resume generated successfully. 3 pages, PDF format.

### Next Steps
- **Download**: Save to your device
- **Edit**: Make manual adjustments`,
    compact: true,
  },
}

export const Empty: Story = {
  args: {
    content: '',
  },
}

export const WithTable: Story = {
  args: {
    content: `## Skill Gap Analysis

| Skill | Required | Your Level | Gap |
|-------|----------|-----------|-----|
| React | Expert | Expert | None |
| TypeScript | Advanced | Advanced | None |
| Figma | Intermediate | Beginner | Medium |
| GraphQL | Intermediate | Advanced | None |

Overall match: **87%**`,
  },
}
