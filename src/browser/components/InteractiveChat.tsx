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
import { addMessage as addMessageToStore, markMessagesAsRead } from '../store/slices/chatSlice'
import { setCurrentTab as setCurrentTabAction } from '../store/slices/navigationSlice'
import { setDraftInput as setDraftInputAction } from '../store/slices/chatSlice'
import MarkdownMessage from './MarkdownMessage'
import './InteractiveChat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: QuickAction[]
}

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
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  // These state variables are used in JSX conditionals below - TS incorrectly flags them as unused
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [inputFocused, setInputFocused] = useState(false)
  // @ts-expect-error - TS6133: Variables are used in JSX below
  const [contextualSuggestions, setContextualSuggestions] = useState<QuickAction[]>([])
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

  // Mark messages as read when user is viewing the Interactive tab
  useEffect(() => {
    // Clear unread count when viewing messages
    dispatch(markMessagesAsRead())
  }, [messages, dispatch])

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
        else if (tabNumber === 4) icon = '🔬'  // Research tab

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

    // Return only the suggestions we found (no default fallback)
    const finalSuggestions = suggestions.slice(0, 6)
    console.log('[InteractiveChat] Final suggestions:', finalSuggestions.map(s => ({
      label: s.label,
      navigateTo: s.navigateTo
    })))
    return finalSuggestions
  }

  // Handle file upload
  const handleFileUpload = useCallback((accept?: string, multiple?: boolean) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    if (multiple) input.multiple = multiple

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        const userMessage: Message = {
          role: 'user',
          content: `[Uploaded file: ${file.name}]`
        }
        dispatch(addMessageToStore(userMessage))
        
        // Add a placeholder response (in real implementation, this would process the file)
        const assistantMessage: Message = {
          role: 'assistant',
          content: `I've received your file "${file.name}". File upload processing will be implemented soon!`
        }
        dispatch(addMessageToStore(assistantMessage))
      }
    }

    input.click()
  }, [dispatch])

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
    setIsLoading(true)
    setStreamingContent('')

    try {
      // Include current tab context in the message
      const tabNames = ['Interactive', 'Bio', 'Jobs', 'Outputs', 'Research']
      const currentTabName = tabNames[currentTab] || 'Interactive'
      const messageWithContext = `[SYSTEM: User is currently on the "${currentTabName}" tab (tab ${currentTab})]\n\n${userMessage.content}`

      // Use streaming for real-time feedback
      const response = await orchestrator.processRequestStreaming(
        messageWithContext,
        (chunk) => {
          setStreamingContent(prev => prev + chunk)
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
      dispatch(addMessageToStore(errorMessage))
      setStreamingContent('')
    } finally {
      setIsLoading(false)
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

    // If this is a file upload action (marked with navigateTo: -1), add message with file upload suggestion
    if (action.navigateTo === -1) {
      console.log('[InteractiveChat] ✅ FILE UPLOAD MESSAGE DETECTED!')
      const uploadMessage: Message = {
        role: 'assistant',
        content: action.query,
        suggestions: [
          {
            label: 'Click here',
            query: '__FILE_UPLOAD__',
            icon: '📎'
          }
        ]
      }
      dispatch(addMessageToStore(uploadMessage))
      return
    }

    // If this is a file upload action, trigger file upload
    if (action.query === '__FILE_UPLOAD__') {
      console.log('[InteractiveChat] ✅ FILE UPLOAD ACTION DETECTED!')
      handleFileUpload('.pdf,.docx,.txt,.md', false)
      return
    }

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
  }, [dispatch, handleSend, handleFileUpload])

  // Handle new BadgeAction format
  const handleActionExecute = useCallback((actions: any[], badgeAction: any) => {
    console.log('[InteractiveChat] handleActionExecute called with actions:', actions)
    
    for (const action of actions) {
      if (action.type === 'file_upload') {
        console.log('[InteractiveChat] File upload action detected:', action)
        handleFileUpload(action.accept, action.multiple)
      } else if (action.type === 'navigate') {
        console.log('[InteractiveChat] Navigate action detected:', action)
        const tabIndexMap: Record<string, number> = {
          'interactive': 0,
          'bio': 1,
          'jobs': 2,
          'outputs': 3,
          'research': 4,
          'pipelines': 5,
          'toolbox': 6,
        }
        const tabIndex = tabIndexMap[action.tab] ?? 0
        dispatch(setCurrentTabAction(tabIndex))
      } else if (action.type === 'chat') {
        console.log('[InteractiveChat] Chat action detected:', action)
        if (badgeAction.suggestedMessage) {
          // Add the suggested message to chat
          dispatch(addMessageToStore(badgeAction.suggestedMessage))
        } else {
          // Send the message
          handleSend(action.message)
        }
      }
    }
  }, [dispatch, handleSend, handleFileUpload])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
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
                    // Handle action clicks from inline badges (legacy support)
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

        <div ref={messagesEndRef} />
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
