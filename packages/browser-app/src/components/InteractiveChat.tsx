import { useState, useRef, useEffect, useCallback } from 'react'
import {
  TextArea,
  Button,
  Tile,
  InlineLoading,
  InlineNotification,
} from '@carbon/react'
import { SendAlt } from '@carbon/icons-react'
import { useAgent } from '../contexts/AgentContext'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  addMessage as addMessageToStore,
  setDraftInput as setDraftInputAction,
  setIsLoading,
  setStreamingContent,
  appendStreamingContent,
  markMessagesAsRead,
  setIsExpanded as setIsExpandedAction,
} from '../store/slices/chatSlice'
import { setCurrentTab as setCurrentTabAction } from '../store/slices/navigationSlice'
import { TabKey } from '../models/navigation'
import { Action } from '../models/badge-action'
import { executeActions } from '../utils/action-dispatcher'
import MarkdownMessage from './MarkdownMessage'
import './InteractiveChat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: import('../models/badge-action').BadgeAction[]
}

// Legacy interface - kept for backward compatibility only
interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

function InteractiveChat() {
  const dispatch = useAppDispatch()
  const { orchestrator, isInitialized } = useAgent()
  const currentTab = useAppSelector(state => state.navigation.currentTab)
  const draftInput = useAppSelector(state => state.chat.draftInput)
  const messages = useAppSelector(state => state.chat.messages)
  const isLoading = useAppSelector(state => state.chat.isLoading)
  const streamingContent = useAppSelector(state => state.chat.streamingContent)
  // These state variables are used in JSX conditionals below - TS incorrectly flags them as unused
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [inputFocused, setInputFocused] = useState(false)
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [contextualSuggestions, setContextualSuggestions] = useState<import('../models/badge-action').BadgeAction[]>([])
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [showContextualSuggestions, setShowContextualSuggestions] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
          console.log('[InteractiveChat] Scrolled to:', container.scrollTop, 'of', container.scrollHeight)
        }
      })
    })
  }, [])

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[InteractiveChat] Messages changed, scrolling. Count:', messages.length)
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  // Auto-scroll when streaming content changes
  useEffect(() => {
    if (streamingContent) {
      scrollToBottom()
    }
  }, [streamingContent, scrollToBottom])

  // Scroll to bottom when returning to Interactive tab
  useEffect(() => {
    if (currentTab === TabKey.INTERACTIVE && messages.length > 0) {
      console.log('[InteractiveChat] Returned to Interactive tab, scrolling to bottom')
      // Add a small delay to ensure tab transition is complete
      setTimeout(() => {
        scrollToBottom(true) // Use smooth scroll for tab switching
      }, 100)
    }
  }, [currentTab, scrollToBottom, messages.length])

  // Extract suggestions from the last assistant message
  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.suggestions) {
        setContextualSuggestions(lastMessage.suggestions)
      }
    }
  }, [messages])

  // Helper to remove metadata from streaming content in real-time
  const cleanStreamingContent = (content: string): string => {
    // Remove complete metadata blocks (new XML format)
    let cleaned = content.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '')

    // Remove incomplete metadata blocks that might be streaming
    // This prevents the flash when <metadata> tag starts appearing
    cleaned = cleaned.replace(/<metadata>[\s\S]*$/gi, '')

    // FALLBACK: Also remove old bracket-style navigation tags
    cleaned = cleaned.replace(/\[NAVIGATE_TO_TAB:\d+:[^\]]+\]/g, '')

    return cleaned.trim()
  }

  const extractSuggestionsFromResponse = (response: string): import('../models/badge-action').BadgeAction[] => {
    const suggestions: import('../models/badge-action').BadgeAction[] = []

    console.log('[InteractiveChat] ========================================')
    console.log('[InteractiveChat] extractSuggestionsFromResponse called')
    console.log('[InteractiveChat] Response length:', response.length)
    console.log('[InteractiveChat] Full response:')
    console.log(response)
    console.log('[InteractiveChat] ========================================')

    // First, try to extract JSON badge action metadata (new format)
    // Format: <metadata>{ "suggestions": [...] }</metadata>
    const metadataMatch = response.match(/<metadata>([\s\S]*?)<\/metadata>/i)
    console.log('[InteractiveChat] Metadata match found:', !!metadataMatch)

    if (metadataMatch) {
      const metadataContent = metadataMatch[1].trim()
      console.log('[InteractiveChat] Metadata content:', metadataContent)

      // Try to parse as JSON first (new format)
      try {
        const metadata = JSON.parse(metadataContent)
        if (metadata.suggestions && Array.isArray(metadata.suggestions)) {
          console.log('[InteractiveChat] Found JSON badge action suggestions:', metadata.suggestions.length)

          // Return BadgeAction objects directly - DO NOT convert to QuickAction
          // This preserves suggestedMessage and all other metadata
          console.log('[InteractiveChat] Returning full BadgeAction objects with suggestedMessage')
          return metadata.suggestions.slice(0, 6)
        }
      } catch (e) {
        console.log('[InteractiveChat] Not valid JSON, trying XML format...')

        // FALLBACK: Try XML format (old format)
        const navRegex = /<navigate\s+tab="(\d+)"\s+label="([^"]+)"\s*\/>/g
        let navMatch

        while ((navMatch = navRegex.exec(metadataContent)) !== null) {
          const tabNumber = parseInt(navMatch[1], 10)
          const label = navMatch[2].trim()

          console.log('[InteractiveChat] Found navigation in XML metadata:', { tabNumber, label })

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
      }
    }

    // FALLBACK: Also support old bracket format for backward compatibility
    // Format: [NAVIGATE_TO_TAB:1:Add your profile]
    const oldNavRegex = /\[NAVIGATE_TO_TAB:(\d+):([^\]]+)\]/g
    let oldNavMatch
    while ((oldNavMatch = oldNavRegex.exec(response)) !== null) {
      const tabNumber = parseInt(oldNavMatch[1], 10)
      const label = oldNavMatch[2].trim()

      // Determine icon based on tab
      let icon = '📍'
      if (tabNumber === 1) icon = '👤'  // Bio tab
      else if (tabNumber === 2) icon = '💼'  // Jobs tab
      else if (tabNumber === 3) icon = '📄'  // Outputs tab

      suggestions.push({
        label,
        query: label,
        icon,
        navigateTo: tabNumber
      })
    }

    // DEPRECATED: "Next Steps" parsing is disabled to force agents to use JSON metadata
    // This encourages agents to output proper structured badge actions
    // If you need to re-enable during migration, uncomment the block below

    /*
    // Then, look for a suggestions section in the response
    const suggestionsMatch = response.match(/## Next Steps?[\s\S]*?(?=\n##|<metadata>|$)/i)
    if (suggestionsMatch) {
      const suggestionsText = suggestionsMatch[0]

      // Extract bullet points that look like suggestions
      const bulletRegex = /[-*]\s*\*\*(.+?)\*\*[:\s]*(.+?)(?=\n[-*]|\n\n|$)/g
      let match

      while ((match = bulletRegex.exec(suggestionsText)) !== null) {
        const label = match[1].trim()
        const description = match[2].trim()

        console.log('[InteractiveChat] Found "Next Steps" item:', { label, description })

        // Check if this label matches any existing navigation suggestion
        const existingNavSuggestion = suggestions.find(s =>
          s.navigateTo !== undefined &&
          (s.label.toLowerCase().includes(label.toLowerCase()) ||
           label.toLowerCase().includes(s.label.toLowerCase()))
        )

        if (existingNavSuggestion) {
          console.log('[InteractiveChat] Matched with navigation suggestion:', existingNavSuggestion.label)
          // Already have a navigation version, skip this one
          continue
        }

        // Determine icon based on keywords
        let icon = '💡'
        if (label.toLowerCase().includes('resume')) icon = '📄'
        else if (label.toLowerCase().includes('job') || label.toLowerCase().includes('analyze')) icon = '🔍'
        else if (label.toLowerCase().includes('tailor')) icon = '✨'
        else if (label.toLowerCase().includes('learn') || label.toLowerCase().includes('skill')) icon = '📚'
        else if (label.toLowerCase().includes('cover')) icon = '✍️'
        else if (label.toLowerCase().includes('interview')) icon = '💼'
        else if (label.toLowerCase().includes('bio') || label.toLowerCase().includes('profile')) icon = '👤'

        suggestions.push({
          label,
          query: description,
          icon
        })
      }
    }
    */

    // Return only the suggestions we found (no default fallback)
    const finalSuggestions = suggestions.slice(0, 6)
    console.log('[InteractiveChat] Final suggestions:', finalSuggestions.map(s => ({
      label: s.label,
      navigateTo: s.navigateTo
    })))
    return finalSuggestions
  }

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || draftInput.trim()
    if (!textToSend || isLoading) return

    if (!isInitialized || !orchestrator) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ **Agent service not initialized**\n\nPlease configure your API key first by clicking the Settings icon in the header.'
      }
      dispatch(addMessageToStore(errorMessage))
      return
    }

    // Hide contextual suggestions during loading
    setShowContextualSuggestions(false)

    const userMessage: Message = {
      role: 'user',
      content: textToSend
    }

    dispatch(addMessageToStore(userMessage))
    // Clear input immediately and synchronously
    dispatch(setDraftInputAction(''))
    dispatch(setIsLoading(true))
    dispatch(setStreamingContent(''))

    try {
      // Include current tab context in the message
      const tabNames: Record<TabKey, string> = {
        [TabKey.INTERACTIVE]: 'Interactive',
        [TabKey.BIO]: 'Bio',
        [TabKey.JOBS]: 'Jobs',
        [TabKey.OUTPUTS]: 'Outputs',
        [TabKey.RESEARCH]: 'Research',
        [TabKey.PIPELINES]: 'Pipelines',
        [TabKey.TOOLBOX]: 'Toolbox',
      }
      const currentTabName = tabNames[currentTab] || 'Interactive'
      const messageWithContext = `[SYSTEM: User is currently on the "${currentTabName}" tab (${currentTab})]\n\n${userMessage.content}`

      // Use streaming for real-time feedback
      const response = await orchestrator.processRequestStreaming(
        messageWithContext,
        (chunk) => {
          dispatch(appendStreamingContent(chunk))
        }
      )

      // Extract suggestions from the response
      const suggestions = extractSuggestionsFromResponse(response)
      console.log('[InteractiveChat] Extracted suggestions from response:', suggestions)

      // Remove metadata block from displayed content (new XML format)
      let cleanedContent = response.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '')

      // FALLBACK: Also remove old bracket-style navigation tags
      cleanedContent = cleanedContent.replace(/\[NAVIGATE_TO_TAB:\d+:[^\]]+\]/g, '').trim()

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanedContent,
        suggestions
      }
      dispatch(addMessageToStore(assistantMessage))
      dispatch(setStreamingContent(''))
      setContextualSuggestions(suggestions)

      // Mark messages as read since user is on Interactive tab (full chat visible)
      // This prevents unread notifications when navigating to other tabs
      dispatch(markMessagesAsRead())

      // Delay showing suggestions until response is complete
      setTimeout(() => {
        setShowContextualSuggestions(true)
      }, 300)
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `## ❌ Error\n\n${error instanceof Error ? error.message : 'An unknown error occurred'}\n\n**Troubleshooting:**\n- Check your API key configuration\n- Ensure you have API credits available\n- Try again in a moment`
      }
      dispatch(addMessageToStore(errorMessage))
      dispatch(setStreamingContent(''))
    } finally {
      dispatch(setIsLoading(false))
    }
  }, [currentTab, draftInput, isLoading, isInitialized, orchestrator, dispatch])

  const handleQuickAction = useCallback((action: QuickAction) => {
    console.log('[InteractiveChat] ========================================')
    console.log('[InteractiveChat] handleQuickAction called')
    console.log('[InteractiveChat] Action details:', JSON.stringify(action, null, 2))
    console.log('[InteractiveChat] navigateTo value:', action.navigateTo)
    console.log('[InteractiveChat] navigateTo type:', typeof action.navigateTo)
    console.log('[InteractiveChat] navigateTo is undefined?', action.navigateTo === undefined)
    console.log('[InteractiveChat] ========================================')

    // If this is a navigation action, navigate immediately
    if (action.navigateTo !== undefined) {
      console.log('[InteractiveChat] ✅ NAVIGATION ACTION DETECTED!')
      console.log('[InteractiveChat] Target tab:', action.navigateTo)
      console.log('[InteractiveChat] About to call setCurrentTab...')

      // Navigate immediately - don't wait for message to send
      dispatch(setCurrentTabAction(action.navigateTo))
      
      console.log('[InteractiveChat] ✅ setCurrentTab called successfully')
      return
    }

    console.log('[InteractiveChat] ❌ Not a navigation action - processing as query')

    // Otherwise, it's a chat query action
    dispatch(setDraftInputAction(action.query))
    // Focus the input to show the auto-populated text
    inputRef.current?.focus()
    // Animate the send button click after a brief delay
    setTimeout(() => {
      handleSend(action.query)
    }, 300)
  }, [dispatch, handleSend])

  // New action handler using the action dispatcher
  const handleActionExecute = useCallback(async (actions: Action[], badgeAction: import('../models/badge-action').BadgeAction) => {
    console.log('[InteractiveChat] handleActionExecute called with actions:', actions)
    console.log('[InteractiveChat] badgeAction with suggested message:', badgeAction.suggestedMessage)

    // Check if we're navigating away from Interactive tab with a chat action
    const navAction = actions.find(a => a.type === 'navigate')
    const chatAction = actions.find(a => a.type === 'chat')

    if (navAction && chatAction) {
      console.log('[InteractiveChat] Navigate + chat action combo - will expand chat on target tab')
    }

    await executeActions(actions, {
      dispatch,
      onSendMessage: async (message: string) => {
        await handleSend(message)
      },
      // TODO: Implement file upload handler
      onFileUpload: async (accept?: string, multiple?: boolean) => {
        console.warn('[InteractiveChat] File upload not yet implemented', { accept, multiple })
      },
    })

    // Handle suggested message after actions complete
    if (badgeAction.suggestedMessage) {
      const { role, content } = badgeAction.suggestedMessage
      const hasNavigate = actions.some(a => a.type === 'navigate')
      console.log('[InteractiveChat] Processing suggested message:', { role, content, hasNavigate })

      // If we navigated to another tab, we need to ensure chat is expanded
      // before sending the message (since we'll be showing CondensedChat)
      if (hasNavigate) {
        console.log('[InteractiveChat] Navigated to another tab - will expand CondensedChat and send message')
        // Wait for tab transition
        await new Promise(resolve => setTimeout(resolve, 200))

        // Expand the CondensedChat
        if (role === 'assistant') {
          console.log('[InteractiveChat] Expanding CondensedChat before sending assistant message')
          dispatch(setIsExpandedAction(true))
          // Wait for expansion animation
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } else {
        // Shorter delay for same-tab actions
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      if (role === 'user') {
        // Pre-populate input for user to review and send
        dispatch(setDraftInputAction(content))
        if (!hasNavigate) {
          inputRef.current?.focus()
        }
      } else if (role === 'assistant') {
        // Auto-send as assistant message (simulated agent prompt)
        await handleSend(content)
      }
    }
  }, [dispatch, handleSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="interactive-chat">
      {!isInitialized && (
        <InlineNotification
          kind="warning"
          title="API Key Required"
          subtitle="Please configure your Anthropic API key using the Settings icon in the header."
          lowContrast
          hideCloseButton
          style={{ marginBottom: '1rem' }}
        />
      )}

      <div className="chat-messages" ref={messagesContainerRef}>
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
                    // Handle action clicks from inline badges (legacy)
                    handleQuickAction(action)
                  }}
                  onActionExecute={handleActionExecute}
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
                content={cleanStreamingContent(streamingContent)}
                onActionClick={(action) => {
                  handleQuickAction(action)
                }}
                onActionExecute={handleActionExecute}
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

      <div className="chat-input-container">
        <div className="input-wrapper">
          <div className="textarea-container">
            <TextArea
              ref={inputRef}
              labelText="Message"
              placeholder="Ask about resume generation, job analysis, learning paths..."
              value={draftInput}
              onChange={(e) => dispatch(setDraftInputAction(e.target.value))}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              rows={3}
              disabled={!isInitialized}
            />
          </div>
          <Button
            renderIcon={SendAlt}
            onClick={() => handleSend()}
            disabled={!draftInput.trim() || isLoading || !isInitialized}
            className="send-button"
          >
            Send
          </Button>
        </div>

        {/* Contextual suggestions removed - now shown inline in Next Steps */}
      </div>
    </div>
  )
}

export default InteractiveChat
