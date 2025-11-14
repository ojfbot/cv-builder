import { useRef, useEffect, useCallback } from 'react'
import {
  TextInput,
  TextArea,
  Button,
  IconButton,
  InlineLoading,
  Tile,
} from '@carbon/react'
import { SendAlt, Minimize, ChatBot } from '@carbon/icons-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  addMessage,
  setDraftInput as setDraftInputAction,
  setIsLoading,
  setStreamingContent,
  setIsExpanded as setIsExpandedAction,
} from '../store/slices/chatSlice'
import { setCurrentTab as setCurrentTabAction } from '../store/slices/navigationSlice'
import { useAgent } from '../contexts/AgentContext'
import MarkdownMessage from './MarkdownMessage'
import { Action } from '../models/badge-action'
import { executeActions } from '../utils/action-dispatcher'
import './CondensedChat.css'

// Legacy interface - kept for backward compatibility only
interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

function CondensedChat() {
  const dispatch = useAppDispatch()
  const messages = useAppSelector(state => state.chat.messages)
  const draftInput = useAppSelector(state => state.chat.draftInput)
  const chatSummary = useAppSelector(state => state.chat.chatSummary)
  const isLoading = useAppSelector(state => state.chat.isLoading)
  const streamingContent = useAppSelector(state => state.chat.streamingContent)
  const isExpanded = useAppSelector(state => state.chat.isExpanded)
  const unreadCount = useAppSelector(state => state.chat.unreadCount)
  const { orchestrator, isInitialized } = useAgent()

  const inputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom - direct scrollTop manipulation is more reliable
  const scrollToBottom = useCallback((smooth = false) => {
    // Use multiple RAF calls to ensure layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current
          if (smooth) {
            // Smooth animated scroll
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            })
          } else {
            // Instant scroll
            container.scrollTop = container.scrollHeight
          }
          console.log('[CondensedChat] Scrolled to:', container.scrollTop, 'of', container.scrollHeight)
        }
      })
    })
  }, [])

  // Auto-focus input when expanding
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        textAreaRef.current?.focus()
      }, 100)
      // Scroll to bottom when expanding to show latest messages (with smooth animation)
      scrollToBottom(true)
    }
  }, [isExpanded, scrollToBottom])

  // Auto-scroll when messages change (only when expanded)
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      console.log('[CondensedChat] Messages changed, scrolling. Count:', messages.length)
      scrollToBottom()
    }
  }, [messages, isExpanded, scrollToBottom])

  // Auto-scroll when streaming content changes (only when expanded)
  useEffect(() => {
    if (isExpanded && streamingContent) {
      scrollToBottom()
    }
  }, [streamingContent, isExpanded, scrollToBottom])


  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || draftInput.trim()
    if (!textToSend || isLoading || !orchestrator || !isInitialized) return

    const userMessage = {
      role: 'user' as const,
      content: textToSend
    }

    dispatch(addMessage(userMessage))
    // Clear input immediately and synchronously
    dispatch(setDraftInputAction(''))
    dispatch(setIsLoading(true))
    dispatch(setStreamingContent(''))

    try {
      let fullResponse = ''

      // In condensed mode, request terser responses
      const contextPrompt = isExpanded
        ? userMessage.content // Full mode - no prefix
        : `[CONDENSED MODE - Please keep your response brief and action-oriented. User is working in another tab.]\n\n${userMessage.content}`

      await orchestrator.processRequestStreaming(
        contextPrompt,
        (chunk) => {
          fullResponse += chunk
          // Show streaming in expanded mode
          if (isExpanded) {
            dispatch(setStreamingContent(fullResponse))
          }
        }
      )

      // Extract suggestions
      const suggestions = extractSuggestionsFromResponse(fullResponse)

      // Remove metadata block from displayed content
      let cleanedContent = fullResponse.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '')
      cleanedContent = cleanedContent.replace(/\[NAVIGATE_TO_TAB:\d+:[^\]]+\]/g, '').trim()

      dispatch(addMessage({
        role: 'assistant',
        content: cleanedContent,
        suggestions
      }))

      dispatch(setStreamingContent(''))
    } catch (error) {
      dispatch(addMessage({
        role: 'assistant',
        content: `## ❌ Error\n\n${error instanceof Error ? error.message : 'An unknown error occurred'}`
      }))
      dispatch(setStreamingContent(''))
    } finally {
      dispatch(setIsLoading(false))
    }
  }, [draftInput, isLoading, orchestrator, isInitialized, dispatch, isExpanded])

  const extractSuggestionsFromResponse = (response: string): import('../models/badge-action').BadgeAction[] => {
    const suggestions: import('../models/badge-action').BadgeAction[] = []

    // First, try to extract JSON badge action metadata (new format)
    const metadataMatch = response.match(/<metadata>([\s\S]*?)<\/metadata>/i)

    if (metadataMatch) {
      const metadataContent = metadataMatch[1].trim()

      // Try to parse as JSON first (new format)
      try {
        const metadata = JSON.parse(metadataContent)
        if (metadata.suggestions && Array.isArray(metadata.suggestions)) {
          console.log('[CondensedChat] Found BadgeAction suggestions with suggestedMessage:', metadata.suggestions)
          // Return BadgeAction objects directly - DO NOT convert to QuickAction
          // This preserves suggestedMessage and all other metadata
          return metadata.suggestions.slice(0, 4) // Limit to 4 in condensed mode
        }
      } catch (e) {
        // Fall through to legacy parsing
      }
    }

    // FALLBACK: extract navigation tags [NAVIGATE_TO_TAB:X:Label]
    const navRegex = /\[NAVIGATE_TO_TAB:(\d+):([^\]]+)\]/g
    let navMatch
    while ((navMatch = navRegex.exec(response)) !== null) {
      const tabNumber = parseInt(navMatch[1], 10)
      const label = navMatch[2].trim()

      // Determine icon based on tab
      let icon = '📍'
      if (tabNumber === 1) icon = '👤'  // Bio tab
      else if (tabNumber === 2) icon = '💼'  // Jobs tab
      else if (tabNumber === 3) icon = '📄'  // Outputs tab
      else if (tabNumber === 4) icon = '🔬'  // Research tab

      suggestions.push({
        label,
        query: label,
        icon,
        navigateTo: tabNumber
      })
    }

    // DEPRECATED: "Next Steps" parsing is disabled to force agents to use JSON metadata
    /*
    const suggestionsMatch = response.match(/## Next Steps?[\s\S]*?(?=\n##|\n```|$)/i)
    if (suggestionsMatch) {
      const suggestionsText = suggestionsMatch[0]
      const bulletRegex = /[-*]\s*\*\*(.+?)\*\*[:\s]*(.+?)(?=\n[-*]|\n\n|$)/g
      let match

      while ((match = bulletRegex.exec(suggestionsText)) !== null) {
        const label = match[1].trim()
        const description = match[2].trim()

        let icon = '💡'
        if (label.toLowerCase().includes('resume')) icon = '📄'
        else if (label.toLowerCase().includes('job') || label.toLowerCase().includes('analyze')) icon = '🔍'
        else if (label.toLowerCase().includes('tailor')) icon = '✨'
        else if (label.toLowerCase().includes('learn') || label.toLowerCase().includes('skill')) icon = '📚'
        else if (label.toLowerCase().includes('cover')) icon = '✍️'
        else if (label.toLowerCase().includes('interview')) icon = '💼'
        else if (label.toLowerCase().includes('bio') || label.toLowerCase().includes('profile')) icon = '👤'

        suggestions.push({ label, query: description, icon })
      }
    }
    */

    return suggestions.slice(0, 4) // Limit to 4 in condensed mode
  }

  const handleQuickAction = useCallback((action: QuickAction) => {
    console.log('[CondensedChat] handleQuickAction called:', {
      label: action.label,
      query: action.query,
      navigateTo: action.navigateTo,
      icon: action.icon
    })

    // If this is a navigation action, navigate directly
    if (action.navigateTo !== undefined) {
      console.log('[CondensedChat] Navigation action detected, calling setCurrentTab with:', action.navigateTo)
      dispatch(setCurrentTabAction(action.navigateTo))
      return
    }

    // Otherwise, it's a chat query action
    console.log('[CondensedChat] Regular action, setting input and sending')
    dispatch(setDraftInputAction(action.query))
    setTimeout(() => handleSend(action.query), 200)
  }, [dispatch, handleSend])

  // New action handler using the action dispatcher
  const handleActionExecute = useCallback(async (actions: Action[], badgeAction: import('../models/badge-action').BadgeAction) => {
    console.log('[CondensedChat] handleActionExecute called with actions:', actions)
    console.log('[CondensedChat] badgeAction with suggested message:', badgeAction.suggestedMessage)

    // Check if we're navigating with a chat action - expand if so
    const hasNavigate = actions.some(a => a.type === 'navigate')
    const hasChat = actions.some(a => a.type === 'chat')

    if (hasNavigate && hasChat && !isExpanded) {
      console.log('[CondensedChat] Will expand chat for navigate + chat action combo')
    }

    await executeActions(actions, {
      dispatch,
      onSendMessage: async (message: string) => {
        await handleSend(message)
      },
      // TODO: Implement file upload handler
      onFileUpload: async (accept?: string, multiple?: boolean) => {
        console.warn('[CondensedChat] File upload not yet implemented', { accept, multiple })
        // Future: Trigger file input dialog and upload to appropriate location
      },
    })

    // Handle suggested message after actions complete
    if (badgeAction.suggestedMessage) {
      const { role, content, compactContent } = badgeAction.suggestedMessage
      const hasNavigate = actions.some(a => a.type === 'navigate')

      console.log('[CondensedChat] Processing suggested message:', {
        role,
        hasNavigate,
        isExpanded,
        hasCompactContent: !!compactContent
      })

      // Track if we're expanding the chat
      let willBeExpanded = isExpanded

      // If we have a navigate + assistant message combo, expand the chat
      if (hasNavigate && role === 'assistant' && !isExpanded) {
        console.log('[CondensedChat] Expanding chat for navigate + assistant message')
        dispatch(setIsExpandedAction(true))
        willBeExpanded = true
        // Wait for expansion animation
        await new Promise(resolve => setTimeout(resolve, 200))
      } else {
        // Wait for actions to complete
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Use compact content if available and chat is in compact mode
      // Use full content if we expanded or chat was already expanded
      const messageToUse = (!willBeExpanded && compactContent) ? compactContent : content

      console.log('[CondensedChat] Sending message:', {
        role,
        willBeExpanded,
        usingCompact: !willBeExpanded && !!compactContent,
        messageLength: messageToUse.length
      })

      if (role === 'user') {
        // Pre-populate input for user to review and send
        dispatch(setDraftInputAction(messageToUse))
        if (willBeExpanded) {
          // Focus after a brief delay to ensure textarea is mounted
          setTimeout(() => textAreaRef.current?.focus(), 100)
        }
      } else if (role === 'assistant') {
        // Auto-send as assistant message (simulated agent prompt)
        await handleSend(messageToUse)
      }
    }
  }, [dispatch, handleSend, isExpanded])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInputFocus = useCallback(() => {
    // When collapsed, focusing the input expands the chat
    if (!isExpanded) {
      console.log('[CondensedChat] Input focused while collapsed - expanding chat')
      dispatch(setIsExpandedAction(true))
    }
  }, [isExpanded, dispatch])

  return (
    <div className={`condensed-chat ${isExpanded ? 'expanded' : ''}`}>
      <div
        className="condensed-header"
        onClick={() => {
          if (!isExpanded) {
            console.log('[CondensedChat] Header clicked - expanding chat')
            dispatch(setIsExpandedAction(true))
          }
        }}
        style={{ cursor: isExpanded ? 'default' : 'pointer' }}
      >
        <div className="header-left">
          <ChatBot size={20} />
          <span className="header-title">
            AI Assistant{chatSummary ? ` - ${chatSummary}` : ''}
          </span>
          {!isExpanded && unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        {isExpanded && (
          <IconButton
            label="Minimize chat"
            onClick={(e) => {
              e.stopPropagation()
              console.log('[CondensedChat] Minimize button clicked')
              dispatch(setIsExpandedAction(false))
            }}
            size="sm"
            kind="ghost"
          >
            <Minimize size={16} />
          </IconButton>
        )}
      </div>

      {/* Show thinking indicator when collapsed and loading */}
      {!isExpanded && isLoading && (
        <div className="thinking-indicator">
          <InlineLoading description="Thinking..." />
        </div>
      )}

      {isExpanded && (
        <div className="chat-messages-container" ref={messagesContainerRef}>
          {messages.map((msg, idx) => (
            <Tile
              key={idx}
              className={`message-tile ${msg.role}`}
            >
              <div className="message-header">
                <strong>{msg.role === 'user' ? '👤 You' : '🤖 Assistant'}</strong>
              </div>
              <div className="message-content">
                {msg.role === 'user' ? (
                  <div className="user-message">{msg.content}</div>
                ) : (
                  <MarkdownMessage
                    content={msg.content}
                    suggestions={msg.suggestions}
                    onActionClick={(action) => {
                      handleQuickAction(action)
                    }}
                    onActionExecute={handleActionExecute}
                    compact={true}
                  />
                )}
              </div>
            </Tile>
          ))}

          {streamingContent && (
            <Tile className="message-tile assistant streaming">
              <div className="message-header">
                <strong>🤖 Assistant</strong>
                <span className="streaming-indicator">Typing...</span>
              </div>
              <div className="message-content">
                <MarkdownMessage
                  content={streamingContent}
                  onActionClick={(action) => {
                    handleQuickAction(action)
                  }}
                  onActionExecute={handleActionExecute}
                  compact={true}
                />
              </div>
            </Tile>
          )}

          {isLoading && !streamingContent && (
            <Tile className="message-tile assistant">
              <InlineLoading description="Thinking..." />
            </Tile>
          )}
        </div>
      )}

      <div className="condensed-input-wrapper">
        {isExpanded ? (
          <TextArea
            ref={textAreaRef}
            labelText="Message"
            placeholder="Ask me anything..."
            value={draftInput}
            onChange={(e) => dispatch(setDraftInputAction(e.target.value))}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            disabled={!isInitialized}
            rows={3}
            className="condensed-chat-textarea"
          />
        ) : (
          <TextInput
            ref={inputRef}
            id="condensed-input"
            labelText=""
            placeholder="Ask me anything..."
            value={draftInput}
            onChange={(e) => dispatch(setDraftInputAction(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                e.preventDefault()
                handleSend()
              }
            }}
            onFocus={handleInputFocus}
            disabled={!isInitialized}
            size="sm"
          />
        )}
        <Button
          renderIcon={SendAlt}
          onClick={() => handleSend()}
          disabled={!draftInput.trim() || isLoading || !isInitialized}
          size="sm"
          kind="primary"
          hasIconOnly
          iconDescription="Send"
        />
      </div>
    </div>
  )
}

export default CondensedChat
