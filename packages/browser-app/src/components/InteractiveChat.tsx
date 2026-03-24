import { useState, useRef, useEffect, useCallback } from 'react'
import {
  TextArea,
  Button,
  IconButton,
  Tile,
  InlineLoading,
  InlineNotification,
} from '@carbon/react'
import { SendAlt, Microphone } from '@carbon/icons-react'
import { useAgent } from '../contexts/AgentContext'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  addMessage as addMessageToStore,
  setDraftInput as setDraftInputAction,
  markMessagesAsRead,
  setDisplayState as setDisplayStateAction,
} from '../store/slices/chatSlice'
import { TabKey } from '../models/navigation'
import { createBadgeAction, createNavigateAction } from '../models/badge-action'
import type { BadgeAction } from '@ojfbot/frame-ui-components'
import { executeBadgeAction } from '../utils/action-dispatcher'
import {
  MarkdownMessage,
  cleanStreamingContent,
  extractSuggestionsFromResponse,
} from '@ojfbot/frame-ui-components'
import '@ojfbot/frame-ui-components/styles/markdown-message'
import { bioFilesApi } from '../api/bioFilesApi'
import { navigateToTab } from '../store/slices/navigationSlice'
import { sendChatMessage, isV2Active } from '../services/chat-service'
import { useSlashCommands } from '../hooks/useSlashCommands'
import CommandMenu from './CommandMenu'
import './InteractiveChat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: import('../models/badge-action').BadgeAction[]
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
  const sharedInputRef = useRef<HTMLTextAreaElement>(null)

  // Slash commands setup
  const slashCommands = useSlashCommands({
    input: draftInput,
    onCommandExecuted: (commandString: string) => {
      // Update input with selected command
      dispatch(setDraftInputAction(commandString + ' '))
      // Focus input after selection
      setTimeout(() => sharedInputRef.current?.focus(), 0)
    },
    context: {
      sendMessage: async (_message: string) => {
        // This should never be called now - commands return messages instead
        console.warn('Deprecated sendMessage called from command context')
      },
      clearChat: () => {
        // Clear chat functionality
        // TODO: Implement proper clear chat action
        console.log('Clear chat requested')
      }
    }
  })

  // Share the ref with the slash commands hook
  slashCommands.inputRef.current = sharedInputRef.current

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

  // Scroll to bottom when returning to Interactive tab and mark messages as read
  useEffect(() => {
    if (currentTab === TabKey.INTERACTIVE && messages.length > 0) {
      console.log('[InteractiveChat] Returned to Interactive tab, scrolling to bottom')
      // Mark all messages as read since user is viewing full chat
      dispatch(markMessagesAsRead())
      // Add a small delay to ensure tab transition is complete
      setTimeout(() => {
        scrollToBottom(true) // Use smooth scroll for tab switching
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, dispatch]) // Removed messages.length and scrollToBottom from dependencies

  // Extract suggestions from the last assistant message
  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.suggestions) {
        setContextualSuggestions(lastMessage.suggestions)
      }
    }
  }, [messages])

  // cleanStreamingContent is now imported from @ojfbot/frame-ui-components

  // extractSuggestionsFromResponse is now imported from @ojfbot/frame-ui-components

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || draftInput.trim()
    if (!textToSend || isLoading) return

    // Check if this is a slash command
    if (textToSend.startsWith('/')) {
      const result = await slashCommands.executeCommand(textToSend)

      if (result.error) {
        // Show error message to user
        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ **Command Error:** ${result.error}`
        }
        dispatch(addMessageToStore({ message: errorMessage, markAsRead: true }))
        dispatch(setDraftInputAction(''))
        return
      }

      if (result.success) {
        // Command was executed successfully, clear input
        dispatch(setDraftInputAction(''))

        // If command returned a message, send it as a regular chat message
        if (result.message) {
          // Recursively call handleSend with the message (not a command anymore)
          await handleSend(result.message)
        }
        return
      }
    }

    // Check if V2 is active or V1 is initialized
    const useV2 = isV2Active()
    if (!useV2 && (!isInitialized || !orchestrator)) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ **Agent service not initialized**\n\nPlease configure your API key first by clicking the Settings icon in the header.'
      }
      dispatch(addMessageToStore({ message: errorMessage, markAsRead: true }))
      return
    }

    // Hide contextual suggestions during loading
    setShowContextualSuggestions(false)

    // Clear input immediately and synchronously
    dispatch(setDraftInputAction(''))

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
    const messageWithContext = `[SYSTEM: User is currently on the "${currentTabName}" tab (${currentTab})]\n\n${textToSend}`

    try {
      // Use unified chat service (handles V1 and V2 automatically)
      await sendChatMessage(messageWithContext, {
        onComplete: () => {
          // Extract suggestions from the final streaming content
          const finalContent = streamingContent
          const suggestions = extractSuggestionsFromResponse(finalContent)
          console.log('[InteractiveChat] Extracted suggestions from response:', suggestions)

          setContextualSuggestions(suggestions)

          // Mark messages as read since user is on Interactive tab (full chat visible)
          // This prevents unread notifications when navigating to other tabs
          dispatch(markMessagesAsRead())

          // Delay showing suggestions until response is complete
          setTimeout(() => {
            setShowContextualSuggestions(true)
          }, 300)
        },
        onError: (error) => {
          console.error('[InteractiveChat] Chat error:', error)
        }
      })
    } catch (error) {
      // Error is already handled by chat service, but log it here too
      console.error('[InteractiveChat] Unexpected error:', error)
    }
  }, [currentTab, draftInput, isLoading, isInitialized, orchestrator, dispatch, streamingContent, slashCommands])

  // File upload handler
  const handleFileUpload = useCallback(async (accept?: string, multiple?: boolean) => {
    console.log('[InteractiveChat] File upload triggered', { accept, multiple })

    // Create a file input element
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    if (multiple) input.multiple = multiple

    // Handle file selection
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) {
        console.log('[InteractiveChat] No files selected')
        return
      }

      console.log('[InteractiveChat] Files selected:', files.length)

      // Upload files to Bio Files API
      const fileArray = Array.from(files)

      try {
        // Show uploading message
        const uploadingMessage: Message = {
          role: 'assistant',
          content: `📤 Uploading ${fileArray.length} file${fileArray.length > 1 ? 's' : ''}: ${fileArray.map(f => f.name).join(', ')}...`
        }
        dispatch(addMessageToStore({ message: uploadingMessage, markAsRead: true }))

        // Upload each file
        const uploadResults = await Promise.all(
          fileArray.map(async (file) => {
            try {
              const result = await bioFilesApi.uploadFile(file)
              return { success: true, file, result }
            } catch (error) {
              console.error('[InteractiveChat] Error uploading file:', file.name, error)
              return { success: false, file, error }
            }
          })
        )

        // Count successes and failures
        const successful = uploadResults.filter(r => r.success)
        const failed = uploadResults.filter(r => !r.success)

        // Show result message
        let resultContent = ''
        if (successful.length > 0) {
          resultContent += `✅ **Successfully uploaded ${successful.length} file${successful.length > 1 ? 's' : ''}:**\n`
          successful.forEach(r => {
            if (r.success && r.result) {
              resultContent += `- ${r.file.name} (${r.result.sizeFormatted})\n`
            }
          })
        }

        if (failed.length > 0) {
          resultContent += `\n❌ **Failed to upload ${failed.length} file${failed.length > 1 ? 's' : ''}:**\n`
          failed.forEach(r => {
            if (!r.success) {
              const errorMsg = r.error instanceof Error ? r.error.message : 'Unknown error'
              resultContent += `- ${r.file.name}: ${errorMsg}\n`
            }
          })
        }

        if (successful.length > 0) {
          resultContent += `\n📁 Your files are now stored in the Bio section. [Go to Bio](action:view bio files)`
        }

        const resultMessage: Message = {
          role: 'assistant',
          content: resultContent
        }
        dispatch(addMessageToStore({ message: resultMessage, markAsRead: true }))

        // Navigate to Bio tab after successful upload
        if (successful.length > 0) {
          setTimeout(() => {
            dispatch(navigateToTab(TabKey.BIO))
          }, 1000)
        }
      } catch (error) {
        console.error('[InteractiveChat] Error during file upload:', error)
        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ **Upload failed:** ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }
        dispatch(addMessageToStore({ message: errorMessage, markAsRead: true }))
      }
    }

    // Trigger the file dialog
    input.click()
  }, [dispatch])

  /** Unified badge action handler — delegates to executeBadgeAction from action-dispatcher. */
  const handleBadgeExecute = useCallback(async (badgeAction: BadgeAction) => {
    await executeBadgeAction(badgeAction, {
      dispatch,
      isExpanded: true, // InteractiveChat is always expanded
      onSendMessage: async (message: string) => {
        await handleSend(message)
      },
      onFileUpload: handleFileUpload,
      onExpandChat: () => dispatch(setDisplayStateAction('expanded')),
      onFocusInput: () => sharedInputRef.current?.focus(),
    })
  }, [dispatch, handleSend, handleFileUpload])

  /** cv-builder specific: match action labels to TabKey navigation patterns. */
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Check if slash command menu should handle this key
    const slashHandled = slashCommands.handleKeyDown(e)
    if (slashHandled) {
      return // Slash command menu handled the key
    }

    // Normal enter key handling
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend, slashCommands])

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
        {messages.length === 0 && !streamingContent && !isLoading && (
          <div className="chat-empty-state">
            <p className="chat-empty-state__heading">Start Fresh</p>
            <p className="chat-empty-state__hint">
              Describe the role you're targeting, paste a job description, or type{' '}
              <kbd>/</kbd> to see available commands.
            </p>
          </div>
        )}
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
                  onExecute={handleBadgeExecute}
                  matchAction={matchAction}
                  onFileUpload={handleFileUpload}
                />
              )}
            </div>
          </Tile>
        ))}

        {streamingContent && (() => {
          const { cleaned, isMetadataStreaming } = cleanStreamingContent(streamingContent)
          return (
            <Tile className="message-tile assistant streaming">
              <div className="message-header">
                <strong>🤖 Assistant</strong>
                <span className="streaming-indicator">Typing...</span>
              </div>
              <div className="message-content">
                <MarkdownMessage
                  content={cleaned}
                  onExecute={handleBadgeExecute}
                  matchAction={matchAction}
                  onFileUpload={handleFileUpload}
                />
                {isMetadataStreaming && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <InlineLoading
                      description="Loading suggestions..."
                      status="active"
                      aria-live="polite"
                      aria-label="Loading action suggestions"
                    />
                  </div>
                )}
              </div>
            </Tile>
          )
        })()}

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
              ref={sharedInputRef}
              labelText="Message"
              placeholder="Type / for commands, or ask about resume generation, job analysis, learning paths..."
              value={draftInput}
              onChange={(e) => dispatch(setDraftInputAction(e.target.value))}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              rows={3}
              disabled={!isInitialized}
              data-element="chat-input"
              aria-controls={slashCommands.showMenu ? 'slash-command-menu' : undefined}
              aria-activedescendant={slashCommands.showMenu ? `command-option-${slashCommands.selectedIndex}` : undefined}
              aria-autocomplete="list"
              aria-expanded={slashCommands.showMenu}
            />
            <div className="input-actions">
              <IconButton
                label="Voice input"
                onClick={() => {
                  console.log('[InteractiveChat] Microphone button clicked - functionality to be implemented')
                  // TODO: Implement voice input functionality
                }}
                disabled={!isInitialized}
                className="microphone-button-input"
                kind="ghost"
                size="sm"
              >
                <Microphone size={20} />
              </IconButton>
              <Button
                renderIcon={SendAlt}
                onClick={() => handleSend()}
                disabled={!draftInput.trim() || isLoading || !isInitialized}
                className="send-button-inline"
                kind="primary"
                size="sm"
                hasIconOnly
                iconDescription="Send message"
                data-element="chat-send-button"
              />
            </div>
            {/* Slash command menu */}
            {slashCommands.showMenu && (
              <CommandMenu
                matches={slashCommands.matches}
                selectedIndex={slashCommands.selectedIndex}
                onSelect={slashCommands.selectCommand}
                onClose={slashCommands.closeMenu}
                position={slashCommands.menuPosition}
              />
            )}
          </div>
        </div>

        {/* Contextual suggestions removed - now shown inline in Next Steps */}
      </div>
    </div>
  )
}

export default InteractiveChat
