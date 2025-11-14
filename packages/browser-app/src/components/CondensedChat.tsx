import { useState, useRef, useEffect } from 'react'
import {
  TextInput,
  TextArea,
  Button,
  IconButton,
  Tag,
  InlineLoading,
  Tile,
} from '@carbon/react'
import { SendAlt, Minimize, ChatBot } from '@carbon/icons-react'
import { useChat } from '../contexts/ChatContext'
import { useAgent } from '../contexts/AgentContext'
import MarkdownMessage from './MarkdownMessage'
import './CondensedChat.css'

interface NavigateAction {
  tab: number
  focus?: string
  context?: string
}

interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number  // DEPRECATED: Use navigate instead
  navigate?: NavigateAction
}

function CondensedChat() {
  const { messages, addMessage, setCurrentTab, currentTab, draftInput, setDraftInput, isLoading, setIsLoading, streamingContent, setStreamingContent, generateChatSummary } = useChat()
  const { orchestrator, isInitialized } = useAgent()
  // Use shared draftInput from context instead of local state
  const input = draftInput
  const setInput = setDraftInput

  console.log('[CondensedChat] Render - draftInput:', draftInput, 'input:', input)
  const [isExpanded, setIsExpandedLocal] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef(messages.length)

  // Generate chat summary for header
  const chatSummary = messages.length > 1 ? generateChatSummary() : ''

  // Debug: log when expansion state changes
  useEffect(() => {
    console.log('[CondensedChat] isExpanded changed to:', isExpanded)
    // Clear unread indicator when expanded
    if (isExpanded) {
      setHasUnread(false)
    }
  }, [isExpanded])

  // Detect new assistant messages when collapsed
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    const hasNewMessage = messages.length > prevMessagesLengthRef.current

    // Show unread indicator if:
    // 1. We're in collapsed state
    // 2. A new message was added
    // 3. The new message is from the assistant
    // 4. We're not currently loading (thinking is complete)
    if (!isExpanded && hasNewMessage && lastMessage?.role === 'assistant' && !isLoading) {
      console.log('[CondensedChat] New assistant message received while collapsed - showing unread indicator')
      setHasUnread(true)
    }

    prevMessagesLengthRef.current = messages.length
  }, [messages, isExpanded, isLoading])

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom()
    }
  }, [messages, streamingContent, isExpanded])

  // Scroll to bottom when navigating to a non-Interactive tab (making CondensedChat visible)
  useEffect(() => {
    if (currentTab !== 0 && isExpanded) {
      // Use setTimeout to ensure the component has fully rendered
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [currentTab, isExpanded])


  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isLoading || !orchestrator || !isInitialized) return

    console.log('[CondensedChat] handleSend called with input:', input)
    console.log('[CondensedChat] About to clear input')

    const userMessage = {
      role: 'user' as const,
      content: textToSend
    }

    addMessage(userMessage)
    setInput('')
    console.log('[CondensedChat] setInput(\"\") called, input should now be empty')
    setIsLoading(true)
    setStreamingContent('')

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
            setStreamingContent(fullResponse)
          }
        }
      )

      // Extract suggestions
      // Remove metadata block from displayed content
      let cleanedContent = fullResponse.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '')
      cleanedContent = cleanedContent.replace(/\[NAVIGATE_TO_TAB:\d+:[^\]]+\]/g, '').trim()

      addMessage({
        role: 'assistant',
        content: cleanedContent
      })

      setStreamingContent('')
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `## ❌ Error\n\n${error instanceof Error ? error.message : 'An unknown error occurred'}`
      })
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }


  const lastMessage = messages[messages.length - 1]
  const isAssistantThinking = isLoading && lastMessage?.role === 'user'

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    console.log('[CondensedChat] handleQuickAction called:', action)

    // Check for new navigate object first, then fall back to legacy navigateTo
    const navigationTarget = action.navigate || (action.navigateTo !== undefined ? { tab: action.navigateTo } : null)

    if (navigationTarget) {
      console.log('[CondensedChat] Navigation action detected:', navigationTarget)
      console.log('[CondensedChat] Current tab:', currentTab, 'Target tab:', navigationTarget.tab)

      // Only navigate if we're not already on the target tab
      const shouldNavigate = currentTab !== navigationTarget.tab

      if (shouldNavigate) {
        console.log('[CondensedChat] Not on target tab - will navigate')
        setCurrentTab(navigationTarget.tab)

        // TODO: Handle focus field if navigationTarget.focus is provided
        if (navigationTarget.focus) {
          console.log('[CondensedChat] Focus requested for:', navigationTarget.focus)
          // This can be implemented later with a focus handler in the target tab
        }

        // TODO: Handle context message if navigationTarget.context is provided
        if (navigationTarget.context) {
          console.log('[CondensedChat] Context message:', navigationTarget.context)
          // Could send this message before or after navigation
        }
      } else {
        console.log('[CondensedChat] Already on target tab - just sending query as regular action')
        // Already on the target tab, just send the query
        handleSend(action.query)
      }

      return
    }

    // Otherwise, it's a chat query action - send the query
    console.log('[CondensedChat] Regular query action, sending:', action.query)
    handleSend(action.query)
  }

  const handleExpandContent = () => {
    console.log('[CondensedChat] Expanding content - navigating to Interactive tab')
    setCurrentTab(0)  // Navigate to Interactive tab (tab 0)
  }

  const handleInputFocus = () => {
    // When collapsed, focusing the input expands the chat
    if (!isExpanded) {
      console.log('[CondensedChat] Input focused while collapsed - expanding chat')
      setIsExpandedLocal(true)
    }
  }

  const handleInputBlur = () => {
    // Intentionally empty - kept for future use
  }

  return (
    <div className={`condensed-chat ${isExpanded ? 'expanded' : ''}`}>
      <div className="condensed-header">
        <div className="header-left">
          <ChatBot size={20} />
          <span className="header-title">
            AI Assistant{chatSummary ? ` - ${chatSummary}` : ''}
          </span>
          {!isExpanded && hasUnread && (
            <Tag type="red" size="sm" className="unread-badge">
              New
            </Tag>
          )}
        </div>
        {isExpanded && (
          <IconButton
            label="Minimize chat"
            onClick={() => {
              console.log('[CondensedChat] Minimize button clicked')
              setIsExpandedLocal(false)
            }}
            size="sm"
            kind="ghost"
          >
            <Minimize size={16} />
          </IconButton>
        )}
      </div>

      {isExpanded && (
        <div className="chat-messages-container">
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
                    onActionClick={handleQuickAction}
                    compact={true}
                    onExpandContent={handleExpandContent}
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
                  onActionClick={handleQuickAction}
                  compact={true}
                  onExpandContent={handleExpandContent}
                />
              </div>
            </Tile>
          )}

          {isLoading && !streamingContent && (
            <Tile className="message-tile assistant">
              <InlineLoading description="Thinking..." />
            </Tile>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {!isExpanded && isAssistantThinking && (
        <div className="thinking-indicator">
          <InlineLoading description="Thinking..." status="active" />
        </div>
      )}

      <div className="condensed-input-wrapper">
        {isExpanded ? (
          <TextArea
            ref={textAreaRef}
            labelText="Message"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSend()
              }
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={!isInitialized}
            size="sm"
          />
        )}
        <Button
          renderIcon={SendAlt}
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading || !isInitialized}
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
