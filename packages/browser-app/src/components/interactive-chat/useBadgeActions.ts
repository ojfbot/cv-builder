import { useCallback } from 'react'
import { useAppDispatch } from '../../store/hooks'
import { setDisplayState as setDisplayStateAction } from '../../store/slices/chatSlice'
import { TabKey } from '../../models/navigation'
import { createBadgeAction, createNavigateAction } from '../../models/badge-action'
import type { BadgeAction } from '@ojfbot/frame-ui-components'
import { executeBadgeAction } from '../../utils/action-dispatcher'

interface UseBadgeActionsOptions {
  onSendMessage: (message: string) => Promise<void>
  onFileUpload: (accept?: string, multiple?: boolean) => Promise<void>
  onFocusInput: () => void
}

export function useBadgeActions({ onSendMessage, onFileUpload, onFocusInput }: UseBadgeActionsOptions) {
  const dispatch = useAppDispatch()

  const handleBadgeExecute = useCallback(async (badgeAction: BadgeAction) => {
    await executeBadgeAction(badgeAction, {
      dispatch,
      isExpanded: true,
      onSendMessage: async (message: string) => {
        await onSendMessage(message)
      },
      onFileUpload,
      onExpandChat: () => dispatch(setDisplayStateAction('expanded')),
      onFocusInput,
    })
  }, [dispatch, onSendMessage, onFileUpload, onFocusInput])

  const matchAction = useCallback((label: string, suggestions: BadgeAction[]): BadgeAction | null => {
    if (suggestions.length > 0) {
      const exact = suggestions.find(s => s.label === label)
      if (exact) return exact

      const lowerLabel = label.toLowerCase()
      const partial = suggestions.find(s =>
        s.label.toLowerCase().includes(lowerLabel) ||
        lowerLabel.includes(s.label.toLowerCase()),
      )
      if (partial) return partial
    }

    const l = label.toLowerCase()

    if (l.match(/\b(bio|profile|add.*(bio|profile)|create.*(bio|profile))\b/))
      return createBadgeAction(label, [createNavigateAction(TabKey.BIO)], { icon: '👤' })

    if (l.match(/\b(job(?!.*generat)|listing|add.*job|import.*job|target)\b/))
      return createBadgeAction(label, [createNavigateAction(TabKey.JOBS)], { icon: '💼' })

    if (l.match(/\b(output|view.*resume|check.*resume|see.*resume)\b/))
      return createBadgeAction(label, [createNavigateAction(TabKey.OUTPUTS)], { icon: '📄' })

    if (l.match(/\b(research|intelligence|analysis)\b/))
      return createBadgeAction(label, [createNavigateAction(TabKey.RESEARCH)], { icon: '🔬' })

    if (l.match(/\b(pipeline|workflow|automation)\b/))
      return createBadgeAction(label, [createNavigateAction(TabKey.PIPELINES)], { icon: '🔄' })

    if (l.match(/\b(toolbox|tool|utility)\b/))
      return createBadgeAction(label, [createNavigateAction(TabKey.TOOLBOX)], { icon: '🧰' })

    return null
  }, [])

  return { handleBadgeExecute, matchAction }
}
