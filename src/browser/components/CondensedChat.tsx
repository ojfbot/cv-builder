import { useState, useRef, useEffect, useCallback } from 'react'
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

interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

function CondensedChat() {
  const { messages, addMessage, setCurrentTab, draftInput, setDraftInput, chatSummary } = useChat()
  const { orchestrator, isInitialized } = useAgent()
  
  // Debug: log draftInput and chatSummary changes
  useEffect(() => {
    console.log('[CondensedChat] draftInput changed to:', draftInput)
  }, [draftInput])
  
  useEffect(() => {
    console.log('[CondensedChat] chatSummary changed to:', chatSummary)
  }, [chatSummary])
  
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [contextualSuggestions, setContextualSuggestions] = useState<QuickAction[]>([])
  const [isExpanded, setIsExpandedLocal] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Debug: log when expansion state changes
  useEffect(() => {
    console.log('[CondensedChat] isExpanded changed to:', isExpanded)
  }, [isExpanded])

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom()
    }
  }, [messages, streamingContent, isExpanded])

  // Extract suggestions from last message
  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.suggestions) {
        setContextualSuggestions(lastMessage.suggestions)
      }
    }
  }, [messages])

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || draftInput.trim()
    if (!textToSend || isLoading || !orchestrator || !isInitialized) return

    const userMessage = {
      role: 'user' as const,
      content: textToSend
    }

    addMessage(userMessage)
    // Clear input immediately and synchronously
    setDraftInput('')
    setIsLoading(true)
    setShowSuggestions(false)
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
      const suggestions = extractSuggestionsFromResponse(fullResponse)

      // Remove metadata block from displayed content
      let cleanedContent = fullResponse.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '')
      cleanedContent = cleanedContent.replace(/\[NAVIGATE_TO_TAB:\d+:[^\]]+\]/g, '').trim()

      addMessage({
        role: 'assistant',
        content: cleanedContent,
        suggestions
      })

      setContextualSuggestions(suggestions)
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
  }, [draftInput, isLoading, orchestrator, isInitialized, addMessage, setDraftInput, isExpanded])

  const extractSuggestionsFromResponse = (response: string): QuickAction[] => {
    const suggestions: QuickAction[] = []

    // First, extract navigation tags [NAVIGATE_TO_TAB:X:Label]
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
      setCurrentTab(action.navigateTo)
      return
    }

    // Otherwise, it's a chat query action
    console.log('[CondensedChat] Regular action, setting input and sending')
    setDraftInput(action.query)
    setTimeout(() => handleSend(action.query), 200)
  }, [setCurrentTab, setDraftInput, handleSend])

  const lastMessage = messages[messages.length - 1]
  const isAssistantThinking = isLoading && lastMessage?.role === 'user'

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleInputFocus = useCallback(() => {
    // When collapsed, focusing the input expands the chat
    if (!isExpanded) {
      console.log('[CondensedChat] Input focused while collapsed - expanding chat')
      setIsExpandedLocal(true)
    }
    setShowSuggestions(true)
  }, [isExpanded])

  const handleInputBlur = useCallback(() => {
    // Blur should not affect expansion state, only hide suggestions
    setTimeout(() => setShowSuggestions(false), 200)
  }, [])

  return (
    <div className={`condensed-chat ${isExpanded ? 'expanded' : ''}`}>
      <div className="condensed-header">
        <div className="header-left">
          <ChatBot size={20} />
          <span className="header-title">
            AI Assistant{chatSummary ? ` - ${chatSummary}` : ''}
          </span>
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
                    suggestions={msg.suggestions}
                    onActionClick={(action) => {
                      handleQuickAction(action)
                    }}
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
            value={draftInput}
            onChange={(e) => setDraftInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={!isInitialized || isLoading}
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
            onChange={(e) => setDraftInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSend()
              }
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={!isInitialized || isLoading}
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

      {showSuggestions && contextualSuggestions.length > 0 && !isLoading && (
        <div className="condensed-suggestions">
          {contextualSuggestions.map((action, idx) => (
            <Tag
              key={idx}
              type="purple"
              size="sm"
              className="condensed-suggestion-tag"
              onClick={() => handleQuickAction(action)}
              title={action.query}
            >
              <span className="action-icon">{action.icon}</span>
              {action.label}
            </Tag>
          ))}
        </div>
      )}
    </div>
  )
}

export default CondensedChat
