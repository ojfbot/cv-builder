import type { Action, BadgeAction } from '@ojfbot/frame-ui-components'
import { AppDispatch } from '../store'
import {
  addMessage,
  setDraftInput as setDraftInputAction,
  setDisplayState as setDisplayStateAction,
} from '../store/slices/chatSlice'
import { navigateToTab } from '../store/slices/navigationSlice'
import { TabKey } from '../models/navigation'

/**
 * Action Dispatcher — cv-builder specific.
 *
 * Executes shared Action[] sequences, mapping NavigateAction.target
 * to cv-builder's TabKey enum for tab navigation.
 */

export interface ActionDispatcherContext {
  dispatch: AppDispatch
  onSendMessage?: (message: string) => void | Promise<void>
  onFileUpload?: (accept?: string, multiple?: boolean) => void | Promise<void>
}

/** Map a NavigateAction.target string to TabKey. */
const resolveTabKey = (target: string): TabKey => {
  const map: Record<string, TabKey> = {
    interactive: TabKey.INTERACTIVE,
    bio: TabKey.BIO,
    jobs: TabKey.JOBS,
    outputs: TabKey.OUTPUTS,
    research: TabKey.RESEARCH,
    pipelines: TabKey.PIPELINES,
    toolbox: TabKey.TOOLBOX,
  }
  return map[target] ?? TabKey.INTERACTIVE
}

export const executeAction = async (
  action: Action,
  context: ActionDispatcherContext,
): Promise<void> => {
  switch (action.type) {
    case 'chat': {
      if (action.expandChat) {
        context.dispatch(setDisplayStateAction('expanded'))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (context.onSendMessage) {
        await context.onSendMessage(action.message)
      } else {
        context.dispatch(setDraftInputAction(action.message))
      }
      break
    }

    case 'navigate': {
      const tabKey = resolveTabKey(action.target)
      context.dispatch(navigateToTab(tabKey))
      break
    }

    case 'file_upload': {
      if (context.onFileUpload) {
        await context.onFileUpload(action.accept, action.multiple)
        if (action.targetTab !== undefined) {
          const tabKey = resolveTabKey(String(action.targetTab))
          context.dispatch(navigateToTab(tabKey))
        }
      }
      break
    }

    case 'expand_chat': {
      context.dispatch(setDisplayStateAction('expanded'))
      break
    }

    case 'copy_text': {
      try {
        await navigator.clipboard.writeText(action.text)
        context.dispatch(addMessage({
          role: 'assistant',
          content: 'Copied to clipboard!',
        }))
      } catch (error) {
        console.error('[ActionDispatcher] Failed to copy:', error)
      }
      break
    }

    case 'download': {
      const link = document.createElement('a')
      link.href = action.url
      link.download = action.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      break
    }

    case 'external_link': {
      if (action.openInNew) {
        window.open(action.url, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = action.url
      }
      break
    }
  }
}

export const executeActions = async (
  actions: Action[],
  context: ActionDispatcherContext,
): Promise<void> => {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    try {
      if (action.type === 'navigate' && i < actions.length - 1 && actions[i + 1].type === 'chat') {
        await executeAction(action, context)
        await new Promise(resolve => setTimeout(resolve, 150))
        context.dispatch(setDisplayStateAction('expanded'))
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        await executeAction(action, context)
        if (actions.length > 1 && i < actions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
    } catch (error) {
      console.error('[ActionDispatcher] Error:', action, error)
    }
  }
}

/** Handle a badge execution including suggestedMessage follow-up. */
export const executeBadgeAction = async (
  badgeAction: BadgeAction,
  context: ActionDispatcherContext & {
    isExpanded: boolean
    onExpandChat: () => void
    onFocusInput: () => void
  },
): Promise<void> => {
  const { actions } = badgeAction

  await executeActions(actions, context)

  if (badgeAction.suggestedMessage) {
    const { role, content, compactContent } = badgeAction.suggestedMessage
    const hasNavigate = actions.some(a => a.type === 'navigate')

    let willBeExpanded = context.isExpanded

    if (hasNavigate && role === 'assistant' && !context.isExpanded) {
      context.onExpandChat()
      willBeExpanded = true
      await new Promise(resolve => setTimeout(resolve, 200))
    } else {
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    const messageToUse = (!willBeExpanded && compactContent) ? compactContent : content

    if (role === 'user') {
      context.dispatch(setDraftInputAction(messageToUse))
      if (hasNavigate || willBeExpanded) {
        setTimeout(async () => {
          if (context.onSendMessage) await context.onSendMessage(messageToUse)
        }, 100)
      } else {
        context.onFocusInput()
      }
    } else if (role === 'assistant') {
      context.dispatch(addMessage({ role: 'assistant', content: messageToUse }))
      setTimeout(() => context.onFocusInput(), 100)
    }
  }
}
