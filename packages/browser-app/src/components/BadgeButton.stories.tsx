import type { Meta, StoryObj } from '@storybook/react'
import BadgeButton from './BadgeButton'
import { createBadgeAction, createChatAction, createNavigateAction } from '../models/badge-action'
import { TabKey } from '../models/navigation'

const meta: Meta<typeof BadgeButton> = {
  title: 'Components/BadgeButton',
  component: BadgeButton,
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] },
    onExecute: { action: 'executed' },
  },
}

export default meta
type Story = StoryObj<typeof BadgeButton>

export const Default: Story = {
  args: {
    badgeAction: createBadgeAction('Add Experience', [createChatAction('Add my work experience')], {
      icon: '👤',
      variant: 'purple',
    }),
  },
}

export const NavigationAction: Story = {
  args: {
    badgeAction: createBadgeAction('View Jobs', [createNavigateAction(TabKey.JOBS)], {
      icon: '💼',
      variant: 'blue',
    }),
  },
}

export const SmallSize: Story = {
  args: {
    badgeAction: createBadgeAction('Generate Resume', [createChatAction('Generate a tailored resume')], {
      icon: '📄',
      variant: 'green',
    }),
    size: 'sm',
  },
}

export const Disabled: Story = {
  args: {
    badgeAction: createBadgeAction('Unavailable', [createChatAction('noop')], {
      icon: '🚫',
      variant: 'gray',
      disabled: true,
    }),
  },
}

export const MultipleVariants: Story = {
  render: () => {
    const variants = ['purple', 'blue', 'cyan', 'teal', 'green', 'magenta', 'red', 'gray'] as const
    return (
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {variants.map((variant) => (
          <BadgeButton
            key={variant}
            badgeAction={createBadgeAction(variant, [createChatAction('test')], { variant })}
            onExecute={() => {}}
          />
        ))}
      </div>
    )
  },
}
