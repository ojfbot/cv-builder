import { Tag } from '@carbon/react'
import { BadgeAction, Action } from '../models/badge-action'
import './BadgeButton.css'

interface BadgeButtonProps {
  badgeAction: BadgeAction
  onExecute: (actions: Action[], badgeAction: BadgeAction) => void
  className?: string
  size?: 'sm' | 'md'
}

/**
 * BadgeButton Component
 *
 * Displays an inline badge/tag button that can execute multiple actions when clicked.
 * Integrates with the BadgeAction model for type-safe action definitions.
 */
function BadgeButton({ badgeAction, onExecute, className = '', size = 'md' }: BadgeButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (badgeAction.disabled) {
      return
    }

    console.log('[BadgeButton] Executing actions:', badgeAction.actions)
    console.log('[BadgeButton] Suggested message:', badgeAction.suggestedMessage)
    onExecute(badgeAction.actions, badgeAction)
  }

  // Map variant to Carbon Design System tag types
  const carbonType = badgeAction.variant || 'purple'

  return (
    <Tag
      type={carbonType}
      className={`badge-button ${size} ${badgeAction.disabled ? 'disabled' : ''} ${className}`}
      onClick={handleClick}
      title={badgeAction.tooltip}
    >
      {badgeAction.icon && <span className="badge-icon">{badgeAction.icon}</span>}
      <span className="badge-label">{badgeAction.label}</span>
    </Tag>
  )
}

export default BadgeButton
