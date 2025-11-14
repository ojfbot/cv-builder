import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo } from 'react'

export interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number  // Optional tab number for navigation actions
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: QuickAction[]
}

interface ChatContextType {
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  currentTab: number
  setCurrentTab: (tab: number) => void
  requestTabChange: (tab: number, reason: string) => void
  draftInput: string
  setDraftInput: (input: string) => void
  chatSummary: string
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `# Welcome to CV Builder! 👋

[📄 Generate Resume](action:Generate my professional resume in markdown format)

[🔍 Analyze Job](action:Help me analyze a job listing and see how well I match)

[✨ Tailor Resume](action:Tailor my resume for a specific job posting)

[📚 Learning Path](action:Create a personalized learning path to help me close my skills gaps)

[✍️ Cover Letter](action:Write a compelling cover letter for a job application)

[💼 Interview Prep](action:Help me prepare for an upcoming interview with practice questions)`
    }
  ])
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentTab, setCurrentTabInternal] = useState(0)
  const [draftInput, setDraftInput] = useState('')
  const [chatSummary, setChatSummary] = useState('')
  const previousTabRef = useRef(0)

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: `# Welcome back! 👋\n\nHow can I help you today?`
    }])
  }, [])

  // Generate a 2-3 word summary from the chat history (memoized)
  const generateChatSummary = useCallback((): string => {
    // Look at the last few user messages to determine the topic
    const userMessages = messages
      .filter(m => m.role === 'user')
      .slice(-3) // Last 3 user messages

    if (userMessages.length === 0) {
      return '' // No chat history yet
    }

    // Get the most recent user message
    const lastUserMessage = userMessages[userMessages.length - 1].content.toLowerCase()

    // Keywords to identify common topics
    const topicKeywords = [
      { keywords: ['resume', 'cv'], summary: 'Resume help' },
      { keywords: ['job', 'position', 'apply'], summary: 'Job application' },
      { keywords: ['tailor', 'customize', 'adapt'], summary: 'Resume tailoring' },
      { keywords: ['skill', 'learn', 'gap', 'develop'], summary: 'Skills development' },
      { keywords: ['cover letter', 'letter'], summary: 'Cover letter' },
      { keywords: ['interview', 'prepare', 'practice'], summary: 'Interview prep' },
      { keywords: ['bio', 'profile', 'information'], summary: 'Bio update' },
      { keywords: ['analyze', 'match', 'score'], summary: 'Job analysis' },
    ]

    // Find matching topic
    for (const topic of topicKeywords) {
      if (topic.keywords.some(keyword => lastUserMessage.includes(keyword))) {
        return topic.summary
      }
    }

    // Fallback: extract first 2-3 words from the last message
    const words = userMessages[userMessages.length - 1].content.trim().split(/\s+/)
    return words.slice(0, 3).join(' ')
  }, [messages])

  const setCurrentTab = useCallback((newTab: number) => {
    const previousTab = previousTabRef.current

    console.log('[ChatContext] setCurrentTab called:', {
      previousTab,
      newTab,
      draftInput,
      messagesLength: messages.length
    })

    // If navigating FROM Interactive (0) TO another tab (1, 2, 3)
    // AND there's actual chat history (more than just the welcome message)
    // Generate a summary for the chat window header
    if (previousTab === 0 && newTab !== 0 && messages.length > 1) {
      const summary = generateChatSummary()
      console.log('[ChatContext] Generated summary for header:', summary)
      setChatSummary(summary)
    } else if (newTab === 0) {
      // Clear summary when going back to Interactive tab
      setChatSummary('')
    }

    // Update the ref for next time
    previousTabRef.current = newTab
    console.log('[ChatContext] Setting internal tab to:', newTab)
    setCurrentTabInternal(newTab)
  }, [draftInput, messages, generateChatSummary])

  const requestTabChange = useCallback((tab: number, _reason: string) => {
    // Direct navigation without confirmation
    setCurrentTab(tab)
  }, [setCurrentTab])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    messages,
    addMessage,
    clearMessages,
    isExpanded,
    setIsExpanded,
    currentTab: currentTab,
    setCurrentTab,
    requestTabChange,
    draftInput,
    setDraftInput,
    chatSummary,
  }), [
    messages,
    addMessage,
    clearMessages,
    isExpanded,
    setIsExpanded,
    currentTab,
    setCurrentTab,
    requestTabChange,
    draftInput,
    setDraftInput,
    chatSummary,
  ])

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
