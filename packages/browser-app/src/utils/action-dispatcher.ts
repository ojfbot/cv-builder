import { Action } from '../models/badge-action'
import { AppDispatch } from '../store'
import {
  addMessage,
  setDraftInput as setDraftInputAction,
  setIsExpanded as setIsExpandedAction,
} from '../store/slices/chatSlice'
import { navigateToTab, setCurrentTab as setCurrentTabAction } from '../store/slices/navigationSlice'
import { convertIndexToKey } from '../models/navigation'

/**
 * Action Dispatcher
 *
 * Centralized handler for executing badge button actions.
 * Integrates with Redux store to dispatch state changes.
 */

export interface ActionDispatcherContext {
  dispatch: AppDispatch
  onSendMessage?: (message: string) => void | Promise<void>
  onFileUpload?: (accept?: string, multiple?: boolean) => void | Promise<void>
}

/**
 * Execute a single action
 */
export const executeAction = async (
  action: Action,
  context: ActionDispatcherContext
): Promise<void> => {
  console.log('[ActionDispatcher] Executing action:', action)

  switch (action.type) {
    case 'chat': {
      // Optionally expand chat first
      if (action.expandChat) {
        context.dispatch(setIsExpandedAction(true))
        // Small delay to allow UI to expand
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Send the message
      if (context.onSendMessage) {
        await context.onSendMessage(action.message)
      } else {
        // Fallback: Set draft input and let user send manually
        context.dispatch(setDraftInputAction(action.message))
      }
      break
    }

    case 'navigate': {
      console.log('[ActionDispatcher] Navigating to tab:', action.tab)
      // Use the new keyed navigation
      context.dispatch(navigateToTab(action.tab))
      // Legacy support: if tabIndex is provided, use it
      if (action.tabIndex !== undefined) {
        console.log('[ActionDispatcher] Using legacy tabIndex:', action.tabIndex)
        context.dispatch(setCurrentTabAction(action.tabIndex))
      }
      break
    }

    case 'file_upload': {
      if (context.onFileUpload) {
        await context.onFileUpload(action.accept, action.multiple)

        // Navigate to target tab after upload if specified
        if (action.targetTab !== undefined) {
          const tabKey = convertIndexToKey(action.targetTab)
          context.dispatch(navigateToTab(tabKey))
        }
      } else {
        console.warn('[ActionDispatcher] File upload not implemented')
      }
      break
    }

    case 'expand_chat': {
      context.dispatch(setIsExpandedAction(true))
      break
    }

    case 'copy_text': {
      try {
        await navigator.clipboard.writeText(action.text)
        console.log('[ActionDispatcher] Text copied to clipboard')

        // Could dispatch a notification here
        context.dispatch(
          addMessage({
            role: 'assistant',
            content: '✅ Copied to clipboard!',
          })
        )
      } catch (error) {
        console.error('[ActionDispatcher] Failed to copy text:', error)
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
      console.log('[ActionDispatcher] Download initiated:', action.filename)
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

    default:
      console.warn('[ActionDispatcher] Unknown action type:', action)
  }
}

/**
 * Execute multiple actions in sequence
 */
export const executeActions = async (
  actions: Action[],
  context: ActionDispatcherContext
): Promise<void> => {
  console.log('[ActionDispatcher] Executing action chain:', actions)

  // Check if we have a navigate + chat action combo
  const hasNavigate = actions.some(a => a.type === 'navigate')
  const hasChatAfterNavigate = hasNavigate && actions.some(a => a.type === 'chat')

  // If navigating with a chat action, expand the chat
  if (hasChatAfterNavigate) {
    console.log('[ActionDispatcher] Navigation + chat combo detected - expanding chat')
  }

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    try {
      // If this is a navigate action followed by a chat action, expand chat
      if (action.type === 'navigate' && i < actions.length - 1 && actions[i + 1].type === 'chat') {
        await executeAction(action, context)
        // Add delay to allow tab transition
        await new Promise(resolve => setTimeout(resolve, 150))
        // Expand the chat before sending the message
        context.dispatch(setIsExpandedAction(true))
        // Add another delay to allow chat expansion
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        await executeAction(action, context)
        // Small delay between actions for better UX
        if (actions.length > 1 && i < actions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
    } catch (error) {
      console.error('[ActionDispatcher] Error executing action:', action, error)
      // Continue with next action even if one fails
    }
  }
}

/**
 * Parse badge action metadata from agent response
 */
export const parseBadgeActionMetadata = (content: string): any => {
  try {
    // Look for <metadata> tags in response
    const metadataMatch = content.match(/<metadata>([\s\S]*?)<\/metadata>/i)
    if (!metadataMatch) {
      return null
    }

    const metadataJson = metadataMatch[1].trim()
    return JSON.parse(metadataJson)
  } catch (error) {
    console.error('[ActionDispatcher] Failed to parse metadata:', error)
    return null
  }
}

/**
 * Extract badge actions from metadata
 */
export const extractBadgeActions = (metadata: any): any[] => {
  if (!metadata?.suggestions) {
    return []
  }

  return Array.isArray(metadata.suggestions) ? metadata.suggestions : []
}
