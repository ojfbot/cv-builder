import { useState, useRef, useEffect } from 'react'
import {
  TextArea,
  Button,
  Tile,
  InlineLoading,
  InlineNotification,
  Tag,
} from '@carbon/react'
import { SendAlt } from '@carbon/icons-react'
import { useAgent } from '../contexts/AgentContext'
import { useChat } from '../contexts/ChatContext'
import MarkdownMessage from './MarkdownMessage'
import './InteractiveChat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: QuickAction[]
}

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

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Generate Resume',
    query: 'Generate my professional resume in markdown format',
    icon: '📄'
  },
  {
    label: 'Analyze Job',
    query: 'Help me analyze a job listing and see how well I match',
    icon: '🔍'
  },
  {
    label: 'Tailor Resume',
    query: 'Tailor my resume for a specific job posting',
    icon: '✨'
  },
  {
    label: 'Learning Path',
    query: 'Create a personalized learning path to help me close my skills gaps',
    icon: '📚'
  },
  {
    label: 'Cover Letter',
    query: 'Write a compelling cover letter for a job application',
    icon: '✍️'
  },
  {
    label: 'Interview Prep',
    query: 'Help me prepare for an upcoming interview with practice questions',
    icon: '💼'
  }
]

function InteractiveChat() {
  const { orchestrator, isInitialized } = useAgent()
  const { messages, addMessage, setCurrentTab, currentTab, draftInput, setDraftInput, isLoading, setIsLoading, streamingContent, setStreamingContent } = useChat()
  // Use shared draftInput from context instead of local state
  const input = draftInput
  const setInput = setDraftInput

  // These state variables are used in JSX conditionals below - TS incorrectly flags them as unused
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [inputFocused, setInputFocused] = useState(false)
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [contextualSuggestions, setContextualSuggestions] = useState<QuickAction[]>(DEFAULT_QUICK_ACTIONS)
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [showContextualSuggestions, setShowContextualSuggestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  // Scroll to bottom when navigating back to Interactive tab
  useEffect(() => {
    if (currentTab === 0) {
      // Use setTimeout to ensure the component has fully rendered
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [currentTab])

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

  const extractSuggestionsFromResponse = (response: string): QuickAction[] => {
    const suggestions: QuickAction[] = []

    console.log('[InteractiveChat] extractSuggestionsFromResponse called, response length:', response.length)
    console.log('[InteractiveChat] Response preview (last 500 chars):', response.slice(-500))

    // First, try to extract navigation metadata from XML-style tags (preferred format)
    // Format: <metadata><navigate tab="1" label="Add your profile" /></metadata>
    const metadataMatch = response.match(/<metadata>([\s\S]*?)<\/metadata>/i)
    console.log('[InteractiveChat] Metadata match found:', !!metadataMatch)

    if (metadataMatch) {
      const metadataContent = metadataMatch[1]
      console.log('[InteractiveChat] Metadata content:', metadataContent)

      const navRegex = /<navigate\s+tab="(\d+)"\s+label="([^"]+)"\s*\/>/g
      let navMatch

      while ((navMatch = navRegex.exec(metadataContent)) !== null) {
        const tabNumber = parseInt(navMatch[1], 10)
        const label = navMatch[2].trim()

        console.log('[InteractiveChat] Found navigation in metadata:', { tabNumber, label })

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

    // If we found suggestions, return them; otherwise return defaults
    const finalSuggestions = suggestions.length > 0 ? suggestions.slice(0, 6) : DEFAULT_QUICK_ACTIONS
    console.log('[InteractiveChat] Final suggestions:', finalSuggestions.map(s => ({
      label: s.label,
      navigateTo: s.navigateTo
    })))
    return finalSuggestions
  }

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isLoading) return

    if (!isInitialized || !orchestrator) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ **Agent service not initialized**\n\nPlease configure your API key first by clicking the Settings icon in the header.'
      }
      addMessage(errorMessage)
      return
    }

    // Hide contextual suggestions during loading
    setShowContextualSuggestions(false)

    const userMessage: Message = {
      role: 'user',
      content: textToSend
    }

    addMessage(userMessage)
    console.log('[InteractiveChat] About to clear input, current value:', input)
    setInput('')
    console.log('[InteractiveChat] Called setInput(""), new value should be empty')
    setIsLoading(true)
    setStreamingContent('')

    try {
      // Use streaming for real-time feedback
      let fullResponse = ''
      const response = await orchestrator.processRequestStreaming(
        userMessage.content,
        (chunk) => {
          fullResponse += chunk
          setStreamingContent(fullResponse)
        }
      )

      // Extract suggestions from the response
      const suggestions = extractSuggestionsFromResponse(response)
      console.log('[InteractiveChat] ===== SUGGESTIONS EXTRACTED =====')
      console.log('[InteractiveChat] Full response length:', response.length)
      console.log('[InteractiveChat] Response preview:', response.substring(0, 200))
      console.log('[InteractiveChat] Number of suggestions:', suggestions.length)
      console.log('[InteractiveChat] Suggestions detail:', JSON.stringify(suggestions, null, 2))
      console.log('[InteractiveChat] ====================================')

      // Remove metadata block from displayed content (new XML format)
      let cleanedContent = response.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '')

      // FALLBACK: Also remove old bracket-style navigation tags
      cleanedContent = cleanedContent.replace(/\[NAVIGATE_TO_TAB:\d+:[^\]]+\]/g, '').trim()

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanedContent,
        suggestions
      }
      addMessage(assistantMessage)
      setStreamingContent('')
      setContextualSuggestions(suggestions)

      // Delay showing suggestions until response is complete
      setTimeout(() => {
        setShowContextualSuggestions(true)
      }, 300)
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `## ❌ Error\n\n${error instanceof Error ? error.message : 'An unknown error occurred'}\n\n**Troubleshooting:**\n- Check your API key configuration\n- Ensure you have API credits available\n- Try again in a moment`
      }
      addMessage(errorMessage)
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    console.log('[InteractiveChat] ========== handleQuickAction START ==========')
    console.log('[InteractiveChat] Action details:', {
      label: action.label,
      query: action.query,
      navigateTo: action.navigateTo,
      navigate: action.navigate,
      icon: action.icon
    })
    console.log('[InteractiveChat] Current context state:', {
      currentTab,
      setCurrentTab: typeof setCurrentTab
    })

    // Check for new navigate object first, then fall back to legacy navigateTo
    const navigationTarget = action.navigate || (action.navigateTo !== undefined ? { tab: action.navigateTo } : null)
    console.log('[InteractiveChat] navigationTarget computed:', navigationTarget)

    if (navigationTarget) {
      console.log('[InteractiveChat] *** NAVIGATION ACTION DETECTED ***')
      console.log('[InteractiveChat] Current tab:', currentTab, '(type:', typeof currentTab, ')')
      console.log('[InteractiveChat] Target tab:', navigationTarget.tab, '(type:', typeof navigationTarget.tab, ')')

      // Only navigate if we're not already on the target tab
      const shouldNavigate = currentTab !== navigationTarget.tab
      console.log('[InteractiveChat] shouldNavigate:', shouldNavigate, '(', currentTab, '!==', navigationTarget.tab, ')')

      if (shouldNavigate) {
        console.log('[InteractiveChat] ✓ WILL NAVIGATE - calling setCurrentTab(', navigationTarget.tab, ')')

        // Navigate immediately without sending message
        setCurrentTab(navigationTarget.tab)
        console.log('[InteractiveChat] ✓ setCurrentTab called')

        // TODO: Handle focus field if navigationTarget.focus is provided
        if (navigationTarget.focus) {
          console.log('[InteractiveChat] Focus requested for:', navigationTarget.focus)
          // This can be implemented later with a focus handler in the target tab
        }
      } else {
        console.log('[InteractiveChat] ✗ ALREADY ON TARGET TAB - sending query as regular action')
        // Already on the target tab, just send the query as a regular action
        setInput(action.query)
        inputRef.current?.focus()
        setTimeout(() => {
          handleSend(action.query)
        }, 300)
      }
      console.log('[InteractiveChat] ========== handleQuickAction END (navigation) ==========')
      return
    }

    console.log('[InteractiveChat] Regular action (no navigation), processing query')

    // Otherwise, it's a chat query action
    setInput(action.query)
    // Focus the input to show the auto-populated text
    inputRef.current?.focus()
    // Animate the send button click after a brief delay
    setTimeout(() => {
      handleSend(action.query)
    }, 300)
    console.log('[InteractiveChat] ========== handleQuickAction END (regular) ==========')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

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

      <div className="chat-messages">
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
                    // Handle action clicks from inline badges
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
                content={cleanStreamingContent(streamingContent)}
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

      <div className="chat-input-container">
        <div className="input-wrapper">
          <div className="textarea-container">
            <TextArea
              ref={inputRef}
              labelText="Message"
              placeholder="Ask about resume generation, job analysis, learning paths..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              rows={3}
              disabled={!isInitialized}
            />
          </div>
          <Button
            renderIcon={SendAlt}
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || !isInitialized}
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
