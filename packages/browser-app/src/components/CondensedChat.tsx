import { useCallback } from 'react'
import { IconButton } from '@carbon/react'
import { Microphone } from '@carbon/icons-react'
import {
  ChatShell,
  ChatMessage,
  MetadataLoadingIndicator,
  MarkdownMessage,
  BadgeButton,
} from '@ojfbot/frame-ui-components'
import '@ojfbot/frame-ui-components/styles/chat-shell'
import '@ojfbot/frame-ui-components/styles/markdown-message'
import '@ojfbot/frame-ui-components/styles/badge-button'
import type { ChatDisplayState, BadgeAction } from '@ojfbot/frame-ui-components'
import { cleanStreamingContent, extractSuggestionsFromResponse, stripMetadata } from '@ojfbot/frame-ui-components'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  addMessage,
  setDraftInput as setDraftInputAction,
  setIsLoading,
  setStreamingContent,
  setDisplayState as setDisplayStateAction,
} from '../store/slices/chatSlice'
import { useAgent } from '../contexts/AgentContext'
import { executeBadgeAction } from '../utils/action-dispatcher'
import { TabKey } from '../models/navigation'
import { createBadgeAction, createNavigateAction } from '../models/badge-action'

function CondensedChat() {
  const dispatch = useAppDispatch()
  const messages = useAppSelector(state => state.chat.messages)
  const draftInput = useAppSelector(state => state.chat.draftInput)
  const chatSummary = useAppSelector(state => state.chat.chatSummary)
  const isLoading = useAppSelector(state => state.chat.isLoading)
  const streamingContent = useAppSelector(state => state.chat.streamingContent)
  const displayState = useAppSelector(state => state.chat.displayState)
  const isExpanded = displayState === 'expanded'
  const unreadCount = useAppSelector(state => state.chat.unreadCount)
  const sidebarExpanded = useAppSelector(state => state.v2.sidebarExpanded)
  const { orchestrator, isInitialized } = useAgent()

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || draftInput.trim()
    if (!textToSend || isLoading || !orchestrator || !isInitialized) return

    dispatch(addMessage({ role: 'user', content: textToSend }))
    dispatch(setDraftInputAction(''))
    dispatch(setIsLoading(true))
    dispatch(setStreamingContent(''))

    try {
      let fullResponse = ''

      const contextPrompt = isExpanded
        ? textToSend
        : `[CONDENSED MODE - Please keep your response brief and action-oriented. User is working in another tab.]\n\n${textToSend}`

      await orchestrator.processRequestStreaming(
        contextPrompt,
        (chunk: string) => {
          fullResponse += chunk
          if (isExpanded) {
            dispatch(setStreamingContent(fullResponse))
          }
        },
      )

      const suggestions = extractSuggestionsFromResponse(fullResponse)
      const cleanedContent = stripMetadata(fullResponse)

      dispatch(addMessage({
        role: 'assistant',
        content: cleanedContent,
        suggestions,
      }))
      dispatch(setStreamingContent(''))
    } catch (error) {
      dispatch(addMessage({
        role: 'assistant',
        content: `## Error\n\n${error instanceof Error ? error.message : 'An unknown error occurred'}`,
      }))
      dispatch(setStreamingContent(''))
    } finally {
      dispatch(setIsLoading(false))
    }
  }, [draftInput, isLoading, orchestrator, isInitialized, dispatch, isExpanded])

  const handleFileUpload = useCallback(async (accept?: string, multiple?: boolean) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    if (multiple) input.multiple = multiple

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      const fileNames = Array.from(files).map(f => f.name).join(', ')
      dispatch(addMessage({
        role: 'assistant',
        content: `**Files selected:** ${fileNames}\n\n_File processing will be implemented soon. For now, please manually add your resume information to your Bio._`,
      }))
    }

    input.click()
  }, [dispatch])

  const handleBadgeExecute = useCallback(async (badgeAction: BadgeAction) => {
    await executeBadgeAction(badgeAction, {
      dispatch,
      isExpanded,
      onSendMessage: async (message: string) => {
        await handleSend(message)
      },
      onFileUpload: handleFileUpload,
      onExpandChat: () => dispatch(setDisplayStateAction('expanded')),
      onFocusInput: () => {
        // Focus is handled by ChatShell internally
      },
    })
  }, [dispatch, handleSend, isExpanded, handleFileUpload])

  /** cv-builder specific: match action labels to TabKey navigation patterns. */
  const matchAction = useCallback((label: string, suggestions: BadgeAction[]): BadgeAction | null => {
    // Try exact/partial match against suggestions first
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

    // Infer navigation from common label patterns
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

  // Render streaming content as a ChatMessage
  const renderStreamingContent = streamingContent ? (() => {
    const { cleaned, isMetadataStreaming } = cleanStreamingContent(streamingContent)
    return (
      <ChatMessage
        role="assistant"
        isStreaming
        streamingLabel="Typing..."
        footer={isMetadataStreaming ? <MetadataLoadingIndicator /> : undefined}
      >
        <MarkdownMessage
          content={cleaned}
          onExecute={handleBadgeExecute}
          matchAction={matchAction}
          onFileUpload={handleFileUpload}
          compact
        />
      </ChatMessage>
    )
  })() : undefined

  return (
    <ChatShell
      displayState={displayState as ChatDisplayState}
      onDisplayStateChange={(state) => dispatch(setDisplayStateAction(state))}
      sidebarExpanded={sidebarExpanded}
      title="AI Assistant"
      chatSummary={chatSummary}
      isLoading={isLoading}
      unreadCount={unreadCount}
      draftInput={draftInput}
      onDraftChange={(value) => dispatch(setDraftInputAction(value))}
      onSend={handleSend}
      onInputFocus={() => {
        if (!isExpanded) dispatch(setDisplayStateAction('expanded'))
      }}
      placeholder="Ask me anything..."
      inputDisabled={!isInitialized}
      streamingContent={renderStreamingContent}
      inputExtra={
        <IconButton
          label="Voice input"
          onClick={() => {/* TODO: voice input */}}
          disabled={!isInitialized}
          kind="ghost"
          size="sm"
        >
          <Microphone size={20} />
        </IconButton>
      }
    >
      {messages.map((msg, idx) => (
        <ChatMessage key={idx} role={msg.role} isStreaming={false}>
          {msg.role === 'user' ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
          ) : (
            <MarkdownMessage
              content={msg.content}
              suggestions={msg.suggestions}
              onExecute={handleBadgeExecute}
              matchAction={matchAction}
              onFileUpload={handleFileUpload}
              compact
            />
          )}
        </ChatMessage>
      ))}
    </ChatShell>
  )
}

export default CondensedChat
