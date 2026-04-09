import { useState, useRef, useEffect, useCallback } from 'react'
import { InlineNotification } from '@carbon/react'
import { useAgent } from '../contexts/AgentContext'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  addMessage as addMessageToStore,
  setDraftInput as setDraftInputAction,
  markMessagesAsRead,
} from '../store/slices/chatSlice'
import { TabKey } from '../models/navigation'
import { extractSuggestionsFromResponse } from '@ojfbot/frame-ui-components'
import { sendChatMessage, isV2Active } from '../services/chat-service'
import { useSlashCommands } from '../hooks/useSlashCommands'
import { useFileUpload } from './interactive-chat/useFileUpload'
import { useBadgeActions } from './interactive-chat/useBadgeActions'
import { ChatMessageList } from './interactive-chat/ChatMessageList'
import { ChatInputArea } from './interactive-chat/ChatInputArea'
import './InteractiveChat.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function InteractiveChat() {
  const dispatch = useAppDispatch()
  const { orchestrator, isInitialized } = useAgent()
  const currentTab = useAppSelector(state => state.navigation.currentTab)
  const draftInput = useAppSelector(state => state.chat.draftInput)
  const messages = useAppSelector(state => state.chat.messages)
  const isLoading = useAppSelector(state => state.chat.isLoading)
  const streamingContent = useAppSelector(state => state.chat.streamingContent)
  const [, setContextualSuggestions] = useState<import('../models/badge-action').BadgeAction[]>([])
  const [, setShowContextualSuggestions] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const sharedInputRef = useRef<HTMLTextAreaElement>(null)

  const handleFileUpload = useFileUpload()

  // Auto-scroll
  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current
          if (smooth) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
          } else {
            container.scrollTop = container.scrollHeight
          }
        }
      })
    })
  }, [])

  useEffect(() => { if (messages.length > 0) scrollToBottom() }, [messages, scrollToBottom])
  useEffect(() => { if (streamingContent) scrollToBottom() }, [streamingContent, scrollToBottom])
  useEffect(() => {
    if (currentTab === TabKey.INTERACTIVE && messages.length > 0) {
      dispatch(markMessagesAsRead())
      setTimeout(() => scrollToBottom(true), 100)
    }
  }, [currentTab, dispatch])

  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.suggestions) {
        setContextualSuggestions(lastMessage.suggestions)
      }
    }
  }, [messages])

  // Slash commands
  const slashCommands = useSlashCommands({
    input: draftInput,
    onCommandExecuted: (commandString: string) => {
      dispatch(setDraftInputAction(commandString + ' '))
      setTimeout(() => sharedInputRef.current?.focus(), 0)
    },
    context: {
      sendMessage: async () => { console.warn('Deprecated sendMessage called') },
      clearChat: () => { console.log('Clear chat requested') }
    }
  })
  slashCommands.inputRef.current = sharedInputRef.current

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || draftInput.trim()
    if (!textToSend || isLoading) return

    if (textToSend.startsWith('/')) {
      const result = await slashCommands.executeCommand(textToSend)
      if (result.error) {
        dispatch(addMessageToStore({ message: { role: 'assistant', content: `**Command Error:** ${result.error}` } as Message, markAsRead: true }))
        dispatch(setDraftInputAction(''))
        return
      }
      if (result.success) {
        dispatch(setDraftInputAction(''))
        if (result.message) await handleSend(result.message)
        return
      }
    }

    const useV2 = isV2Active()
    if (!useV2 && (!isInitialized || !orchestrator)) {
      dispatch(addMessageToStore({ message: { role: 'assistant', content: '**Agent service not initialized**\n\nPlease configure your API key first.' } as Message, markAsRead: true }))
      return
    }

    setShowContextualSuggestions(false)
    dispatch(setDraftInputAction(''))

    const tabNames: Record<TabKey, string> = {
      [TabKey.INTERACTIVE]: 'Interactive', [TabKey.BIO]: 'Bio', [TabKey.JOBS]: 'Jobs',
      [TabKey.OUTPUTS]: 'Outputs', [TabKey.RESEARCH]: 'Research',
      [TabKey.PIPELINES]: 'Pipelines', [TabKey.TOOLBOX]: 'Toolbox',
    }
    const messageWithContext = `[SYSTEM: User is currently on the "${tabNames[currentTab] || 'Interactive'}" tab (${currentTab})]\n\n${textToSend}`

    try {
      await sendChatMessage(messageWithContext, {
        onComplete: () => {
          const suggestions = extractSuggestionsFromResponse(streamingContent)
          setContextualSuggestions(suggestions)
          dispatch(markMessagesAsRead())
          setTimeout(() => setShowContextualSuggestions(true), 300)
        },
        onError: (error) => console.error('[InteractiveChat] Chat error:', error),
      })
    } catch (error) {
      console.error('[InteractiveChat] Unexpected error:', error)
    }
  }, [currentTab, draftInput, isLoading, isInitialized, orchestrator, dispatch, streamingContent, slashCommands])

  const { handleBadgeExecute, matchAction } = useBadgeActions({
    onSendMessage: handleSend,
    onFileUpload: handleFileUpload,
    onFocusInput: () => sharedInputRef.current?.focus(),
  })

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (slashCommands.handleKeyDown(e)) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend, slashCommands])

  return (
    <div className="interactive-chat">
      {!isInitialized && (
        <InlineNotification kind="warning" title="API Key Required"
          subtitle="Please configure your Anthropic API key using the Settings icon in the header."
          lowContrast hideCloseButton style={{ marginBottom: '1rem' }} />
      )}

      <ChatMessageList
        ref={messagesContainerRef}
        messages={messages}
        streamingContent={streamingContent}
        isLoading={isLoading}
        onBadgeExecute={handleBadgeExecute}
        matchAction={matchAction}
        onFileUpload={handleFileUpload}
      />

      <ChatInputArea
        ref={sharedInputRef}
        draftInput={draftInput}
        onInputChange={(v) => dispatch(setDraftInputAction(v))}
        onSend={() => handleSend()}
        onKeyDown={handleKeyDown}
        isInitialized={isInitialized}
        isLoading={isLoading}
        slashCommands={slashCommands}
      />
    </div>
  )
}

export default InteractiveChat
