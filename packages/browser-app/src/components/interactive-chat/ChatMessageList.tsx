import { forwardRef } from 'react'
import { Tile, InlineLoading } from '@carbon/react'
import type { BadgeAction } from '@ojfbot/frame-ui-components'
import { MarkdownMessage, cleanStreamingContent } from '@ojfbot/frame-ui-components'
import '@ojfbot/frame-ui-components/styles/markdown-message'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: BadgeAction[]
}

interface ChatMessageListProps {
  messages: Message[]
  streamingContent: string | null
  isLoading: boolean
  onBadgeExecute: (action: BadgeAction) => void
  matchAction: (label: string, suggestions: BadgeAction[]) => BadgeAction | null
  onFileUpload: (accept?: string, multiple?: boolean) => Promise<void>
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  function ChatMessageList({ messages, streamingContent, isLoading, onBadgeExecute, matchAction, onFileUpload }, ref) {
    return (
      <div className="chat-messages" ref={ref}>
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
          <Tile key={idx} className={`message-tile ${msg.role}`}>
            <div className="message-header">
              <strong>{msg.role === 'user' ? 'You' : 'Assistant'}</strong>
            </div>
            <div className="message-content">
              {msg.role === 'user' ? (
                <div className="user-message">{msg.content}</div>
              ) : (
                <MarkdownMessage
                  content={msg.content}
                  suggestions={msg.suggestions}
                  onExecute={onBadgeExecute}
                  matchAction={matchAction}
                  onFileUpload={onFileUpload}
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
                <strong>Assistant</strong>
                <span className="streaming-indicator">Typing...</span>
              </div>
              <div className="message-content">
                <MarkdownMessage
                  content={cleaned}
                  onExecute={onBadgeExecute}
                  matchAction={matchAction}
                  onFileUpload={onFileUpload}
                />
                {isMetadataStreaming && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <InlineLoading description="Loading suggestions..." status="active"
                      aria-live="polite" aria-label="Loading action suggestions" />
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
    )
  }
)
