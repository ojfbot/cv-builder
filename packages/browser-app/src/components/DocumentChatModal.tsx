import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal, Button, TextArea, Loading, InlineNotification } from '@carbon/react'
import { Send } from '@carbon/icons-react'
import { bioFilesApi } from '../api/bioFilesApi'
import type { DocumentSummary, ChatMessage } from '@resume-builder/agent-core'
import { setDisplayState, ChatDisplayState } from '../store/slices/chatSlice'
import type { RootState } from '../store'

// Streaming performance constants
const STREAM_DEBOUNCE_MS = 50 // Debounce state updates to prevent memory leaks (update UI every 50ms)

interface DocumentChatModalProps {
  fileId: string
  fileName: string
  onClose: () => void
}

export function DocumentChatModal({ fileId, fileName, onClose }: DocumentChatModalProps) {
  const dispatch = useDispatch()
  const currentDisplayState = useSelector((state: RootState) => state.chat.displayState)
  const sidebarExpanded = useSelector((state: RootState) => state.v2.sidebarExpanded) // Right sidebar (thread list)
  const appSwitcherExpanded = useSelector((state: RootState) => state.v2.appSwitcherExpanded) // Left sidebar (app switcher)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousChatStateRef = useRef<ChatDisplayState>(currentDisplayState)

  // Minimize chat when modal opens, restore when it closes
  useEffect(() => {
    // Save current state to ref (captured at mount)
    previousChatStateRef.current = currentDisplayState
    // Minimize chat to maximize vertical space for chat modal
    dispatch(setDisplayState('minimized'))

    // Restore previous state when modal closes
    return () => {
      dispatch(setDisplayState(previousChatStateRef.current))
    }
  }, []) // Only run on mount/unmount

  // Update ref when chat state changes (in case user manually changes it while modal is open)
  useEffect(() => {
    // Only update ref if chat state is not minimized (i.e., user manually changed it)
    if (currentDisplayState !== 'minimized') {
      previousChatStateRef.current = currentDisplayState
    }
  }, [currentDisplayState])

  // Adjust modal size and position based on both sidebars
  useEffect(() => {
    const modalContainer = document.querySelector('.cds--modal-container') as HTMLElement
    if (modalContainer) {
      // Calculate margins and width based on which sidebars are expanded
      const leftMargin = appSwitcherExpanded ? 256 : 0 // App switcher width
      const rightMargin = sidebarExpanded ? 320 : 0 // Thread sidebar width
      const baseMargin = 144 // Default margins (72px left + 72px right)

      const totalHorizontalSpace = baseMargin + leftMargin + rightMargin
      const maxWidth = `calc(100vw - ${totalHorizontalSpace}px)`

      // Apply styles
      if (sidebarExpanded) {
        modalContainer.classList.add('with-right-sidebar')
      } else {
        modalContainer.classList.remove('with-right-sidebar')
      }

      modalContainer.style.maxWidth = maxWidth
      modalContainer.style.width = sidebarExpanded ? maxWidth : ''
      modalContainer.style.marginLeft = appSwitcherExpanded ? `${leftMargin}px` : ''
    }

    // Cleanup on unmount
    return () => {
      const modalContainer = document.querySelector('.cds--modal-container') as HTMLElement
      if (modalContainer) {
        modalContainer.classList.remove('with-right-sidebar')
        modalContainer.style.maxWidth = ''
        modalContainer.style.width = ''
        modalContainer.style.marginLeft = ''
      }
    }
  }, [sidebarExpanded, appSwitcherExpanded])

  useEffect(() => {
    loadDocumentContext()
  }, [fileId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadDocumentContext = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get or generate summary
      const summaryData = await bioFilesApi.getSummary(fileId)

      // Initialize with AI introduction
      const introMessage: ChatMessage = {
        role: 'assistant',
        content: generateIntroMessage(summaryData.summary),
        timestamp: new Date().toISOString(),
      }

      setMessages([introMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document context')
      console.error('Failed to load document context:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateIntroMessage = (summary: DocumentSummary): string => {
    return `I've analyzed "${fileName}". Here's what I found:

**Summary**: ${summary.summary}

**Key Points**:
${summary.keyPoints.map(p => `- ${p}`).join('\n')}

**Document Type**: ${summary.documentType.replace('_', ' ').toUpperCase()}

**Suggested Use**: ${summary.suggestedUse}

---

I can help you:
- Answer questions about this document
- Add annotations and highlights
- Extract specific information
- Suggest how to use this in your CV

What would you like to know?`
  }

  const handleSend = async () => {
    if (!input.trim() || streaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setStreaming(true)

    try {
      // Create placeholder for assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Stream response from backend
      const stream = bioFilesApi.chatStream(fileId, input, messages)

      // Debounce state updates to prevent memory leaks from rapid re-renders
      let updateTimer: NodeJS.Timeout | null = null

      for await (const chunk of stream) {
        assistantMessage.content += chunk

        // Cancel previous scheduled update
        if (updateTimer) {
          clearTimeout(updateTimer)
        }

        // Schedule new update
        updateTimer = setTimeout(() => {
          setMessages(prev => [
            ...prev.slice(0, -1),
            { ...assistantMessage }
          ])
          updateTimer = null
        }, STREAM_DEBOUNCE_MS)
      }

      // Final update after stream completes
      if (updateTimer) {
        clearTimeout(updateTimer)
      }
      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...assistantMessage }
      ])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [
        ...prev.slice(0, -1), // Remove the empty assistant message
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        }
      ])
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Modal
      data-element="document-chat-modal"
      open
      modalHeading={`Chat: ${fileName}`}
      onRequestClose={onClose}
      size="lg"
      passiveModal
    >
      <div style={{
        height: 'calc(100vh - 330px)', // Fit within: margins(140) + modal-header(60) + input(80) + padding(50)
        minHeight: '400px',
        maxHeight: '650px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loading description="Loading document context..." withOverlay={false} />
          </div>
        ) : error ? (
          <InlineNotification
            kind="error"
            title="Error loading document"
            subtitle={error}
            lowContrast
          />
        ) : (
          <>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                background: 'var(--cds-layer-01)',
                borderRadius: '4px',
                marginBottom: '1rem',
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: msg.role === 'user' ? 'var(--cds-layer-02)' : 'transparent',
                    borderLeft: msg.role === 'assistant' ? '3px solid var(--cds-border-interactive)' : 'none',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      marginBottom: '0.5rem',
                      color: msg.role === 'user' ? 'var(--cds-text-primary)' : 'var(--cds-link-primary)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </div>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                    }}
                  >
                    {msg.content}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--cds-text-secondary)',
                      marginTop: '0.5rem',
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {streaming && (
                <div style={{ padding: '0.75rem', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                  <Loading description="" small withOverlay={false} />
                  <span style={{ marginLeft: '0.5rem' }}>AI is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: '1rem',
                background: 'var(--cds-layer-02)',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <TextArea
                  data-element="document-chat-input"
                  labelText=""
                  placeholder="Ask about this document..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                  rows={2}
                  style={{ flex: 1 }}
                />
                <Button
                  data-element="document-chat-send"
                  renderIcon={Send}
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  style={{ minWidth: '100px' }}
                >
                  {streaming ? 'Sending...' : 'Send'}
                </Button>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--cds-text-secondary)',
                  marginTop: '0.5rem',
                }}
              >
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
